"""Build a class notes page from a page folder.

Usage: python build.py <page_dir> [out.html]

<page_dir> holds:
  page.json     title, eyebrow, h1, lede, notes_key, notes_doc, fonts (Google Fonts URL), footer, out (optional)
  tokens.css    the :root palette + font tokens, light and both dark blocks
  sections.html the <section class="topic" id=".." data-nav="Short label"> blocks and group labels
  app.js        page-specific charts and tools (runs inside the shared IIFE, after runtime_head.js)
  extra.css     optional page-specific CSS

Writes one self-contained HTML file and a chk.js next to it for `node --check`.
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SHELL = os.path.join(HERE, "shell")


def read(path, default=None):
    if not os.path.exists(path):
        if default is None:
            sys.exit("missing: " + path)
        return default
    return open(path, encoding="utf-8").read()


def lint(sections, app):
    """Quality gate: every step needs a picture to interact with and a takeaway."""
    warn = []
    for m in re.finditer(r'<section class="topic" id="([^"]+)"(.*?)</section>', sections, re.S):
        sid, inner = m.group(1), m.group(2)
        if sid in ("glossary", "takeaways", "files"):
            continue
        if "<svg" not in inner and not re.search(r'class="(chips|controls|steps|vgrid|mgrid|args|flow5|lever|fit)"', inner):
            warn.append(sid + ": no diagram or interactive control")
        if 'class="take"' not in inner:
            warn.append(sid + ": no takeaway")
        if 'class="viz' not in inner:
            warn.append(sid + ": no .viz block")
    steps = [m.group(2) for m in re.finditer(r'<section class="topic" id="([^"]+)"(.*?)</section>', sections, re.S) if m.group(1) != "glossary"]
    with_svg = sum(1 for x in steps if "<svg" in x)
    if steps and with_svg < 0.6 * len(steps):
        warn.append("only %d of %d steps have a diagram; aim for most of them" % (with_svg, len(steps)))
    for w in warn:
        print("QUALITY:", w)
    if warn and "--strict" in sys.argv:
        sys.exit("quality gate failed")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    d = [a for a in sys.argv[1:] if not a.startswith("--")][0]
    cfg = json.loads(read(os.path.join(d, "page.json")))
    for k in ("title", "eyebrow", "h1", "lede", "notes_key", "notes_doc", "fonts"):
        if k not in cfg:
            sys.exit("page.json needs " + k)
    sections = read(os.path.join(d, "sections.html"))
    tokens = read(os.path.join(d, "tokens.css"))
    app = read(os.path.join(d, "app.js"))
    extra = read(os.path.join(d, "extra.css"), "")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out = args[1] if len(args) > 1 else os.path.join(d, cfg.get("out", "page.html"))

    # Nav from the sections: id, number badge, data-nav label.
    nav = []
    for m in re.finditer(r'<section class="topic" id="([^"]+)"[^>]*?data-nav="([^"]+)"[^>]*>(.*?)</section>', sections, re.S):
        sid, label, inner = m.group(1), m.group(2), m.group(3)
        num = re.search(r'<span class="num">([^<]+)</span>', inner)
        nav.append('    <a href="#%s"><i>%s</i>%s</a>' % (sid, num.group(1) if num else "", label))
    n_sections = len(re.findall(r'<section class="topic"', sections))
    if len(nav) != n_sections:
        sys.exit("every <section class=\"topic\"> needs id and data-nav (found %d of %d)" % (len(nav), n_sections))
    if chr(0x2014) in sections + app + json.dumps(cfg, ensure_ascii=False):
        sys.exit("em dash found; rewrite it")
    lint(sections, app)

    e = html.escape
    # Files section (readings, case, spreadsheets) from page.json "files": [{title, kind, path, url, note, when}]
    files = cfg.get("files") or []
    files_section = ""
    if files:
        files_section = """<section class="topic files" id="files" data-nav="Files">
    <div class="main nosplit">
      <div class="head"><span class="num">F</span><h2>Files for this class</h2></div>
      <div class="viz"><div class="fgrid" id="files-grid"></div></div>
      <p class="cap" id="files-cap"></p>
    </div>
  </section>

  """
        nav.insert(0, '    <a href="#files"><i>F</i>Files</a>')
    # Instructor line: name, Google Scholar, and the course's Brightspace home. Only http(s) links.
    def safe_url(u):
        return e(u) if isinstance(u, str) and re.match(r"https?://", u, re.I) else ""
    ins, bits = cfg.get("instructor") or {}, []
    if ins.get("name"):
        bits.append('<span class="who">Instructor <b>%s</b></span>' % e(ins["name"]))
    for key, label in (("scholar", "Google Scholar"), ("page", "Faculty page")):
        if safe_url(ins.get(key)):
            bits.append('<a class="fbtn" href="%s" target="_blank" rel="noopener">%s</a>' % (safe_url(ins[key]), label))
    if safe_url(cfg.get("course_url")):
        bits.append('<a class="fbtn" href="%s" target="_blank" rel="noopener">%s on Brightspace</a>' % (safe_url(cfg["course_url"]), e(cfg.get("course_label", "Course page"))))
    byline = ('    <p class="byline">%s</p>' % " ".join(bits) + chr(10)) if bits else ""
    page_js = json.dumps({"notesKey": cfg["notes_key"], "notesDoc": cfg["notes_doc"], "title": cfg["title"], "eyebrow": re.sub("<[^>]+>", "", cfg["eyebrow"]),
                          "notesFile": cfg.get("notes_file", cfg["title"]), "files": files}, ensure_ascii=False).replace("</", "<\\/")
    page = f'''<title>{e(cfg["title"])}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{e(cfg["fonts"])}">
<style>
{tokens.strip()}
{read(os.path.join(SHELL, "shell.css"))}
{extra}
</style>

<div class="wrap">
  <header>
    <div class="eyebrow">{cfg["eyebrow"]}</div>
    <h1>{cfg["h1"]}</h1>
{byline}    <p class="lede">{cfg["lede"]}</p>
  </header>

  <div class="statusbar">
    <span id="save-status" class="pill">Notes: saving on this device</span>
    <button type="button" id="copy-all">Copy all notes</button>
    <button type="button" id="save-txt">Save notes (.txt)</button>
    <button type="button" id="save-pdf">Save notes (.pdf)</button>
    <span id="copy-msg" aria-live="polite"></span>
  </div>

  <div class="topbar" id="topbar">
    <nav class="toc" aria-label="Steps">
{chr(10).join(nav)}
    </nav>
    <div class="tb-actions">
      <button type="button" id="notes-all" aria-pressed="true">Notes: on</button>
    </div>
  </div>

{files_section}{sections.strip()}

  <footer>{cfg.get("footer", "")}</footer>
</div>

<script>
(function(){{
  "use strict";
  var PAGE={page_js};
{read(os.path.join(SHELL, "runtime_head.js"))}
{app}
{read(os.path.join(SHELL, "runtime_tail.js"))}
}})();
</script>
'''
    open(out, "w", encoding="utf-8").write(page)
    js = re.search(r"<script>(.*)</script>", page, re.S).group(1)
    open(os.path.join(os.path.dirname(os.path.abspath(out)), "chk.js"), "w", encoding="utf-8").write(js)
    print("built", out, len(page), "bytes,", len(nav), "steps")


if __name__ == "__main__":
    main()
