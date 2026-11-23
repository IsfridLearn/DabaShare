// End-to-end test runner for the DEV project.
//
//   1. npm run build && npm run start      (in another terminal)
//   2. E2E_PROJECT_REF=<dev project ref> npm run test:e2e
//
// Creates 2 confirmed test users (e2e-1/2@e2e.test.invalid) with a random
// password through `supabase db query` on the LINKED project, runs the suite,
// and always deletes every test row afterwards. E2E_PROJECT_REF must match the
// linked project, so the suite can never run against production by accident.
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const linked = (() => {
  try {
    return readFileSync(`${root}supabase/.temp/project-ref`, "utf8").trim();
  } catch {
    return "";
  }
})();

if (!linked || process.env.E2E_PROJECT_REF !== linked) {
  console.error(
    `Refusing to run: set E2E_PROJECT_REF to the linked project's ref to confirm it is the DEV database.\n` +
      `Linked project: ${linked || "(none; run supabase link first)"}`,
  );
  process.exit(2);
}

// Only [A-Za-z0-9_-] plus a fixed suffix: safe to embed in SQL.
const password = `E2e-${randomBytes(12).toString("base64url")}7`;

// SQL goes through a temp file: multi-line arguments don't survive the Windows shell.
function sql(statement) {
  const dir = mkdtempSync(join(tmpdir(), "dabashare-e2e-"));
  const file = join(dir, "query.sql");
  writeFileSync(file, statement);
  try {
    return execFileSync("npx", ["supabase", "db", "query", "--remote", "--yes", "-f", file], {
      cwd: root,
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const CLEANUP = `
  delete from auth.users where email like '%@e2e.test.invalid';
  delete from public.reports where reporter_id is null;
  delete from public.skills s where s.created_by is null and s.id > 55
    and not exists (select 1 from public.student_skills ss where ss.skill_id = s.id)
    and not exists (select 1 from public.course_skills cs where cs.skill_id = s.id);`;

const CREATE_USERS = `
do $$
declare u uuid; i int;
begin
  for i in 1..2 loop
    u := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
      'e2e-' || i || '@e2e.test.invalid', extensions.crypt('${password}', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', 'E2E Student ' || i, 'university_id', '1', 'accepted_terms', 'true'),
      now(), now(), '', '', '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u::text, u, jsonb_build_object('sub', u::text, 'email', 'e2e-' || i || '@e2e.test.invalid', 'email_verified', true),
      'email', now(), now(), now());
  end loop;
end $$;`;

let status = 1;
try {
  sql(CLEANUP);
  sql(CREATE_USERS);
  const run = spawnSync(process.execPath, [fileURLToPath(new URL("./suite.mjs", import.meta.url))], {
    stdio: "inherit",
    env: { ...process.env, E2E_PASSWORD: password },
  });
  status = run.status ?? 1;
} finally {
  sql(CLEANUP);
  console.log("Test users and their data were removed.");
}
process.exit(status);
