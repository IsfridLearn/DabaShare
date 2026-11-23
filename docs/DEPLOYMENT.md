# Deployment

Status: **free-tier launch setup**. The app is hosted on Vercel (free Hobby plan, `*.vercel.app` address, no custom domain), with auth email sent through Gmail SMTP (free, no domain). The one Supabase project serves both development and the live site for now.

## Environments

| | Now | Later (when there's budget or a domain) |
|---|---|---|
| Supabase project | `DabaShare` (ref `zxjerdapfbufuimqhcgp`, Singapore, free tier): the live database | A second free project for development, so tests never touch real students |
| App | Vercel, built from the `main` branch | Same, plus a custom domain |
| Auth email | Gmail SMTP with an App Password | Brevo or Resend with a verified domain (better deliverability and branding) |

**While dev and live share one database:** `npm run test:e2e` and `npm run db:test:rls` create and delete their own `@e2e.test.invalid` users and roll back or clean up after themselves. They never touch real accounts. Still, run them only when needed, and create a separate dev project before real students arrive.

**Free-tier caveat:** Supabase pauses free projects after about a week with no activity. Opening the site wakes the project within a minute or so, and you can also restore it from the dashboard.

## 1. Deploy to Vercel (about 5 minutes, free)

1. Go to https://vercel.com/signup and sign up with **Continue with GitHub** (Hobby plan, no card needed).
2. Click **Add New… → Project** and **Import** the `IsfridLearn/DabaShare` repository. Grant Vercel access to it if asked.
3. Leave the framework preset as **Next.js** and the root directory as `./`.
4. Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://zxjerdapfbufuimqhcgp.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key from Supabase → Project Settings → API (the same one as in `.env.local`; it's safe to expose) |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app`, where `<your-project>` is the project name shown on the import screen, for example `https://dabashare.vercel.app` |

   Never add the `service_role` or secret key.
5. Click **Deploy**. When it finishes, open the address Vercel shows. If it differs from what you entered for `NEXT_PUBLIC_SITE_URL`:
   1. Fix the variable under Project → Settings → Environment Variables.
   2. Go to Deployments → ⋯ → **Redeploy**.
6. Tell Claude (or the next developer) the final address, so the Supabase auth URLs can be updated (step 3 below).

Every push to `main` redeploys automatically, and pushes to other branches get preview URLs.

## 2. Free email for sign-ups: Gmail SMTP (about 10 minutes)

Supabase's built-in email only reaches members of your Supabase organization, so students can't confirm their accounts without this. Gmail is free and needs no domain; it allows about 500 emails a day.

1. Create a **separate** Google account for the app, for example `dabashare.app@gmail.com`. Don't use your personal account.
2. In that account, go to Google Account → Security → turn on **2-Step Verification**.
3. Go to Google Account → Security → **App passwords** and create one named "Supabase". Copy the 16-character password. You won't see it again.
4. In Supabase → Authentication → **Emails** → **SMTP Settings**, turn on **Enable custom SMTP** and enter:
   - Sender email: the app's Gmail address
   - Sender name: `DabaShare`
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: the app's Gmail address
   - Password: the 16-character app password

   Then save.
5. Enter the password **only in the Supabase dashboard**. Never put it in the repo, `.env` files or chat.
6. Test it: sign up on the live site with an email that isn't in your Supabase organization, and check that the confirmation email arrives (look in spam too).

Once custom SMTP works, Supabase allows custom email templates on the free tier. The branded DabaShare templates are ready in `supabase/templates/`. Turning them on also requires the "Continue" step in `/auth/confirm` described in SECURITY.md, so do the two together.

## 3. Point Supabase auth at the live address

In Supabase → Authentication → **URL Configuration** (or with `supabase config push` from `supabase/config.toml`):

- Site URL: `https://<your-project>.vercel.app`
- Redirect URLs: `https://<your-project>.vercel.app/**` and `http://localhost:3000/**` (for local development)

Without this, confirmation and password-reset links bounce to the wrong place.

## 4. Before inviting real students

- [ ] Raise Auth `sign_in_sign_ups` and `token_verifications` above the per-IP default of 30 per 5 minutes (Authentication → Rate Limits), because whole classes share campus Wi-Fi IPs.
- [ ] Do a real signup on the live site from a phone: confirm the email, onboard, upload a photo, message a second account.
- [ ] Have someone review the privacy notice (`/privacy`), and add a contact email to it.
- [ ] Create a separate free Supabase project for development, and re-link the CLI to it.
- [ ] Back up: on the free tier there are no automatic backups you can restore, so export the database from the dashboard (Database → Backups or `supabase db dump`) before big changes.
- [ ] Optional, free: turn on Vercel Analytics or Speed Insights to watch errors and performance.

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Project URL and publishable key (Supabase → Project Settings → API).
3. Link the CLI once, in your own terminal:
   ```
   npx supabase login
   npx supabase link --project-ref <project ref>
   ```
4. `npm run db:push` applies new migrations, `npm run db:types` regenerates the types, and `npm run db:test:rls` should end with "N passed, 0 failed".
5. `npm run dev` and open http://localhost:3000.
6. Full end-to-end test: `npm run build && npm run start`, then in another terminal `E2E_PROJECT_REF=<project ref> npm run test:e2e`.
