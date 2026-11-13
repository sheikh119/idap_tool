// End-to-end storage test.
//   1. Direct: buckets exist, upload -> signed URL -> download -> delete (needs SUPABASE_SECRET_KEY).
//   2. API:    issue image + report file endpoints on the running dev server, including failure cases.
// Usage (dev server running):  node scripts/test-storage.mjs   [BASE_URL=http://localhost:3000]
// Uses seeded ids from src/db/qc_seed_data.sql and removes everything it uploads.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const USERS = {
  ahsan: "11111111-1111-1111-1111-000000000005", // AE on NZE + RWP
  hira: "11111111-1111-1111-1111-000000000009", // no project access
};
const ISSUE_DRAFT = "77777777-7777-7777-7777-000000000016"; // NZE, only in draft R1
const ISSUE_APPROVED = "77777777-7777-7777-7777-000000000001"; // NZE, in APPROVED R2
const REPORT_DRAFT = "99999999-9999-9999-9999-000000000008"; // RWP R8 draft
const REPORT_APPROVED = "99999999-9999-9999-9999-000000000006"; // RWP R6 approved

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

let passed = 0;
let failed = 0;
function check(name, ok, info = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${ok || !info ? "" : `\n        ${info}`}`);
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
console.log("\n1. Supabase Storage (direct)");
// ---------------------------------------------------------------------------
for (const id of ["issue-images", "reports"]) {
  const { data, error } = await supabase.storage.getBucket(id);
  check(`bucket '${id}' exists and is private`, !error && data?.public === false, error?.message ?? `public=${data?.public}`);
}

const probe = `_selftest/${Date.now()}.png`;
{
  const bucket = supabase.storage.from("issue-images");
  const up = await bucket.upload(probe, PNG, { contentType: "image/png" });
  check("upload PNG", !up.error, up.error?.message);
  const signed = await bucket.createSignedUrl(probe, 60);
  check("create signed URL", Boolean(signed.data?.signedUrl), signed.error?.message);
  if (signed.data?.signedUrl) {
    const res = await fetch(signed.data.signedUrl);
    const bytes = Buffer.from(await res.arrayBuffer());
    check("signed URL returns the same bytes", res.ok && bytes.equals(PNG), `HTTP ${res.status}`);
  }
  const bad = await bucket.upload(`_selftest/${Date.now()}.txt`, Buffer.from("x"), { contentType: "text/plain" });
  check("bucket rejects text/plain", Boolean(bad.error), "upload unexpectedly succeeded");
  const rm = await bucket.remove([probe]);
  check("delete object", !rm.error, rm.error?.message);
}

// ---------------------------------------------------------------------------
console.log(`\n2. API on ${BASE}`);
// ---------------------------------------------------------------------------
async function call(path, { method = "GET", actor, form, json } = {}) {
  const headers = {};
  if (actor) headers["x-actor-id"] = actor;
  if (json) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: form ?? (json && JSON.stringify(json)) });
  const body = await res.json().catch(() => null);
  return { status: res.status, data: body?.data, error: body?.error };
}

function fileForm(buffer, type, name, extra = {}) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type }), name);
  for (const [key, value] of Object.entries(extra)) form.append(key, value);
  return form;
}

try {
  await fetch(`${BASE}/api/health`);
} catch {
  console.error(`Cannot reach ${BASE}. Start the dev server (npm run dev) and re-run.`);
  process.exit(1);
}

const cleanup = { images: [], reportFiles: [] };

// Issue images: happy path
{
  const up = await call(`/issues/${ISSUE_DRAFT}/images`, {
    method: "POST",
    actor: USERS.ahsan,
    form: fileForm(PNG, "image/png", "test-pixel.png", { caption: "storage test" }),
  });
  check("POST image -> 201", up.status === 201, JSON.stringify(up.error));
  const image = up.data;
  if (image) {
    cleanup.images.push({ issue: ISSUE_DRAFT, image });
    check(
      "path is <PROJECT>/<issue_id>/<image_id>.png",
      image.storage_path === `NZE-LHR/${ISSUE_DRAFT}/${image.id}.png`,
      image.storage_path,
    );
    check("row has caption, mime, size", image.caption === "storage test" && image.mime_type === "image/png" && image.file_size === PNG.length);

    const res = image.url ? await fetch(image.url) : null;
    check("signed url serves the image", res?.ok === true && Buffer.from(await res.arrayBuffer()).equals(PNG), `HTTP ${res?.status}`);

    const list = await call(`/issues/${ISSUE_DRAFT}/images`);
    check("GET images lists it with a url", list.data?.some((row) => row.id === image.id && row.url));

    const patched = await call(`/issues/${ISSUE_DRAFT}/images/${image.id}`, {
      method: "PATCH",
      actor: USERS.ahsan,
      json: { caption: "renamed" },
    });
    check("PATCH caption", patched.data?.caption === "renamed", JSON.stringify(patched.error));

    const detail = await call(`/issues/${ISSUE_DRAFT}`);
    check("issue image_count includes it", detail.data?.image_count >= 1);

    const del = await call(`/issues/${ISSUE_DRAFT}/images/${image.id}`, { method: "DELETE", actor: USERS.ahsan });
    check("DELETE image -> 200", del.status === 200, JSON.stringify(del.error));
    if (del.status === 200) cleanup.images.pop();
    const gone = await supabase.storage.from("issue-images").list(`NZE-LHR/${ISSUE_DRAFT}`);
    check("file removed from bucket", !gone.data?.some((object) => image.storage_path.endsWith(object.name)));
  }
}

// Issue images: failure cases
{
  const noActor = await call(`/issues/${ISSUE_DRAFT}/images`, { method: "POST", form: fileForm(PNG, "image/png", "a.png") });
  check("no acting user -> 401", noActor.status === 401, `${noActor.status}`);

  const noAccess = await call(`/issues/${ISSUE_DRAFT}/images`, {
    method: "POST",
    actor: USERS.hira,
    form: fileForm(PNG, "image/png", "a.png"),
  });
  check("user without project access -> 403", noAccess.status === 403, `${noAccess.status}`);

  const wrongType = await call(`/issues/${ISSUE_DRAFT}/images`, {
    method: "POST",
    actor: USERS.ahsan,
    form: fileForm(Buffer.from("hello"), "text/plain", "a.txt"),
  });
  check("text file -> 400 BAD_FILE_TYPE", wrongType.status === 400 && wrongType.error?.code === "BAD_FILE_TYPE", `${wrongType.status}`);

  const noFile = await call(`/issues/${ISSUE_DRAFT}/images`, { method: "POST", actor: USERS.ahsan, form: new FormData() });
  check("missing file -> 400 NO_FILE", noFile.status === 400 && noFile.error?.code === "NO_FILE", `${noFile.status}`);

  const unknownIssue = await call(`/issues/00000000-0000-0000-0000-000000000000/images`, {
    method: "POST",
    actor: USERS.ahsan,
    form: fileForm(PNG, "image/png", "a.png"),
  });
  check("unknown issue -> 404", unknownIssue.status === 404, `${unknownIssue.status}`);

  const frozen = await call(`/issues/${ISSUE_APPROVED}/images`, {
    method: "POST",
    actor: USERS.ahsan,
    form: fileForm(PNG, "image/png", "evidence.png"),
  });
  check("upload to issue in APPROVED report is allowed", frozen.status === 201, JSON.stringify(frozen.error));
  if (frozen.data) {
    cleanup.images.push({ issue: ISSUE_APPROVED, image: frozen.data });
    const del = await call(`/issues/${ISSUE_APPROVED}/images/${frozen.data.id}`, { method: "DELETE", actor: USERS.ahsan });
    check("delete it -> 422 IMAGES_FROZEN", del.status === 422 && del.error?.code === "IMAGES_FROZEN", `${del.status}`);
  }
}

// Report file
for (const [label, reportId] of [
  ["draft R8", REPORT_DRAFT],
  ["approved R6", REPORT_APPROVED],
]) {
  const up = await call(`/reports/${reportId}/file`, {
    method: "POST",
    actor: USERS.ahsan,
    form: fileForm(PDF, "application/pdf", "report.pdf"),
  });
  check(`POST report file (${label}) -> 201`, up.status === 201, JSON.stringify(up.error));
  if (!up.data) continue;
  cleanup.reportFiles.push(reportId);
  check(`path is <PROJECT>/<document_no>.pdf (${label})`, /^RWP-ROAD\/QC-RWP-ROAD-\d{4}-\d{3}\.pdf$/.test(up.data.path), up.data.path);

  const res = await fetch(up.data.download_url);
  check(`download url serves the PDF (${label})`, res.ok && Buffer.from(await res.arrayBuffer()).equals(PDF), `HTTP ${res.status}`);

  const report = await call(`/reports/${reportId}`);
  check(`reports.generated_file_path saved (${label})`, report.data?.generated_file_path === up.data.path);

  const del = await call(`/reports/${reportId}/file`, { method: "DELETE", actor: USERS.ahsan });
  check(`DELETE report file (${label})`, del.status === 200, JSON.stringify(del.error));
  if (del.status === 200) cleanup.reportFiles.pop();
}
{
  const missing = await call(`/reports/${REPORT_DRAFT}/file`);
  check("GET file when none -> 404", missing.status === 404, `${missing.status}`);
  const docx = await call(`/reports/${REPORT_DRAFT}/file`, {
    method: "POST",
    actor: USERS.ahsan,
    form: fileForm(PNG, "image/png", "not-a-report.png"),
  });
  check("image as report file -> 400", docx.status === 400, `${docx.status}`);
}

// ---------------------------------------------------------------------------
// Cleanup (frozen images can only be removed directly)
// ---------------------------------------------------------------------------
for (const { image } of cleanup.images) {
  await supabase.from("issue_images").delete().eq("id", image.id);
  await supabase.storage.from("issue-images").remove([image.storage_path]);
}
for (const reportId of cleanup.reportFiles) {
  const { data } = await supabase.from("reports").select("generated_file_path").eq("id", reportId).single();
  if (data?.generated_file_path) await supabase.storage.from("reports").remove([data.generated_file_path]);
  await supabase.from("reports").update({ generated_file_path: null }).eq("id", reportId);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
