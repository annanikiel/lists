# Lists app
The app helping me to create a meaningful to do list for the day, while avoiding the build of of clutter items.

One list at a time. Each morning you start a new list, which clears the previous
day's items — so nothing carries over and clutter can't accumulate.

## How it works

**Home screen** — two choices:
- **Open list** — carry on with the current list (shows the day it was started and progress)
- **New list** — wipes the current list and starts fresh (asks to confirm if the list isn't empty)

**List view**:
- Add an item with a description, an optional tag, and a priority (high / medium / low)
- Each item shows the title on one line, then tag, priority and the date & time it was added
- Tick the checkbox to complete an item — it moves to the bottom of the list
- Sort by priority, tag, newest or oldest; completed items always stay at the bottom
- `×` removes an item

Everything is stored in the browser's `localStorage`, so the list stays on the device.

## Structure

Plain static HTML/CSS/JS, no build step. `app/` is published to GitHub Pages by
`.github/workflows/static.yml` on every push to `main`.

```
app/
  index.html        home screen
  html/list.html    list view
  css/app.css       styles
  js/store.js       localStorage helpers
  js/list.js        list view logic
  manifest.json     PWA manifest
  sw.js             service worker (offline cache)
```

To run locally: `cd app && python3 -m http.server 8000`, then open http://localhost:8000
