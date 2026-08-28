/* Shopping list: text, tag and an expected price per item. No dates, no
   session marks — you add things, tick them off, then start again. */

const CURRENCY = '£';                       /* change this for another currency */
const TAGS_URL = '../data/shopping-tags.json';   /* edit that file for the tags */

const listEl = document.getElementById('list');
const totalEl = document.getElementById('total');
const formEl = document.getElementById('add-form');
const toggleEl = document.getElementById('add-toggle');
const cancelEl = document.getElementById('add-cancel');
const submitEl = document.getElementById('add-submit');
const textEl = document.getElementById('item-text');
const tagEl = document.getElementById('item-tag');
const priceEl = document.getElementById('item-price');

let list = loadShopping() || newShopping();
let tags = [];
let editingId = null;

function money(amount) {
  return CURRENCY + amount.toFixed(2);
}

/* Prices are summed in pence, so 0.1 + 0.2 can't drift. */
function listTotal(items) {
  return items.reduce((sum, i) => sum + Math.round(i.price * 100), 0) / 100;
}

const hasPrice = item => typeof item.price === 'number' && !isNaN(item.price);

/* Ticked items drop to the bottom, otherwise the order things were added. */
function ordered(items) {
  return items.slice().sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
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

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = item.done;
  box.setAttribute('aria-label', item.text);
  box.addEventListener('change', () => toggleItem(item.id, box.checked));

  const body = document.createElement('div');

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = item.text;

  /* Second line: tag then price, on a fixed grid so they line up between
     items. The tag cell stays in place when empty. */
  const meta = document.createElement('div');
  meta.className = 'meta shop';

  const tagCell = document.createElement('span');
  if (item.tag) tagCell.appendChild(pill(item.tag, 'tag'));

  const priceCell = document.createElement('span');
  priceCell.className = 'price';
  priceCell.textContent = hasPrice(item) ? money(item.price) : '';

  meta.append(tagCell, priceCell);
  body.append(label, meta);

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

/* The total only means anything once every item has a price. */
function renderTotal() {
  totalEl.hidden = list.items.length === 0;
  if (totalEl.hidden) return;

  const label = document.createElement('span');
  const value = document.createElement('span');

  if (list.items.every(hasPrice)) {
    label.textContent = 'Total';
    value.textContent = money(listTotal(list.items));
  } else {
    label.className = 'hint';
    label.textContent = 'Total shows once every item has a price';
    const priced = list.items.filter(hasPrice).length;
    value.className = 'hint';
    value.textContent = priced + ' of ' + list.items.length + ' priced';
  }
  totalEl.replaceChildren(label, value);
}

function render() {
  renderTotal();

  const allDone = list.items.length > 0 && list.items.every(i => i.done);

  if (list.items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nothing on the list yet. Add your first item above.';
    listEl.replaceChildren(empty);
    return;
  }

  if (allDone) {
    /* Everything is in the trolley — the list gives way to the checkout. */
    const panel = document.createElement('div');
    panel.className = 'checkout';

    const message = document.createElement('p');
    message.className = 'checkout-message';
    message.textContent = 'Now go to the checkout';

    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'primary';
    again.textContent = 'Start again';
    again.addEventListener('click', startAgain);

    panel.append(message, again);
    listEl.replaceChildren(panel);
    return;
  }

  listEl.replaceChildren(...ordered(list.items).map(renderItem));
}

/* One form, used for adding and for editing an existing item. */
function openForm(item) {
  editingId = item ? item.id : null;
  formEl.reset();
  textEl.value = item ? item.text : '';
  setTagValue(item ? item.tag : '');
  priceEl.value = item && hasPrice(item) ? item.price.toFixed(2) : '';
  submitEl.textContent = item ? 'Save changes' : 'Add item';
  formEl.hidden = false;
  toggleEl.hidden = true;
  render();
  textEl.focus();
  textEl.select();
}

function closeForm() {
  editingId = null;
  formEl.reset();
  submitEl.textContent = 'Add item';
  formEl.hidden = true;
  toggleEl.hidden = false;
  render();
}

/* Keep a tag that has since been dropped from the JSON file, so editing an
   older item doesn't silently strip it. */
function setTagValue(tag) {
  const known = [...tagEl.options].some(o => o.value === tag);
  if (tag && !known) tagEl.append(new Option(tag, tag));
  tagEl.value = tag || '';
}

/* Blank stays blank — a price is optional until you want the total. */
function readPrice() {
  const raw = priceEl.value.trim();
  if (raw === '') return null;
  const value = Number(raw);
  return isNaN(value) || value < 0 ? null : value;
}

function addItem(text, tag, price) {
  list.items.push({
    id: String(Date.now()) + Math.random().toString(16).slice(2, 8),
    text: text,
    tag: tag,
    price: price,
    done: false,
  });
  saveShopping(list);
  render();
}

function updateItem(id, text, tag, price) {
  const item = list.items.find(i => i.id === id);
  if (!item) return;
  item.text = text;
  item.tag = tag;
  item.price = price;
  saveShopping(list);
  render();
}

function toggleItem(id, done) {
  const item = list.items.find(i => i.id === id);
  if (!item) return;
  item.done = done;
  saveShopping(list);
  render();
}

function removeItem(id) {
  list.items = list.items.filter(i => i.id !== id);
  saveShopping(list);
  if (id === editingId) closeForm(); else render();
}

function startAgain() {
  list = newShopping();
  if (!formEl.hidden) closeForm(); else render();
}

toggleEl.addEventListener('click', () => openForm());
cancelEl.addEventListener('click', closeForm);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !formEl.hidden) closeForm();
});

formEl.addEventListener('submit', e => {
  e.preventDefault();
  const text = textEl.value.trim();
  if (!text) return;

  if (editingId) {
    updateItem(editingId, text, tagEl.value, readPrice());
    closeForm();
    return;
  }

  addItem(text, tagEl.value, readPrice());
  /* Stay open so a whole shop can be typed in one go. */
  formEl.reset();
  textEl.focus();
});

fetch(TAGS_URL)
  .then(r => r.json())
  .then(loaded => {
    tags = loaded;
    tagEl.append(...tags.map(t => new Option(t, t)));
  })
  .catch(err => console.warn('Could not load ' + TAGS_URL, err));

render();
