/* List view: add items, tick them off, sort. */

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

/* Tag options live in app/data/tags.json — edit that file to change them. */
const TAGS_URL = '../data/tags.json';

const listEl = document.getElementById('list');
const formEl = document.getElementById('add-form');
const toggleEl = document.getElementById('add-toggle');
const cancelEl = document.getElementById('add-cancel');
const textEl = document.getElementById('item-text');
const tagEl = document.getElementById('item-tag');
const priorityEl = document.getElementById('item-priority');
const sortEl = document.getElementById('sort');
const titleEl = document.getElementById('title');
const progressEl = document.getElementById('progress');

let list = loadList() || newList();
let tags = [];

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
  row.className = 'item' + (item.done ? ' done' : '');

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = item.done;
  box.setAttribute('aria-label', item.text);
  box.addEventListener('change', () => toggleItem(item.id, box.checked));

  const body = document.createElement('div');

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = item.text;

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
  body.append(label, meta);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove';
  remove.textContent = '×';
  remove.title = 'Remove item';
  remove.setAttribute('aria-label', 'Remove ' + item.text);
  remove.addEventListener('click', () => removeItem(item.id));

  row.append(box, body, remove);
  return row;
}

function render() {
  titleEl.textContent = formatDay(list.createdAt);

  const done = list.items.filter(i => i.done).length;
  progressEl.textContent = list.items.length
    ? done + ' of ' + list.items.length + ' done'
    : '';

  if (list.items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nothing on the list yet. Add your first item above.';
    listEl.replaceChildren(empty);
  } else {
    listEl.replaceChildren(...sortItems(list.items, sortEl.value).map(renderItem));
  }
}

/* Add form */
function openForm() {
  formEl.hidden = false;
  toggleEl.hidden = true;
  textEl.focus();
}

function closeForm() {
  formEl.reset();
  priorityEl.value = 'medium';
  formEl.hidden = true;
  toggleEl.hidden = false;
}

function addItem(text, tag, priority) {
  list.items.push({
    id: String(Date.now()) + Math.random().toString(16).slice(2, 8),
    text: text,
    tag: tag,
    priority: priority,
    createdAt: new Date().toISOString(),
    done: false,
  });
  saveList(list);
  render();
}

function toggleItem(id, done) {
  const item = list.items.find(i => i.id === id);
  if (!item) return;
  item.done = done;
  saveList(list);
  render();
}

function removeItem(id) {
  list.items = list.items.filter(i => i.id !== id);
  saveList(list);
  render();
}

toggleEl.addEventListener('click', openForm);
cancelEl.addEventListener('click', closeForm);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !formEl.hidden) closeForm();
});

formEl.addEventListener('submit', e => {
  e.preventDefault();
  const text = textEl.value.trim();
  if (!text) return;
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
