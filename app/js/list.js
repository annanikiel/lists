/* List view: add items, tick them off, sort. */

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

/* Tag options live in app/data/tags.json — edit that file to change them. */
const TAGS_URL = '../data/tags.json';

const listEl = document.getElementById('list');
const formEl = document.getElementById('add-form');
const toggleEl = document.getElementById('add-toggle');
const cancelEl = document.getElementById('add-cancel');
const submitEl = document.getElementById('add-submit');
const clearDoneEl = document.getElementById('clear-done');
const textEl = document.getElementById('item-text');
const tagEl = document.getElementById('item-tag');
const priorityEl = document.getElementById('item-priority');
const sortEl = document.getElementById('sort');
const progressEl = document.getElementById('progress');

let list = loadList() || newList();
let tags = [];
let editingId = null;   /* id of the item the form is editing, null when adding */

sortEl.value = loadSort();

/* Sorting: completed items always sit at the bottom, then the chosen order.
   Tags sort in the order they are listed in tags.json, untagged last. */
function tagRank(tag) {
  if (!tag) return Number.MAX_SAFE_INTEGER;
  const i = tags.indexOf(tag);
  return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i;
}

function sortItems(items, sort) {
  const compare = {
    manual: () => 0,
    priority: (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      new Date(a.createdAt) - new Date(b.createdAt),
    tag: (a, b) =>
      tagRank(a.tag) - tagRank(b.tag) ||
      (a.tag || '').localeCompare(b.tag || '') ||
      new Date(a.createdAt) - new Date(b.createdAt),
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  }[sort];

  return items.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return compare(a, b);
  });
}

function pill(text, className) {
  const el = document.createElement('span');
  el.className = 'pill ' + className;
  el.textContent = text;
  return el;
}

function renderItem(item) {
  const row = document.createElement('div');
  row.className = 'item' + (item.done ? ' done' : '') +
    (item.id === editingId ? ' editing' : '');
  row.dataset.id = item.id;

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = item.done;
  box.setAttribute('aria-label', item.text);
  box.addEventListener('change', () => toggleItem(item.id, box.checked));

  const body = document.createElement('div');

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = item.text;

  /* Session marks: one dot per work session, tally-style, after the title.
     The + logs a session; tapping a dot removes that one. */
  const sessions = document.createElement('span');
  sessions.className = 'sessions';
  (item.sessions || []).forEach((stamp, at) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.title = 'Session at ' + formatStamp(stamp) + ' — tap to remove';
    dot.setAttribute('aria-label', 'Remove session at ' + formatStamp(stamp));
    dot.addEventListener('click', () => removeSession(item.id, at));
    sessions.appendChild(dot);
  });

  const addSessionBtn = document.createElement('button');
  addSessionBtn.type = 'button';
  addSessionBtn.className = 'session-add';
  addSessionBtn.textContent = '+';
  addSessionBtn.title = 'Log a session';
  addSessionBtn.setAttribute('aria-label', 'Log a session for ' + item.text);
  addSessionBtn.addEventListener('click', () => addSession(item.id));
  sessions.appendChild(addSessionBtn);

  /* Second line: date & time, tag, priority — one grid cell each, so the
     columns line up between items. The tag cell stays in place when empty. */
  const meta = document.createElement('div');
  meta.className = 'meta';

  const when = document.createElement('span');
  when.className = 'when';
  when.textContent = formatStamp(item.createdAt);

  const tagCell = document.createElement('span');
  if (item.tag) tagCell.appendChild(pill(item.tag, 'tag'));

  const priorityCell = document.createElement('span');
  priorityCell.appendChild(pill(PRIORITY_LABEL[item.priority], item.priority));

  meta.append(when, tagCell, priorityCell);

  /* Completed items also carry when they were ticked off, on its own row
     beneath. Items ticked before this was added simply don't have one. */
  if (item.done && item.completedAt) {
    const doneAt = document.createElement('span');
    doneAt.className = 'done-at';
    doneAt.textContent = 'Done ' + formatStamp(item.completedAt);
    meta.appendChild(doneAt);
  }

  body.append(label, sessions, meta);

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'row-btn';
  edit.textContent = '✎';
  edit.title = 'Edit item';
  edit.setAttribute('aria-label', 'Edit ' + item.text);
  edit.addEventListener('click', () => openForm(item));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'row-btn remove';
  remove.textContent = '×';
  remove.title = 'Remove item';
  remove.setAttribute('aria-label', 'Remove ' + item.text);
  remove.addEventListener('click', () => removeItem(item.id));

  const actions = document.createElement('div');
  actions.className = 'row-actions';
  actions.append(edit, remove);

  row.append(box, body, actions);
  return row;
}

function render() {
  const done = list.items.filter(i => i.done).length;
  progressEl.textContent = list.items.length
    ? done + ' of ' + list.items.length + ' done'
    : '';

  clearDoneEl.hidden = done === 0;
  clearDoneEl.textContent = 'Clear completed (' + done + ')';

  if (list.items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nothing on the list yet. Add your first item above.';
    listEl.replaceChildren(empty);
  } else {
    listEl.replaceChildren(...sortItems(list.items, sortEl.value).map(renderItem));
  }
}

/* The one form does double duty: adding a new item, or editing an existing
   one when `item` is passed in. */
function openForm(item) {
  editingId = item ? item.id : null;
  formEl.reset();
  textEl.value = item ? item.text : '';
  setTagValue(item ? item.tag : '');
  priorityEl.value = item ? item.priority : 'medium';
  submitEl.textContent = item ? 'Save changes' : 'Add item';
  formEl.hidden = false;
  toggleEl.hidden = true;
  render();          /* marks the row being edited */
  textEl.focus();
  textEl.select();
}

function closeForm() {
  editingId = null;
  formEl.reset();
  priorityEl.value = 'medium';
  submitEl.textContent = 'Add item';
  formEl.hidden = true;
  toggleEl.hidden = false;
  render();
}

/* Select a tag, keeping tags that have since been dropped from tags.json so
   editing an old item doesn't silently strip its tag. */
function setTagValue(tag) {
  const known = [...tagEl.options].some(o => o.value === tag);
  if (tag && !known) tagEl.append(new Option(tag, tag));
  tagEl.value = tag || '';
}

function addItem(text, tag, priority) {
  list.items.push({
    id: String(Date.now()) + Math.random().toString(16).slice(2, 8),
    text: text,
    tag: tag,
    priority: priority,
    createdAt: new Date().toISOString(),
    done: false,
    sessions: [],
  });
  saveList(list);
  render();
}

function updateItem(id, text, tag, priority) {
  const item = list.items.find(i => i.id === id);
  if (!item) return;
  item.text = text;
  item.tag = tag;
  item.priority = priority;
  /* createdAt stays put — the second line records when the item was added. */
  saveList(list);
  render();
}

function addSession(id) {
  const item = list.items.find(i => i.id === id);
  if (!item) return;
  item.sessions = (item.sessions || []).concat(new Date().toISOString());
  saveList(list);
  render();
}

function removeSession(id, at) {
  const item = list.items.find(i => i.id === id);
  if (!item || !item.sessions || at >= item.sessions.length) return;
  item.sessions.splice(at, 1);
  saveList(list);
  render();
}

function toggleItem(id, done) {
  const item = list.items.find(i => i.id === id);
  if (!item) return;
  item.done = done;
  /* Unticking drops the completion time rather than leaving a stale one. */
  if (done) item.completedAt = new Date().toISOString();
  else delete item.completedAt;
  saveList(list);
  render();
}

function removeItem(id) {
  list.items = list.items.filter(i => i.id !== id);
  saveList(list);
  if (id === editingId) closeForm(); else render();
}

/* Drop the completed items but keep the list going. */
function clearCompleted() {
  const done = list.items.filter(i => i.done);
  if (done.length === 0) return;
  const ok = confirm('Remove ' + done.length + ' completed item' +
    (done.length === 1 ? '' : 's') + ' from the list?');
  if (!ok) return;
  const editingCleared = done.some(i => i.id === editingId);
  list.items = list.items.filter(i => !i.done);
  saveList(list);
  if (editingCleared) closeForm(); else render();
}

toggleEl.addEventListener('click', () => openForm());
cancelEl.addEventListener('click', closeForm);
clearDoneEl.addEventListener('click', clearCompleted);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !formEl.hidden) closeForm();
});

formEl.addEventListener('submit', e => {
  e.preventDefault();
  const text = textEl.value.trim();
  if (!text) return;

  if (editingId) {
    updateItem(editingId, text, tagEl.value, priorityEl.value);
    closeForm();
    return;
  }

  addItem(text, tagEl.value, priorityEl.value);
  /* Stay open so several items can be added in one go. */
  formEl.reset();
  priorityEl.value = 'medium';
  textEl.focus();
});

sortEl.addEventListener('change', () => {
  saveSort(sortEl.value);
  render();
});

/* Load the tag options, then fill the dropdown. If the file can't be read the
   dropdown is left with just "No tag" rather than blocking the list. */
fetch(TAGS_URL)
  .then(r => r.json())
  .then(loaded => {
    tags = loaded;
    tagEl.append(...tags.map(t => new Option(t, t)));
    render();
  })
  .catch(err => console.warn('Could not load ' + TAGS_URL, err));

render();

/* ---------------------------------------------------------------------------
   Manual ordering.

   Rows are dragged with pointer events rather than HTML5 drag-and-drop, which
   iOS does not support. A mouse starts dragging after a few pixels of
   movement; a finger starts after a short press, so that swiping still scrolls
   the page. The dragged row is moved through the DOM as it passes its
   neighbours, and the resulting order is written back to list.items on drop.
--------------------------------------------------------------------------- */

const PRESS_MS = 350;      /* press this long on touch before a drag starts */
const MOUSE_SLOP = 5;      /* mouse movement that counts as a drag, in px */
const TOUCH_SLOP = 10;     /* finger movement before the press becomes a scroll */

let drag = null;

function startDrag() {
  if (!drag || drag.active) return;
  clearTimeout(drag.timer);
  drag.active = true;
  drag.row.classList.add('dragging');
  document.body.classList.add('dragging');
}

function endDrag() {
  if (!drag) return;
  clearTimeout(drag.timer);
  const wasActive = drag.active;
  drag.row.classList.remove('dragging');
  document.body.classList.remove('dragging');
  drag = null;

  if (!wasActive) return;

  /* The rows are now in the order the user wants — save it. */
  const order = [...listEl.querySelectorAll('.item')].map(r => r.dataset.id);
  list.items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  saveList(list);
  if (sortEl.value !== 'manual') {
    sortEl.value = 'manual';
    saveSort('manual');
  }
  render();
}

/* Move the dragged row past any neighbour whose midpoint the pointer has
   crossed. Completed items stay in the completed group and vice versa. */
function dragTo(y) {
  const done = drag.row.classList.contains('done');
  const others = [...listEl.querySelectorAll('.item')]
    .filter(r => r !== drag.row && r.classList.contains('done') === done);

  for (const other of others) {
    const box = other.getBoundingClientRect();
    const middle = box.top + box.height / 2;
    const rowIsAfter = other.compareDocumentPosition(drag.row) &
      Node.DOCUMENT_POSITION_FOLLOWING;

    if (y < middle && rowIsAfter) return listEl.insertBefore(drag.row, other);
    if (y > middle && !rowIsAfter) return listEl.insertBefore(drag.row, other.nextSibling);
  }
}

listEl.addEventListener('pointerdown', e => {
  if (e.button > 0) return;                                  /* left/primary only */
  const row = e.target.closest('.item');
  if (!row) return;
  if (e.target.closest('button, input, select, a')) return;  /* let controls work */

  drag = {
    row: row,
    pointerId: e.pointerId,
    startY: e.clientY,
    touch: e.pointerType !== 'mouse',
    active: false,
    timer: null,
  };
  if (drag.touch) drag.timer = setTimeout(startDrag, PRESS_MS);
});

window.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pointerId) return;

  if (!drag.active) {
    const moved = Math.abs(e.clientY - drag.startY);
    /* Moving before the press completes means the user is scrolling. */
    if (drag.touch) { if (moved > TOUCH_SLOP) endDrag(); }
    else if (moved > MOUSE_SLOP) startDrag();
    return;
  }
  dragTo(e.clientY);
});

window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

/* Stop the page scrolling under a finger that is dragging a row. */
window.addEventListener('touchmove', e => {
  if (drag && drag.active) e.preventDefault();
}, { passive: false });

/* And stop the press turning into a text selection or context menu. */
listEl.addEventListener('contextmenu', e => {
  if (drag && drag.active) e.preventDefault();
});
