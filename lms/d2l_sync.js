// Brightspace (D2L) course sync, run inside the student's own signed-in Brightspace tab.
// Paste this whole file into the browser tool's JavaScript runner, then call ONE of:
//   await cnpSync({mode: "discover"})                       -> list of your courses (no download)
//   await cnpSync({mode: "plan", courses: [123, 456]})       -> what would be downloaded, with sizes
//   await cnpSync({mode: "zip",  courses: [123, 456]})       -> downloads ONE zip with every file + manifest.json
// Options for plan/zip: maxFileMB (default 150), maxTotalMB (default 900), name (zip file name).
// Uses only the official Brightspace REST API with the browser's existing session. Never handles passwords.
async function cnpSync(CFG) {
  CFG = CFG || {};
  const J = async (u) => { const r = await fetch(u, { credentials: "include" }); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); };
  const tryJ = async (u) => { try { return await J(u); } catch (e) { return null; } };
  if (/\/login|cas\/login|signin/i.test(location.href)) return { error: "Not signed in. Sign in to Brightspace in this tab first." };
  const vers = await tryJ("/d2l/api/versions/");
  if (!vers) return { error: "This tab is not a Brightspace site, or the session has expired. Open your Brightspace home page and sign in." };
  const ver = (p, d) => { const v = vers.find((x) => x.ProductCode === p); return v ? v.LatestVersion : d; };
  const LE = ver("le", "1.67"), LP = ver("lp", "1.43");
  const who = await tryJ(`/d2l/api/lp/${LP}/users/whoami`);

  if (CFG.mode === "discover") {
    let out = [], bm = "";
    for (let guard = 0; guard < 20; guard++) {
      const page = await J(`/d2l/api/lp/${LP}/enrollments/myenrollments/?orgUnitTypeId=3${bm ? "&bookmark=" + encodeURIComponent(bm) : ""}`);
      out = out.concat(page.Items || []);
      if (!page.PagingInfo || !page.PagingInfo.HasMoreItems) break;
      bm = page.PagingInfo.Bookmark;
    }
    const now = Date.now(), day = 864e5;
    // "Current": real start/end dates if the course has them; else a term code like 202609 (Fall 2026) in its code;
    // else opened in the last 3 weeks. Many schools leave course dates empty.
    const isCurrent = (i) => {
      const s = i.Access.StartDate && Date.parse(i.Access.StartDate), e = i.Access.EndDate && Date.parse(i.Access.EndDate);
      if (s && e) return s < now + 45 * day && e > now - 7 * day;
      const t = /\b(20\d{2})(0[1-9]|1[0-2])\b/.exec(i.OrgUnit.Code + " " + i.OrgUnit.Name);
      if (t) { const ts = Date.UTC(+t[1], +t[2] - 1, 1); return ts < now + 45 * day && ts > now - 140 * day; }
      return !!i.Access.LastAccessed && Date.parse(i.Access.LastAccessed) > now - 21 * day;
    };
    const courses = out.filter((i) => i.Access && i.Access.CanAccess).map((i) => ({
      ou: i.OrgUnit.Id, code: i.OrgUnit.Code, name: i.OrgUnit.Name,
      start: i.Access.StartDate, end: i.Access.EndDate, active: i.Access.IsActive,
      current: isCurrent(i), last: i.Access.LastAccessed
    })).sort((a, b) => (b.current - a.current) || String(b.last || "").localeCompare(String(a.last || "")));
    return { site: location.origin, user: who ? who.FirstName : null, le: LE, lp: LP, courses };
  }

  const ous = CFG.courses || [];
  if (!ous.length) return { error: "Pass courses: [orgUnitId, ...] (from discover)." };
  const maxFile = (CFG.maxFileMB || 150) * 1048576, maxTotal = (CFG.maxTotalMB || 900) * 1048576;
  const clean = (s) => String(s || "untitled").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim().slice(0, 90);
  const extOf = (u) => { const m = /\.([a-z0-9]{1,5})(?:$|[?#])/i.exec(u || ""); return m ? "." + m[1].toLowerCase() : ""; };
  const files = [], manifest = { generated: new Date().toISOString(), site: location.origin, le: LE, courses: [], skipped: [] };

  for (const ou of ous) {
    // Students usually get 403 on /courses/{ou}; their own enrollment record carries the code and name.
    const enr = await tryJ(`/d2l/api/lp/${LP}/enrollments/myenrollments/${ou}`);
    const info = (enr && enr.OrgUnit) || (await tryJ(`/d2l/api/lp/${LP}/courses/${ou}`)) || {};
    const code = clean(info.Code || "course-" + ou), C = { ou, code, name: info.Name || "", modules: [], links: [], calendar: [], assignments: [], news: [] };
    const toc = await tryJ(`/d2l/api/le/${LE}/${ou}/content/toc`);
    const walk = (mods, path) => (mods || []).forEach((m) => {
      const p = path.concat(clean(m.Title));
      C.modules.push({ path: p.join(" / "), title: m.Title, start: m.StartDateTime, end: m.EndDateTime, due: m.DueDateTime });
      (m.Topics || []).forEach((t) => {
        const isFile = t.TypeIdentifier === "File" && t.Url && !/^https?:/i.test(t.Url);
        if (isFile) {
          let name = clean(t.Title); const ext = extOf(t.Url); if (ext && !name.toLowerCase().endsWith(ext)) name += ext;
          files.push({ path: [code, "content"].concat(p, [name]).join("/"), url: `/d2l/api/le/${LE}/${ou}/content/topics/${t.TopicId}/file`, title: t.Title, module: p.join(" / "), ou });
        } else {
          C.links.push({ module: p.join(" / "), title: t.Title, url: t.Url && t.Url.startsWith("/") ? location.origin + t.Url : t.Url, type: t.TypeIdentifier, due: t.DueDateTime });
        }
      });
      walk(m.Modules, p);
    });
    if (toc) walk(toc.Modules, []); else manifest.skipped.push({ ou, what: "content" });
    const cal = (await tryJ(`/d2l/api/le/${LE}/${ou}/calendar/events/`)) || [];
    C.calendar = (Array.isArray(cal) ? cal : cal.Objects || []).map((e) => ({ title: e.Title, start: e.StartDateTime || e.StartDay, end: e.EndDateTime || e.EndDay, allDay: e.IsAllDayEvent, location: e.LocationName || e.Location || "", text: (e.Description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400) }));
    // Course shells copied from an earlier year keep that year's calendar dates. Flag them; trust the outline instead.
    const yr = new Date().getFullYear(), stale = C.calendar.filter((e) => e.start && +String(e.start).slice(0, 4) < yr);
    if (C.calendar.length && stale.length > C.calendar.length / 2) C.calendarWarning = stale.length + " of " + C.calendar.length + " calendar events are dated before " + yr + "; the course calendar was probably copied from an old shell. Use the course outline for session dates.";
    const drop = (await tryJ(`/d2l/api/le/${LE}/${ou}/dropbox/folders/`)) || [];
    drop.forEach((f) => {
      C.assignments.push({ name: f.Name, due: f.DueDate, end: f.Availability && f.Availability.EndDate, points: f.Assessment && f.Assessment.ScoreDenominator, instructions: ((f.CustomInstructions && f.CustomInstructions.Text) || "").slice(0, 3000), files: (f.Attachments || []).map((a) => a.FileName) });
      (f.Attachments || []).forEach((a) => files.push({ path: [code, "assignments", clean(f.Name), clean(a.FileName)].join("/"), url: `/d2l/api/le/${LE}/${ou}/dropbox/folders/${f.Id}/attachments/${a.FileId}`, size: a.Size, title: a.FileName, module: "Assignments", ou }));
    });
    const news = (await tryJ(`/d2l/api/le/${LE}/${ou}/news/`)) || [];
    news.forEach((n) => {
      C.news.push({ title: n.Title, date: n.StartDate, text: ((n.Body && n.Body.Text) || "").slice(0, 2000) });
      (n.Attachments || []).forEach((a) => files.push({ path: [code, "announcements", clean(a.FileName)].join("/"), url: `/d2l/api/le/${LE}/${ou}/news/${n.Id}/attachments/${a.FileId}`, size: a.Size, title: a.FileName, module: "Announcements", ou }));
    });
    manifest.courses.push(C);
  }

  if (CFG.mode === "plan") {
    return { files: files.length, sample: files.slice(0, 40).map((f) => f.path), warnings: manifest.courses.filter((c) => c.calendarWarning).map((c) => c.code + ": " + c.calendarWarning), links: manifest.courses.reduce((a, c) => a + c.links.length, 0), calendarEvents: manifest.courses.reduce((a, c) => a + c.calendar.length, 0), assignments: manifest.courses.reduce((a, c) => a + c.assignments.length, 0), knownBytes: files.reduce((a, f) => a + (f.size || 0), 0) };
  }

  // mode "zip": fetch every file, build one uncompressed zip (no library needed), download it once.
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0, total = 0, count = 0;
  const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const d = new Date(), dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const used = {};
  const add = (path, data) => {
    let p = path; for (let i = 2; used[p]; i++) p = path.replace(/(\.[^.\/]+)?$/, " (" + i + ")$1"); used[p] = 1;
    const name = enc.encode(p), crc = crc32(data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dosT, true); h.setUint16(12, dosD, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(h.buffer, name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dosT, true); c.setUint16(14, dosD, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(c.buffer, name);
    offset += 30 + name.length + data.length; count++;
  };
  for (const f of files) {
    if (f.size && f.size > maxFile) { manifest.skipped.push({ path: f.path, why: "larger than maxFileMB" }); continue; }
    try {
      const r = await fetch(f.url, { credentials: "include" });
      if (!r.ok) { manifest.skipped.push({ path: f.path, why: "HTTP " + r.status }); continue; }
      const b = new Uint8Array(await r.arrayBuffer());
      if (b.length > maxFile) { manifest.skipped.push({ path: f.path, why: "larger than maxFileMB" }); continue; }
      if (total + b.length > maxTotal) { manifest.skipped.push({ path: f.path, why: "zip reached maxTotalMB" }); continue; }
      total += b.length; f.bytes = b.length; add(f.path, b);
    } catch (e) { manifest.skipped.push({ path: f.path, why: String(e) }); }
  }
  manifest.files = files.filter((f) => f.bytes).map((f) => ({ path: f.path, title: f.title, module: f.module, bytes: f.bytes }));
  add("manifest.json", enc.encode(JSON.stringify(manifest, null, 1)));
  const cdSize = central.reduce((a, x) => a + x.byteLength, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, count, true); e.setUint16(10, count, true); e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  const blob = new Blob(parts.concat(central, [e.buffer]), { type: "application/zip" });
  const name = CFG.name || "brightspace-sync-" + new Date().toISOString().slice(0, 10) + ".zip";
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
  return { downloaded: name, files: count - 1, megabytes: +(blob.size / 1048576).toFixed(1), skipped: manifest.skipped.length, skippedSample: manifest.skipped.slice(0, 10) };
}
