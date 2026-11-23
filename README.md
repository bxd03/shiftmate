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
