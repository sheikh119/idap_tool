import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key in .env.local");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const reads = [
  "users?select=id,name,role_name&limit=3",
  "reports?select=document_no,status&order=document_no",
  "v_report_summary?select=document_no,issue_count&limit=2",
  "app_settings?select=key,value",
];

for (const path of reads) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  console.log(path.split("?")[0], res.status, (await res.text()).slice(0, 300));
}

for (const [fn, body] of [
  ["fn_next_report_number", { p_project_id: "22222222-2222-2222-2222-000000000001", p_visit_date: "2026-10-09" }],
  ["api_report_workflow", {}],
]) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(body) });
  console.log(`rpc ${fn}`, res.status, (await res.text()).slice(0, 200));
}
