// Offline test for d2l_sync.js: mocks the Brightspace API, runs discover/plan/zip, writes the zip to disk.
// Test-only: evaluates the local d2l_sync.js file from this folder, never remote code.
// Usage: node lms/test_d2l_sync.js <out.zip>   then check it with: python -c "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip(),z.namelist())" out.zip
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "d2l_sync.js"), "utf8");
const out = process.argv[2] || "test-sync.zip";
const API = {
  "/d2l/api/versions/": [{ ProductCode: "le", LatestVersion: "1.80" }, { ProductCode: "lp", LatestVersion: "1.47" }],
  "/d2l/api/lp/1.47/users/whoami": { FirstName: "Test" },
  "/d2l/api/lp/1.47/enrollments/myenrollments/?orgUnitTypeId=3": { PagingInfo: { HasMoreItems: false }, Items: [
    { OrgUnit: { Id: 101, Code: "OPS 500", Name: "Operations" }, Access: { CanAccess: true, IsActive: true, StartDate: "2026-09-01T00:00:00.000Z", EndDate: "2026-12-31T00:00:00.000Z" } },
    { OrgUnit: { Id: 99, Code: "OLD 100", Name: "Old course" }, Access: { CanAccess: true, IsActive: false, StartDate: "2024-01-01T00:00:00.000Z", EndDate: "2024-04-30T00:00:00.000Z" } }] },
  "/d2l/api/lp/1.47/courses/101": { Code: "OPS 500", Name: "Operations" },
  "/d2l/api/le/1.80/101/content/toc": { Modules: [{ Title: "Week 1", Topics: [
    { TopicId: 1, Title: "Course outline", TypeIdentifier: "File", Url: "/content/enforced/101/outline.pdf" },
    { TopicId: 2, Title: "Reading: Little's Law", TypeIdentifier: "Link", Url: "https://example.org/littles-law" }],
    Modules: [{ Title: "Case: Trauma / ER", Topics: [{ TopicId: 3, Title: "Case data", TypeIdentifier: "File", Url: "/content/enforced/101/data.xlsx" }] }] }] },
  "/d2l/api/le/1.80/101/calendar/events/": [{ Title: "Session 1", StartDateTime: "2026-10-17T20:30:00.000Z", EndDateTime: "2026-10-18T00:30:00.000Z", Description: "<p>Process mapping</p>" }],
  "/d2l/api/le/1.80/101/dropbox/folders/": [{ Id: 7, Name: "Assignment 1", DueDate: "2026-11-10T01:30:00.000Z", CustomInstructions: { Text: "Analyze the case." }, Attachments: [{ FileId: 70, FileName: "brief.docx", Size: 12 }] }],
  "/d2l/api/le/1.80/101/news/": [{ Id: 5, Title: "Welcome", StartDate: "2026-09-01T00:00:00.000Z", Body: { Text: "Hello class" }, Attachments: [] }],
};
const FILES = { "/d2l/api/le/1.80/101/content/topics/1/file": "PDF-OUTLINE", "/d2l/api/le/1.80/101/content/topics/3/file": "XLSX-DATA", "/d2l/api/le/1.80/101/dropbox/folders/7/attachments/70": "DOCX-BRIEF" };
global.location = { href: "https://lms.example.edu/d2l/home", origin: "https://lms.example.edu" };
global.fetch = async (u) => {
  if (u in API) return { ok: true, status: 200, json: async () => API[u] };
  if (u in FILES) return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(FILES[u]).buffer };
  return { ok: false, status: 404, json: async () => ({}) };
};
let saved = null;
global.URL.createObjectURL = (b) => { saved = b; return "blob:x"; };
global.URL.revokeObjectURL = () => {};
global.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
global.setTimeout = () => {};
eval(src + "\nglobal.cnpSync = cnpSync;");
(async () => {
  const d = await cnpSync({ mode: "discover" });
  console.log("discover:", JSON.stringify(d.courses.map((c) => [c.ou, c.code, c.current])));
  console.log("plan:", JSON.stringify(await cnpSync({ mode: "plan", courses: [101] })));
  const z = await cnpSync({ mode: "zip", courses: [101] });
  console.log("zip:", JSON.stringify(z));
  fs.writeFileSync(out, Buffer.from(await saved.arrayBuffer()));
})();
