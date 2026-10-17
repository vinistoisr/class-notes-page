"""List the class sessions coming up and whether their study page is built; write Schedule.html.

Usage: python upcoming.py [--days 3] [--config ~/.class-notes-page/config.json]

Reads <root>/schedule.json, which the skill keeps up to date:
{
  "sessions": [{"course": "OPS 500", "session": "4", "date": "2026-10-17", "start": "13:30", "end": "17:30",
                "topic": "...", "prep": ["readings, case, spreadsheets"], "materials": ["relative/paths"],
                "page": {"status": "todo" | "built", "url": "", "file": ""}}],
  "deadlines": [{"course": "OPS 500", "item": "Assignment 1", "due": "2026-11-10 17:30", "weight": "30%"}]
}
"""
import html, json, os, sys
from datetime import datetime, timedelta


def main():
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 3
    cfg_path = sys.argv[sys.argv.index("--config") + 1] if "--config" in sys.argv else "~/.class-notes-page/config.json"
    cfg = json.load(open(os.path.expanduser(cfg_path), encoding="utf-8"))
    root = os.path.expanduser(cfg["root"])
    path = os.path.join(root, "schedule.json")
    if not os.path.exists(path):
        sys.exit("No schedule.json yet in %s. Build it from lms_events.json and the course outlines first." % root)
    sch = json.load(open(path, encoding="utf-8"))
    now = datetime.now()
    sessions = sorted(sch.get("sessions", []), key=lambda s: (s["date"], s.get("start", "")))
    soon = [s for s in sessions if now - timedelta(hours=6) <= datetime.fromisoformat(s["date"] + " " + (s.get("end") or "23:59")) and datetime.fromisoformat(s["date"]) <= now + timedelta(days=days)]
    print("Sessions in the next %d days:" % days)
    for s in soon:
        st = (s.get("page") or {}).get("status", "todo")
        print("  %s %s-%s  %-10s S%-3s %-45s page: %s" % (s["date"], s.get("start", ""), s.get("end", ""), s["course"], s.get("session", ""), s.get("topic", "")[:45], st))
    if not soon:
        print("  none")
    E = html.escape
    rows = "".join("<tr class='%s'><td>%s</td><td>%s-%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
        "past" if s["date"] < now.strftime("%Y-%m-%d") else "", E(s["date"]), E(s.get("start", "")), E(s.get("end", "")), E(s["course"]), E(str(s.get("session", ""))), E(s.get("topic", "")),
        ('<a href="%s">study page</a>' % E((s.get("page") or {}).get("url") or (s.get("page") or {}).get("file") or "#")) if (s.get("page") or {}).get("status") == "built" else "to do") for s in sessions)
    drows = "".join("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (E(d.get("due", "")), E(d.get("course", "")), E(d.get("item", "")), E(str(d.get("weight", "")))) for d in sorted(sch.get("deadlines", []), key=lambda d: d.get("due", "")))
    out = """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Class Schedule</title>
<style>:root{--bg:#f4f5f7;--paper:#fff;--ink:#1b1e27;--muted:#5d6475;--line:#dde0e7;--accent:#2f4f8f}
@media (prefers-color-scheme:dark){:root{--bg:#13151b;--paper:#1b1e27;--ink:#e6e8ee;--muted:#9ba2b3;--line:#2d3240;--accent:#8fa8e8}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif;padding:24px max(16px,env(safe-area-inset-left))}
main{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:18px}section{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px 18px;overflow-x:auto}
table{border-collapse:collapse;width:100%%;font-size:14.5px}td,th{padding:6px;border-bottom:1px solid var(--line);text-align:left}th{font-size:12px;text-transform:uppercase;color:var(--muted)}
tr.past{color:var(--muted)}a{color:var(--accent)}h1{margin:0}</style>
<main><h1>%s schedule</h1><p style="color:var(--muted)">Updated %s</p>
<section><h2>Class sessions</h2><table><tr><th>Date</th><th>Time</th><th>Course</th><th>Session</th><th>Topic</th><th>Page</th></tr>%s</table></section>
<section><h2>Deadlines</h2><table><tr><th>Due</th><th>Course</th><th>Item</th><th>Weight</th></tr>%s</table></section></main>""" % (E(cfg.get("term", "Term")), now.strftime("%Y-%m-%d %H:%M"), rows, drows)
    open(os.path.join(root, "Schedule.html"), "w", encoding="utf-8").write(out)
    print("wrote", os.path.join(root, "Schedule.html"))


if __name__ == "__main__":
    main()
