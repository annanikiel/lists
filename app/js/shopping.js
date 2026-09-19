/* Shopping list: text, tag and an expected price per item. No dates, no
   session marks — you add things, tick them off, then start again. */

const CURRENCY = '£';                       /* change this for another currency */
const NO_SHOP = 'No shop';                  /* the filter entry for untagged shops */
const TAGS_URL = '../data/shopping-tags.json';   /* edit that file for the tags */
const SHOPS_URL = '../data/shops.json';          /* and that one for the shops */

const listEl = document.getElementById('list');
const totalEl = document.getElementById('total');
const formEl = document.getElementById('add-form');
const toggleEl = document.getElementById('add-toggle');
const cancelEl = document.getElementById('add-cancel');
const submitEl = document.getElementById('add-submit');
const textEl = document.getElementById('item-text');
const tagEl = document.getElementById('item-tag');
const priceEl = document.getElementById('item-price');
const sortEl = document.getElementById('sort');
const shopEl = document.getElementById('item-shop');
const filterEl = document.getElementById('shop-filter');
const filterNoteEl = document.getElementById('filter-note');

let list = loadShopping() || newShopping();
let tags = [];
let shops = [];
let editingId = null;

sortEl.value = loadShopSort();

function money(amount) {
  return CURRENCY + amount.toFixed(2);
}

/* Prices are summed in pence, so 0.1 + 0.2 can't drift. */
function listTotal(items) {
  return items.reduce((sum, i) => sum + Math.round(i.price * 100), 0) / 100;
}

const hasPrice = item => typeof item.price === 'number' && !isNaN(item.price);

/* The list can be narrowed to one shop, so a trip round Tesco doesn't show
   the things that come from the butcher. '' means every shop. */
function visibleItems() {
  const shop = filterEl.value;
  if (!shop) return list.items;
  if (shop === NO_SHOP) return list.items.filter(i => !i.shop);
  return list.items.filter(i => i.shop === shop);
}

/* Only offer the shops actually on the list, in shops.json order. */
function renderFilterOptions() {
  const used = new Set(list.items.map(i => i.shop || NO_SHOP));
  const options = shops.filter(sh => used.has(sh));
  if (used.has(NO_SHOP)) options.push(NO_SHOP);
  /* A shop dropped from shops.json but still on an item stays selectable. */
  for (const sh of used) {
    if (sh !== NO_SHOP && !options.includes(sh)) options.push(sh);
  }

  const wanted = filterEl.value;
  filterEl.replaceChildren(new Option('All shops', ''), ...options.map(o => new Option(o, o)));
  filterEl.value = options.includes(wanted) ? wanted : '';
  if (filterEl.value !== wanted) saveShopFilter(filterEl.value);
}

/* Tags sort in the order they are listed in shopping-tags.json, so putting
   that file in aisle order walks you round the shop. Untagged items last. */
function tagRank(tag) {
  if (!tag) return Number.MAX_SAFE_INTEGER;
  const i = tags.indexOf(tag);
  return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i;
}

/* Ticked items always drop to the bottom, then the chosen order. Sort is
   stable, so "added" keeps the order things went on the list. */
function ordered(items) {
  const byTag = sortEl.value === 'tag';
  return items.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!byTag) return 0;
    return tagRank(a.tag) - tagRank(b.tag) ||
      (a.tag || '').localeCompare(b.tag || '');
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

  const shopCell = document.createElement('span');
  shopCell.className = 'shop-cell';
  if (item.shop) shopCell.appendChild(pill(item.shop, 'shop-pill'));

  const tagCell = document.createElement('span');
  if (item.tag) tagCell.appendChild(pill(item.tag, 'tag'));

  const priceCell = document.createElement('span');
  priceCell.className = 'price';
  priceCell.textContent = hasPrice(item) ? money(item.price) : '';

  meta.append(shopCell, tagCell, priceCell);
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

/* The total only means anything once every item has a price. With a shop
   filter on it covers just that shop — what this trip will cost. */
function renderTotal(items) {
  totalEl.hidden = items.length === 0;
  if (totalEl.hidden) return;

  const label = document.createElement('span');
  const value = document.createElement('span');

  if (items.every(hasPrice)) {
    label.textContent = filterEl.value ? 'Total for ' + filterEl.value : 'Total';
    value.textContent = money(listTotal(items));
  } else {
    label.className = 'hint';
    label.textContent = 'Total shows once every item has a price';
    const priced = items.filter(hasPrice).length;
    value.className = 'hint';
    value.textContent = priced + ' of ' + items.length + ' priced';
  }
  totalEl.replaceChildren(label, value);
}

/* Say so when a filter is hiding things, so nothing looks lost. */
function renderFilterNote(items) {
  const hidden = list.items.length - items.length;
  filterNoteEl.hidden = hidden === 0;
  filterNoteEl.textContent = 'Showing ' + filterEl.value + ' only — ' +
    hidden + ' other item' + (hidden === 1 ? '' : 's') + ' hidden.';
}

function render() {
  renderFilterOptions();
  const items = visibleItems();
  renderTotal(items);
  renderFilterNote(items);

  const allDone = items.length > 0 && items.every(i => i.done);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = list.items.length === 0
      ? 'Nothing on the list yet. Add your first item above.'
      : 'Nothing on the list for this shop.';
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

  listEl.replaceChildren(...ordered(items).map(renderItem));
}

/* One form, used for adding and for editing an existing item. */
function openForm(item) {
  editingId = item ? item.id : null;
  formEl.reset();
  textEl.value = item ? item.text : '';
  setTagValue(item ? item.tag : '');
  setShopValue(item ? item.shop : defaultShop());
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

function setShopValue(shop) {
  const known = [...shopEl.options].some(o => o.value === shop);
  if (shop && !known) shopEl.append(new Option(shop, shop));
  shopEl.value = shop || '';
}

/* Adding while filtered to one shop almost always means another item for
   that shop, so start the field there. */
function defaultShop() {
  return filterEl.value === NO_SHOP ? '' : filterEl.value;
}

/* Blank stays blank — a price is optional until you want the total. */
function readPrice() {
  const raw = priceEl.value.trim();
  if (raw === '') return null;
  const value = Number(raw);
  return isNaN(value) || value < 0 ? null : value;
}

function addItem(text, tag, shop, price) {
  list.items.push({
    id: String(Date.now()) + Math.random().toString(16).slice(2, 8),
    text: text,
    tag: tag,
    shop: shop,
    price: price,
    done: false,
  });
  saveShopping(list);
  render();
}

function updateItem(id, text, tag, shop, price) {
  const item = list.items.find(i => i.id === id);
  if (!item) return;
  item.text = text;
  item.tag = tag;
  item.shop = shop;
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

/* Finishing one shop clears only that shop's items; the rest of the list —
   the butcher, the things to order online — stays for later. */
function startAgain() {
  const keep = list.items.filter(i => !visibleItems().includes(i));
  if (keep.length === 0) {
    list = newShopping();
  } else {
    list.items = keep;
    saveShopping(list);
  }
  filterEl.value = '';
  saveShopFilter('');
  if (!formEl.hidden) closeForm(); else render();
}

filterEl.addEventListener('change', () => {
  saveShopFilter(filterEl.value);
  if (!formEl.hidden && !editingId) setShopValue(defaultShop());
  render();
});

sortEl.addEventListener('change', () => {
  saveShopSort(sortEl.value);
  render();
});

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
    updateItem(editingId, text, tagEl.value, shopEl.value, readPrice());
    closeForm();
    return;
  }

  const shop = shopEl.value;
  addItem(text, tagEl.value, shop, readPrice());
  /* Stay open so a whole shop can be typed in one go, keeping the shop. */
  formEl.reset();
  setShopValue(shop);
  textEl.focus();
});

/* Tag and shop options come from their JSON files. If one can't be read its
   dropdown is simply left empty rather than blocking the list. */
fetch(TAGS_URL)
  .then(r => r.json())
  .then(loaded => {
    tags = loaded;
    tagEl.append(...tags.map(t => new Option(t, t)));
    render();
  })
  .catch(err => console.warn('Could not load ' + TAGS_URL, err));

fetch(SHOPS_URL)
  .then(r => r.json())
  .then(loaded => {
    shops = loaded;
    shopEl.append(...shops.map(sh => new Option(sh, sh)));
    filterEl.value = loadShopFilter();
    render();
  })
  .catch(err => console.warn('Could not load ' + SHOPS_URL, err));

render();
