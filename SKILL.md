---
name: class-notes-page
description: Sync a student's Brightspace courses (files, calendar, assignments) into their own folders and build an interactive, highly visual study page for each upcoming class session, with private note pads and a layout where each step fits one laptop screen. Use when a student asks to "set up my courses", "sync Brightspace", "prepare my next class", "make a study page / artifact for this session", "prep this week's classes", or names a course session and wants something to follow in class.
---

# Class notes page

Three jobs, in this order: **set up once**, **sync course material**, **build a study page before each class**. Pages are the point; sync and schedule exist so pages are on time and grounded in the real readings.

Files in this skill:

| Path | What it is |
|---|---|
| `shell/` | Page shell: CSS, private notes (claude.ai db with localStorage fallback), notes on/off switch, two-column screen-fit layout. Don't rewrite it per page. |
| `build.py` | Wraps a page folder in the shell; refuses em dashes; warns on steps without a diagram or takeaway. |
| `check_fit.js` | Measures every step at laptop sizes (notes on/off), phone overflow, script errors; screenshots. Needs the global `puppeteer` npm package. |
| `lms/d2l_sync.js` | Runs in the student's signed-in Brightspace tab: lists courses, plans, downloads one zip. |
| `lms/unpack.py` | Files the zip into course folders, writes `Course_Index.html` per course and `lms_events.json`. |
| `schedule/upcoming.py` | Lists sessions in the next N days with page status; writes `Schedule.html`. |
| `examples/ops-process-service/` | A finished page (operations: process maps, bottlenecks, queues, line balancing). The quality bar. |

The student's own settings live in `~/.class-notes-page/config.json` (see `config.example.json`), never in this folder.

## 0. First-time setup (once per term)

1. If `~/.class-notes-page/config.json` is missing, ask only what you can't discover: the Brightspace address (e.g. `https://brightspace.school.edu`) and the folder to save into (suggest their university OneDrive or Documents). Detect the time zone from the computer.
2. Open Brightspace in the browser tool (Claude in Chrome). If the page is a sign-in page, **stop and ask the student to sign in themselves**. Never type, autofill or submit credentials.
3. Read `lms/d2l_sync.js`, run its text in the page, then `await cnpSync({mode:"discover"})`. Show the current-term courses; confirm which ones to include.
4. Write the config with each course's `code`, `name`, `ou`, `folder`, `course_url` (`<lms base>/d2l/home/<ou>`), `instructor` (from the outline) and `instructor_scholar`: search Google Scholar's author search in the browser (`https://scholar.google.com/citations?view_op=search_authors&mauthors=<name>`) and keep the profile only if its affiliation or verified email matches the school; otherwise leave it out. Find each course outline (step 1 below), read its **AI policy** and store a one-line summary plus source in `ai_policy`. If no policy is found, store "unknown: check with the instructor".

## 1. Sync course material

1. In the signed-in tab run `await cnpSync({mode:"plan", courses:[ou, ...]})` and tell the student the file count. Downloading needs their OK: name the zip and the approximate size, and wait for a yes.
2. `await cnpSync({mode:"zip", courses:[...]})` downloads ONE zip (never trigger many separate downloads). Find it in the Downloads folder.
3. `python lms/unpack.py <zip>` files everything under `<root>/<course folder>/materials/` and writes `Course_Index.html` and `<root>/lms_events.json`. Delete the zip afterwards only if the student agrees.
4. Readings that are links (library databases, publisher sites, purchased case packs) cannot be downloaded this way: they are listed in `Course_Index.html`. Open them in the browser only to read; ask before saving any file.
5. **Check the calendar's dates.** Course shells copied from an earlier year often keep that year's events (the sync flags this as a calendar warning). Course outlines win over the LMS calendar for session dates; assignment due dates in the dropbox are usually current.
6. Build or update `<root>/schedule.json` (schema in `schedule/upcoming.py`): class sessions from calendar events and the outline's session table (outlines are the most reliable source for topics and readings), deadlines from assignment due dates. Run `python schedule/upcoming.py` to write `Schedule.html` and see what is coming.

Re-sync whenever the student asks, or at the start of a "prep" request if the last sync (`lms_events.json` "updated") is more than a few days old. If Brightspace is signed out, build from what is already on disk and say so.

## 2. Build a page for a session

### Gather
- The session's topic, readings, case and learning objectives: outline, `Course_Index.html`, module titles, announcements.
- Extract PDFs with `pdftotext -layout`; re-run on exhibit pages with `-raw` if tables come out jumbled. Read spreadsheets' formulas with openpyxl (`data_only=False`) and rebuild the instructor's model in the page with the same default inputs.
- **Never invent case facts or figures.** If the case isn't available, teach the session's methods with clearly labelled illustrative examples, and say so on the page and in the reply.

### Respect the course AI policy
Read `ai_policy` for the course. Where AI analysis of graded work is not allowed, present evidence, both sides and tools whose weights the student sets ("the call is yours"); label any starting scores "a starting read; change it". Never write in the student's voice.

### Plan the steps (this is what makes the first draft good)
- 8 to 12 steps in class order, grouped with `<div class="group-label">` (e.g. "The case", "The tools", "Putting it together"). Last step: glossary with a "Takeaways" note pad (`data-topic="takeaways"`).
- **Every step is a picture you can work with**, not a text block: chips that switch a diagram, sliders that drive a model, nodes that open a detail card, a draggable 2x2, a rating table that moves items on a chart. Rebuild exhibits as charts. Use a different kind of visual from one step to the next.
- Each step: a one-sentence `.idea` (two lines max, 1 to 3 `<mark>` phrases), one or two `.viz` blocks, a `.take` (two lines max), and `<details>` for formulas or for/against lists.
- **Discussion questions** (from the outline, slides or a photo the student sends): one step per question with the evidence on both sides, an interactive way to weigh it, and an answer frame (`.frame` with a `<pre>` template and an "Add to my notes" button, `data-target` = that step's textarea id).
- **Frameworks** (VRIO, Five Forces, stakeholder maps): show the framework as a diagram, apply it to the case, then add a blank worksheet the student can apply to their own organization. Ratings are 1 to 5, not yes/no.
- **Quantitative tools**: sliders for inputs, live chart and readout tiles, formulas folded away, defaults matching the instructor's spreadsheet.
- Draw charts yourself as inline SVG (viewBox 680 wide, 200 to 330 high), coloured only from the page's CSS tokens so light and dark both work. Cite the exhibit or source in a `.cap` under each chart. Make sure labels don't overlap and nothing runs outside the viewBox.
- Plain words, short sentences, no em dashes, no superlatives.

### Write the page folder
Keep source next to the course material: `<root>/<course folder>/pages/session<N>/`. Start from a copy of `examples/ops-process-service/`:

| File | Content |
|---|---|
| `page.json` | `title` (2 to 4 word name), `eyebrow` (course · session · date · topic), `h1`, `lede`, `notes_key` and `notes_doc` (unique per page), `notes_file` (name for saved notes, e.g. "OPS 500 Session 4"), `instructor` (`{"name", "scholar", "page"}` from the config; shown under the title with links), `course_url` and `course_label` (e.g. "OPS 500"; the build adds "on Brightspace"), `fonts` (Google Fonts URL), `footer` (sources), `files` (below) |
| `tokens.css` | Palette and font tokens chosen for this subject: `--bg --paper --ink --muted --line --accent --accent-soft --signal --signal-soft --good --good-soft --bad --bad-soft --pad --padline --display --body --mono` (add your own), in `:root`, then the dark values under `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){...}}` and `:root[data-theme="dark"]{...}`. A new palette and type pairing for each course. |
| `sections.html` | The steps (skeleton below) and group labels. |
| `app.js` | One IIFE per step that draws and wires it. |
| `extra.css` | Optional. |

`data-nav` labels go in the sticky top bar, which must stay one row on a laptop: one or two words, 12 characters at most ("Queues", "The case", "Glossary"). It wraps rather than scrolls on narrow screens and shows numbers only on phones.

```html
<section class="topic" id="queue" data-nav="Waiting lines">
  <div class="main">
    <div class="head"><span class="num">4</span><h2>Why waits explode near 100%</h2></div>
    <p class="idea">Waiting time <mark>shoots up as utilization nears 100%</mark>.</p>
    <div class="viz">...controls and <div class="chart"><svg id="q-chart" viewBox="0 0 680 270" role="img" aria-label="..."></svg></div>...</div>
    <div class="readout" id="q-sum"></div>
    <div class="card" id="q-card" aria-live="polite"></div>
    <details><summary>The formulas</summary><div class="more">...</div></details>
    <div class="take">One-line takeaway.</div>
  </div>
  <div class="notes">
    <label for="n-queue">Notes <em data-for="queue"></em></label>
    <textarea id="n-queue" data-topic="queue" placeholder="What to capture here..."></textarea>
  </div>
</section>
```

**Files step.** List the session's readings, case, slides and every spreadsheet used in class in `page.json` as `"files": [{"title", "kind": "reading|case|spreadsheet|slides|document|video|link", "url", "path", "note"}]`. Take `url` (the Brightspace page) and `path` (the downloaded copy) from the course's `files.json` written by `unpack.py`; `note` says when it's used ("Read before class", "Used in step 4"). The build adds a "Files" step at the top with one-click Brightspace links, "Open my copy" when the page is opened as a local file, and "Copy path" otherwise (web pages can't open local files).

**Saving notes.** Every page has "Save notes (.txt)" and "Save notes (.pdf)" in the status bar. In claude.ai this needs the `downloads` capability (see Publish); the viewer confirms and the file goes to their downloads. Opened as a local file, it is a normal download.

**Screen-fit layout.** The shell puts `.head` and `.idea` across the top, every `.viz` in the left column and everything else (readouts, cards, details, takeaway) on the right, then balances the columns. Keep readouts and cards outside `.viz`. `class="viz side"` or `data-col="b"` sends a block right; `data-col="a"` keeps one left; `<div class="main nosplit">` uses the full width; `data-cols="wideA"` or `"even"` on `.main` changes the split.

**Helpers available in app.js** (one strict IIFE): `el(tag, attrs, parent)`, `txt(parent, x, y, text, {anchor, fill, size, weight, mono, disp})`, `lines()`, `clear(svg)`, `arrowDef(svg, id, color)`, `card(id, title, subtitle, body)`, `hit(g, label, fn)` (keyboard-accessible SVG button), `chipset(box, labels, start, fn)`, `tiles(id, [[value, label, color?]])`, `ls(key, default)` / `lsw(key, value)`, `f1()`, `f2()`, `fmt()`. Never use `alert`, `confirm` or `prompt`.

### Build, check, look
```bash
python build.py "<page_dir>"
node --check "<page_dir>/chk.js"
node check_fit.js "<page_dir>/page.html" --all --shots "<temp dir>/shots"
```
Fix every "TOO TALL" (move blocks between columns, shorten idea/takeaway/tile labels, trim a viewBox) and every QUALITY warning. Then **look at every screenshot** and fix overlapping labels, clipped text, empty-looking steps and charts that don't explain themselves. Do this before showing the page; the student should not have to ask for "more visual" or "fit on screen".

### Publish and file
- With the claude.ai Artifact tool: publish `page.html` with `icon: "notes"`, a one-sentence `description` and `capabilities: {"db": {}, "user": {}, "downloads": true}` (private notes need db and user; the save buttons need downloads). Republish later to the same URL.
- Without it: the page works as a local file opened in a browser (notes then save in that browser only).
- Copy `page.html` to `<root>/<course folder>/Session<N>_<Topic>.html`, set the session's `page` status and URL in `schedule.json`, re-run `schedule/upcoming.py`.
- Reply briefly: the link, one line per step, what couldn't be read, what is illustrative.

## 3. Staying on time

- "Prep my classes" or "what's next": run `schedule/upcoming.py --days <build_ahead_days>` and build every session marked `todo`, earliest first.
- To make it automatic, offer to create a scheduled task in Claude Code (the `/schedule` command or the desktop app's scheduled tasks) that runs "prep my classes with class-notes-page" each evening. Sync needs a signed-in browser; building pages does not.
