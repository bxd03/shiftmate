# Shiftmate

Shiftmate is a standalone web app for temporary warehouse workforce management.

## Features

- Dashboard and shift bookings
- Agency and warehouse setup with shift quotas
- Worker records and sign-up
- Booking review, attendance, cancellation rules, updates, and reports
- Public worker portal at `/signup`
- Owner-only admin access and shared Cloudflare D1 storage
- WhatsApp message copy helpers; no integrations with other web apps

## Development

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run build
npm start
```

The deployed Site uses the D1 database binding `DB` and owner identity environment variables `SHIFTMATE_OWNER_ID` and `SHIFTMATE_OWNER_EMAIL`. The database migration is in `drizzle/`. Do not commit runtime secrets or real worker records.

## Netlify deployment

Import the existing GitHub repository into Netlify and deploy the main branch. The root netlify.toml selects hosting as the base directory. Its build produces the worker portal at /signup, the admin sign-in at /, and the API functions. Netlify Database applies the PostgreSQL migration in hosting/netlify/database/migrations. If your team requires enabling Netlify Database, enable it before deploying.

Enable Netlify Identity in the project's Identity settings, select invite-only registration, and invite the workspace owner. Assign the **admin** role to the owner's Identity user, then sign in again. Worker registration is public and does not require an Identity account. Only users assigned the admin role can read or change the shared workspace.

The PostgreSQL workspace starts empty. Configure the real agencies, warehouses, shifts and agency quotas in the admin before advertising sign-up. Workers and bookings commit together with a revision check. The SQL view shiftmate_registrations exposes one row per booking. The original Sites installation uses a separate D1 database.
