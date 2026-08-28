/* Shared storage helpers. One task list at a time, plus a shopping list. */

const STORE_KEY = 'lists_current';
const SORT_KEY = 'lists_sort';
const SHOP_KEY = 'lists_shopping';

function loadList() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!list || !Array.isArray(list.items)) return null;
    return list;
  } catch (e) {
    return null;
  }
}

function saveList(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

function newList() {
  const list = { createdAt: new Date().toISOString(), items: [] };
  saveList(list);
  return list;
}

function loadSort() {
  return localStorage.getItem(SORT_KEY) || 'priority';
}

function saveSort(sort) {
  localStorage.setItem(SORT_KEY, sort);
}

/* The shopping list keeps no dates — items are just text, tag, price, done. */
function loadShopping() {
  try {
    const raw = localStorage.getItem(SHOP_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!list || !Array.isArray(list.items)) return null;
    return list;
  } catch (e) {
    return null;
  }
}

function saveShopping(list) {
  localStorage.setItem(SHOP_KEY, JSON.stringify(list));
}

function newShopping() {
  const list = { items: [] };
  saveShopping(list);
  return list;
}

function formatStamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}
