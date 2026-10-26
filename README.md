# Mekarya Build Tracker

There are two versions here:

- **Theme-only (`theme/`), currently installed on the store.** Nothing to host. Builds are edited on each customer's page in Shopify admin, and customers sign in on `/pages/build-status` to see their status.
- **Shopify app (everything else).** Full dashboard and automatic emails, but it needs hosting. See below.

## Theme-only version

**Installed on Mekarya (btfgfc-f9.myshopify.com):**
- Customer fields (namespace `build`), shown on every customer page in admin under *Metafields*:
  - Build status (dropdown of all 14 stages)
  - Build project
  - Build: message to customer
  - Build: update history
  - Build: design revision rounds
  - Build: optional stages
- Theme **"Canyon V2 + Build Tracker"** (an unpublished copy of the live theme) with `sections/build-tracker.liquid`, two snippets, and `templates/page.build-status.json`
- Page **Build Status** (`/pages/build-status`) using that template

**How it works**
- Visitors can join the waitlist with their email. This creates a Shopify customer tagged `build-waitlist` who is subscribed to email.
- Customers sign in with their email (Shopify emails them a one-time code) and see their own build: current step, progress, revision rounds, your latest message, and history. Nobody can see anyone else's build.
- To update a build: Customers → open the customer → Metafields → change *Build status* and *Build: message to customer*. When the design goes back for changes, set status to *Revision design* and increase *revision rounds* by 1.

**Going live:** preview the "Canyon V2 + Build Tracker" theme, then publish it (Online Store → Themes), and add `/pages/build-status` to your menu. Any edits to the live theme made in the meantime are not in the copy. Alternatively, copy the four files in `theme/` into your live theme with the code editor.

**Emails on update (set up in Shopify Flow; not verified):** the theme can't send email by itself. One way to set it up:
1. When you update a build, also add the customer tag `build-update`.
2. In Shopify Flow, create a workflow:
   - Trigger: *Customer tags added*, with the condition that the tags include `build-update`
   - Action: send a Shopify Email marketing email (only reaches customers subscribed to email; waitlist sign-ups are)
   - Action: *Remove customer tags* `build-update`
3. If Flow offers a trigger for customer metafield changes, use that instead and skip the tag.

---

## Shopify app version

A Shopify app that gives you:

- **An admin dashboard inside Shopify** (Apps → Build Tracker) to add customers, move builds through stages, and post updates.
- **A customer page on your storefront** at `/apps/build-status` where customers join the waitlist, look up their build with their **build code + email**, and request their code if they forget it.
- **Automatic emails**: customers get an email every time their stage changes or you post a message (you can uncheck "Email this update" per update, or post internal notes).

## Stages

Core: Waitlist → Ready to scan → Scan processing → Design → Design ready to review ⇄ Revision design → Printing → Assembly → Ready to test fit

The design loop repeats as many times as needed. On "Design ready to review" the build page has two buttons: **Customer approved → Printing** and **Changes requested → Revision design**. Each revision is counted as a round, and customers see the round number.

Optional (turn on per build): Bodywork / mold prep → Molding → First unit sample → Production → Final finish

Stage names and customer-facing descriptions live in `app/lib/stages.ts`.

## Setup

1. Install [Shopify CLI](https://shopify.dev/docs/apps/tools/cli) and Node 22.12+.
2. `npm install`
3. `npm run dev`. The first time, it asks you to create or pick an app in your Shopify Partner / Dev Dashboard and a store to install it on.
4. Copy `.env.example` to `.env` and fill in the SMTP settings. Any SMTP provider works (Resend, Postmark, SendGrid, Mailgun, or a Gmail app password).
5. In the app, open **Setup** and send yourself a test email.
6. In Shopify, add a menu link to `/apps/build-status` under **Online Store → Navigation**.

### Going live

`npm run dev` only runs while your computer is on. To keep it running, host the app (Fly.io, Render, Railway or Heroku; there's a `Dockerfile`), then:

- Set the env vars from `.env.example`, plus `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL` and `SCOPES=write_app_proxy`.
- Point `application_url` in `shopify.app.toml` at your host and run `npm run deploy`.
- For production, switch Prisma from SQLite to Postgres or MySQL (`prisma/schema.prisma`), or put SQLite on a persistent volume.

## Where things are

| Path | What |
| --- | --- |
| `app/routes/app._index.tsx` | Builds list, with pipeline counts, search, and stage filter |
| `app/routes/app.builds.new.tsx` | Add a build |
| `app/routes/app.builds.$id.tsx` | Build page: quick stage buttons, post update, timeline, edit details |
| `app/routes/app.setup.tsx` | Tracker URL, email status, test email |
| `app/routes/proxy.tsx` | Storefront page (app proxy): sign-up, lookup, forgot code |
| `app/lib/tracker-page.ts` | HTML and CSS for the storefront page |
| `app/lib/email.server.ts` | Email templates and SMTP sending |
| `app/lib/builds.server.ts` | Saves an update and emails the customer |
