# Domi

Give away things for free within your circles. See `CLAUDE.md` for stack and conventions, `docs/` for the spec and build plan.

## Run it locally

Prereqs: Node 20+, the Expo Go app on your phone (same Wi‑Fi as your computer), a free Convex account.

```sh
npm install
npm run dev:backend   # first run: log in, create the "domi" project; writes .env.local and seeds data. Leave it running.
npm start             # in a second terminal; scan the QR code with your phone's camera (iOS) or Expo Go (Android)
```

You should see **Domi** and "Hello from Convex 👋" on your phone.

```sh
npm test              # backend tests
npm run typecheck     # app + convex
```
