# Lists app
The app helping me to create a meaningful to do list for the day, while avoiding the build of of clutter items.

One list at a time. Each morning you start a new list, which clears the previous
day's items — so nothing carries over and clutter can't accumulate.

## How it works

**Home screen** — two choices:
- **Open list** — carry on with the current list (shows the day it was started and progress)
- **New list** — wipes the current list and starts fresh (asks to confirm if the list isn't empty)

**List view**:
- Sort control sits directly under the header: priority, tag, newest or oldest.
  Completed items always stay at the bottom whichever is chosen.
- **+ Add item** opens the entry form: a description, a tag from the dropdown, and a
  priority (high / medium / low). The form stays open so you can add several in a row;
  *Cancel* or `Esc` closes it.
- Each item shows the title on one line, then date & time added, tag and priority on the
  second, lined up in columns across items
- Tick the checkbox to complete an item — it moves to the bottom of the list
- `+` after the title logs a work session and leaves a dot, so a big item can be
  chipped away at over several sittings: `Write the review ● ● ●`. Each dot shows
  the time it was logged on hover, and tapping one removes it.
- `✎` reopens an item in the form to reword it or change its tag or priority.
  The row being edited is highlighted, and the "added" timestamp is left alone.
- `×` removes an item
- **Clear completed** (next to the progress count, only shown when something is
  ticked) deletes the completed items and leaves the rest of the list running

Everything is stored in the browser's `localStorage`, so the list stays on the device.

## Structure

Plain static HTML/CSS/JS, no build step. `app/` is published to GitHub Pages by
`.github/workflows/static.yml` on every push to `main`.

```
app/
  index.html        home screen
  html/list.html    list view
  css/app.css       styles
  data/tags.json    the tag options  <- edit this to change the tags
  js/store.js       localStorage helpers
  js/list.js        list view logic
  manifest.json     PWA manifest
  sw.js             service worker (offline cache)
```

### Changing the tags

`app/data/tags.json` is a plain JSON array of strings. Add, remove or rename entries
and push — nothing else needs changing:

```json
[
  "Foundations",
  "Work",
  "Study",
  ...
]
```

The order in the file is also the order used by **Sort by → Tag**, so put the tags you
want at the top of the list first. Items already tagged with something you later remove
from the file keep their tag; they just sort after the listed ones.

One catch: `sw.js` caches the app for offline use, so after editing `tags.json` bump
`CACHE` in `app/sw.js` (e.g. `lists-v4` → `lists-v5`) to make browsers pick the new
file up. The same applies to any change to the HTML, CSS or JS.

Tags removed from the file are kept on items already using them — they show as normal
and stay selectable when you edit that item, they just sort after the listed tags.

To run locally: `cd app && python3 -m http.server 8000`, then open http://localhost:8000
