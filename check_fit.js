// Screen-fit check for a built class notes page.
// Usage: node check_fit.js <page.html> [--shots <dir>] [--all] [--vp 1280x680,1536x730]
// --all screenshots every step (at the first viewport, notes off) for a visual review, not only the failures.
// Loads the page headless, then for each laptop viewport, with notes on and off, measures every
// step against the screen height left under the sticky bar. Also reports script errors and
// horizontal overflow at phone width (390px). Exit code 1 if anything fails.
const path = require("path"), url = require("url"), cp = require("child_process");
const puppeteer = require(path.join(cp.execSync("npm root -g").toString().trim(), "puppeteer"));

const args = process.argv.slice(2);
if (!args[0]) { console.error("usage: node check_fit.js <page.html> [--shots dir] [--vp WxH,WxH]"); process.exit(2); }
const file = path.resolve(args[0]);
const opt = (k) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null; };
const shots = opt("--shots");
// 1280x680: 1080p laptop at 150% scaling, browser chrome removed. 1536x730: 1080p at 125%.
const vps = (opt("--vp") || "1280x680,1536x730").split(",").map((v) => v.split("x").map(Number));

(async () => {
  const b = await puppeteer.launch({ headless: "new" });
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(url.pathToFileURL(file).href, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 900));
  let fails = 0;
  for (const [w, h] of vps) {
    await p.setViewport({ width: w, height: h });
    for (const notesOn of [false, true]) {
      await p.evaluate((on) => {
        const b = document.getElementById("notes-all");
        if ((b.getAttribute("aria-pressed") === "true") !== on) b.click();
      }, notesOn);
      await new Promise((r) => setTimeout(r, 250));
      const res = await p.evaluate(() => {
        const nav = document.getElementById("topbar").offsetHeight, avail = innerHeight - nav - 16;
        return { avail, rows: [...document.querySelectorAll("section.topic")].map((s) => ({ id: s.id, h: s.offsetHeight })) };
      });
      const over = res.rows.filter((r) => r.h > res.avail);
      fails += over.length;
      console.log(`\n${w}x${h} notes ${notesOn ? "on " : "off"}  screen for a step: ${res.avail}px  -> ${over.length ? over.length + " too tall" : "all fit"}`);
      res.rows.forEach((r) => console.log(`  ${r.h > res.avail ? "TOO TALL" : "ok      "}  ${String(r.h).padStart(5)}px  ${r.id}${r.h > res.avail ? "  (+" + (r.h - res.avail) + ")" : ""}`));
      if (shots) {
        const fs = require("fs"); fs.mkdirSync(shots, { recursive: true });
        await p.addStyleTag({ content: ".topbar{position:static!important}" });
        const pick = args.includes("--all") && w === vps[0][0] && h === vps[0][1] && !notesOn ? res.rows : over;
        for (const r of pick) { const el = await p.$("#" + r.id); await el.screenshot({ path: path.join(shots, `${w}x${h}-${notesOn ? "notes" : "nonotes"}-${r.id}.png`) }); }
        await p.addStyleTag({ content: ".topbar{position:sticky!important}" });
      }
    }
  }
  await p.setViewport({ width: 390, height: 800 });
  const ov = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(`\nphone 390px: page width ${ov}px ${ov > 390 ? "OVERFLOWS" : "ok"}`);
  console.log(`script errors: ${errs.length ? errs.join(" | ") : "none"}`);
  await b.close();
  process.exit(fails || ov > 390 || errs.length ? 1 : 0);
})();
