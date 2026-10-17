"""Unpack a Brightspace sync zip into the student's course folders.

Usage: python unpack.py <brightspace-sync.zip> [--config ~/.class-notes-page/config.json]

For each course in the zip:
  <root>/<course folder>/materials/...   every downloaded file, in the Brightspace module structure
  <root>/<course folder>/Course_Index.html  modules, files, links, assignments, calendar, announcements
Plus <root>/lms_events.json: every calendar event and assignment due date, in local time, for the schedule.
Existing files are kept unless the new copy differs in size (then the new one replaces it).
"""
import html, json, os, re, sys, zipfile
from datetime import datetime, timezone

try:
    from zoneinfo import ZoneInfo
except ImportError:  # Python < 3.9
    ZoneInfo = None


def load_config(path):
    path = os.path.expanduser(path)
    if not os.path.exists(path):
        sys.exit("No config at %s. Run the skill's first-time setup first." % path)
    return json.load(open(path, encoding="utf-8"))


def local(ts, tz):
    if not ts:
        return None
    try:
        d = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return ts
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    try:
        d = d.astimezone(ZoneInfo(tz)) if ZoneInfo and tz else d.astimezone()
    except Exception:  # no tz database (Windows without the tzdata package): use the computer's local time
        d = d.astimezone()
    return d.strftime("%Y-%m-%d %H:%M")


def safe_name(s):
    """One folder name: no path separators, no '..', no characters Windows rejects."""
    s = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "-", str(s or "")).strip(" .")
    return s[:90] or "course"


def course_folder(root, cfg, code, name, ou=None):
    """Folder for a course, always inside root. Matched by Brightspace id first, then by code
    (LMS codes are often long, e.g. "202609 OPS 500 A01", so a config code contained in it also matches)."""
    folder = None
    for c in cfg.get("courses", []):
        cc = (c.get("code") or "").lower()
        if (ou is not None and str(c.get("ou")) == str(ou)) or (cc and (cc == code.lower() or cc in code.lower())):
            folder = c.get("folder")
            break
    if folder:
        parts = [safe_name(p) for p in re.split(r"[\\/]+", folder) if p and p != ".."]
    else:
        parts = [safe_name("%s - %s" % (code, name) if name else code)]
    path = os.path.realpath(os.path.join(root, *parts))
    if os.path.commonpath([path, os.path.realpath(root)]) != os.path.realpath(root):
        sys.exit("refusing to write outside %s: %s" % (root, path))
    return path


def page(title, body):
    return """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title><style>
:root{--bg:#f4f5f7;--paper:#fff;--ink:#1b1e27;--muted:#5d6475;--line:#dde0e7;--accent:#2f4f8f}
@media (prefers-color-scheme:dark){:root{--bg:#13151b;--paper:#1b1e27;--ink:#e6e8ee;--muted:#9ba2b3;--line:#2d3240;--accent:#8fa8e8}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif;padding:24px max(16px,env(safe-area-inset-left))}
main{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
section{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px 18px}
h1{margin:0;font-size:28px} h2{margin:0 0 8px;font-size:19px} a{color:var(--accent)}
table{border-collapse:collapse;width:100%%;font-size:14.5px} td,th{padding:6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)} .m{color:var(--muted);font-size:13.5px}
</style><main>%s</main>""" % (html.escape(title), body)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    cfg_path = sys.argv[sys.argv.index("--config") + 1] if "--config" in sys.argv else "~/.class-notes-page/config.json"
    cfg = load_config(cfg_path)
    root, tz = os.path.expanduser(cfg["root"]), cfg.get("timezone")
    z = zipfile.ZipFile(args[0])
    man = json.loads(z.read("manifest.json"))
    events_path = os.path.join(root, "lms_events.json")
    events = json.load(open(events_path, encoding="utf-8")) if os.path.exists(events_path) else {"events": []}
    events["events"] = [e for e in events["events"] if e.get("ou") not in [c["ou"] for c in man["courses"]]]
    written = kept = 0
    for c in man["courses"]:
        folder = course_folder(root, cfg, c["code"], c["name"], c.get("ou"))
        mat = os.path.join(folder, "materials")
        os.makedirs(mat, exist_ok=True)
        prefix = c["code"] + "/"
        local_files = []
        for info in z.infolist():
            if not info.filename.startswith(prefix) or info.is_dir():
                continue
            rel = info.filename[len(prefix):]
            dest = os.path.realpath(os.path.join(mat, rel))
            if os.path.commonpath([dest, os.path.realpath(mat)]) != os.path.realpath(mat):
                continue  # never write outside the course folder
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if os.path.exists(dest) and os.path.getsize(dest) == info.file_size:
                kept += 1
            else:
                with open(dest, "wb") as f:
                    f.write(z.read(info))
                written += 1
            local_files.append(rel)
        # files.json: what a study page's Files section needs (title, local path, Brightspace page, kind)
        kinds = {".xlsx": "spreadsheet", ".xls": "spreadsheet", ".xlsm": "spreadsheet", ".csv": "spreadsheet", ".pptx": "slides", ".ppt": "slides",
                 ".pdf": "reading", ".docx": "document", ".doc": "document", ".html": "page", ".mp4": "video"}
        flist = []
        for f in man.get("files", []):
            if not f["path"].startswith(prefix):
                continue
            rel = f["path"][len(prefix):]
            flist.append({"title": f.get("title") or os.path.basename(rel), "module": f.get("module", ""), "path": os.path.join(mat, *rel.split("/")),
                          "url": f.get("view", ""), "kind": kinds.get(os.path.splitext(rel)[1].lower(), "file")})
        for l in c["links"]:
            if l.get("type") == "Link" and l.get("url"):
                flist.append({"title": l["title"], "module": l["module"], "path": "", "url": l["url"], "kind": "link"})
        json.dump(flist, open(os.path.join(folder, "files.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
        # events for the schedule
        for e in c["calendar"]:
            events["events"].append({"ou": c["ou"], "course": c["code"], "kind": "calendar", "title": e["title"], "start": local(e["start"], tz), "end": local(e["end"], tz), "location": e.get("location", ""), "text": e.get("text", "")})
        for a in c["assignments"]:
            if a.get("due") or a.get("end"):
                events["events"].append({"ou": c["ou"], "course": c["code"], "kind": "due", "title": a["name"], "start": local(a.get("due") or a.get("end"), tz), "points": a.get("points")})
        for m in c["modules"]:
            if m.get("start") or m.get("due"):
                events["events"].append({"ou": c["ou"], "course": c["code"], "kind": "module", "title": m["path"], "start": local(m.get("start"), tz), "due": local(m.get("due"), tz)})
        # course index page
        E = html.escape
        files_rows = "".join('<tr><td><a href="materials/%s">%s</a></td></tr>' % (E(f.replace(os.sep, "/")), E(f)) for f in sorted(local_files))
        link_rows = "".join('<tr><td class="m">%s</td><td><a href="%s">%s</a></td></tr>' % (E(l["module"]), E(l.get("url") or "#"), E(l["title"])) for l in c["links"])
        asg_rows = "".join("<tr><td><b>%s</b><div class=m>%s</div></td><td>%s</td></tr>" % (E(a["name"]), E(a.get("instructions", "")[:600]), E(local(a.get("due"), tz) or "")) for a in c["assignments"])
        cal_rows = "".join("<tr><td>%s</td><td>%s<div class=m>%s</div></td></tr>" % (E(local(e["start"], tz) or ""), E(e["title"]), E(e.get("text", ""))) for e in sorted(c["calendar"], key=lambda e: e.get("start") or ""))
        news_rows = "".join("<tr><td>%s</td><td><b>%s</b><div class=m>%s</div></td></tr>" % (E(local(n.get("date"), tz) or ""), E(n["title"]), E(n.get("text", "")[:500])) for n in c["news"])
        body = "<h1>%s %s</h1><p class=m>Synced from Brightspace %s</p>" % (E(c["code"]), E(c["name"]), E(local(man["generated"], tz) or ""))
        for title, rows, head in (("Calendar", cal_rows, "<tr><th>When</th><th>Event</th></tr>"), ("Assignments", asg_rows, "<tr><th>Assignment</th><th>Due</th></tr>"),
                                  ("Files", files_rows, ""), ("Links (readings that live elsewhere)", link_rows, "<tr><th>Module</th><th>Link</th></tr>"), ("Announcements", news_rows, "")):
            body += "<section><h2>%s</h2>%s</section>" % (title, "<table>%s%s</table>" % (head, rows) if rows else "<p class=m>None.</p>")
        open(os.path.join(folder, "Course_Index.html"), "w", encoding="utf-8").write(page(c["code"] + " index", body))
        print("%s -> %s (%d files)" % (c["code"], folder, len(local_files)))
        if c.get("calendarWarning"):
            print("  WARNING:", c["calendarWarning"])
    events["events"].sort(key=lambda e: e.get("start") or "")
    events["updated"] = man["generated"]
    os.makedirs(root, exist_ok=True)
    json.dump(events, open(events_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("written %d, unchanged %d, skipped by the browser %d; events -> %s" % (written, kept, len(man.get("skipped", [])), events_path))


if __name__ == "__main__":
    main()
