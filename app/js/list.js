/* List view: add items, tick them off, sort. */

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

const listEl = document.getElementById('list');
const formEl = document.getElementById('add-form');
const textEl = document.getElementById('item-text');
const tagEl = document.getElementById('item-tag');
const priorityEl = document.getElementById('item-priority');
const tagOptionsEl = document.getElementById('tag-options');
const sortEl = document.getElementById('sort');
const titleEl = document.getElementById('title');
const progressEl = document.getElementById('progress');

let list = loadList() || newList();

sortEl.value = loadSort();

/* Sorting: completed items always sit at the bottom, then the chosen order. */
function sortItems(items, sort) {
  const compare = {
    priority: (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      new Date(a.createdAt) - new Date(b.createdAt),
    tag: (a, b) => {
      const ta = (a.tag || '').toLowerCase();
      const tb = (b.tag || '').toLowerCase();
      if (ta !== tb) {
        if (!ta) return 1;   // untagged last
        if (!tb) return -1;
        return ta < tb ? -1 : 1;
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    },
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

  const meta = document.createElement('div');
  meta.className = 'meta';
  if (item.tag) meta.appendChild(pill(item.tag, 'tag'));
  meta.appendChild(pill(PRIORITY_LABEL[item.priority], item.priority));
  const stamp = document.createElement('span');
  stamp.textContent = formatStamp(item.createdAt);
  meta.appendChild(stamp);

  body.appendChild(label);
  body.appendChild(meta);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove';
  remove.textContent = '×';
  remove.title = 'Remove item';
  remove.setAttribute('aria-label', 'Remove ' + item.text);
  remove.addEventListener('click', () => removeItem(item.id));

  row.appendChild(box);
  row.appendChild(body);
  row.appendChild(remove);
  return row;
}

function renderTagOptions() {
  const tags = [...new Set(list.items.map(i => i.tag).filter(Boolean))].sort();
  tagOptionsEl.replaceChildren(...tags.map(t => {
    const opt = document.createElement('option');
    opt.value = t;
    return opt;
  }));
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

  renderTagOptions();
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

formEl.addEventListener('submit', e => {
  e.preventDefault();
  const text = textEl.value.trim();
  if (!text) return;
  addItem(text, tagEl.value.trim(), priorityEl.value);
  textEl.value = '';
  tagEl.value = '';
  priorityEl.value = 'medium';
  textEl.focus();
});

sortEl.addEventListener('change', () => {
  saveSort(sortEl.value);
  render();
});

render();
