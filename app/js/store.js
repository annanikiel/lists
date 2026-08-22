/* Shared storage helpers for the lists app. One list at a time. */

const STORE_KEY = 'lists_current';
const SORT_KEY = 'lists_sort';

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

function formatDay(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

function formatStamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}
