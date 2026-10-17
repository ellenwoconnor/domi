# Domi

Give away things for free within your circles. See `CLAUDE.md` for stack and conventions, `docs/` for the spec and build plan.

## Run it locally

Domi is on Expo SDK 57 so it runs in the current App Store version of **Expo Go**. (Native sign-in in M1 will need a development build; see `docs/build-plan.md`.)

Prereqs: Node 20+, a Convex account, Expo Go on your iPhone, phone on the same Wi‑Fi as your Mac.

```sh
npm install
npm run dev:backend   # terminal 1. First run: log in, create the "domi" project; writes .env.local and seeds data. Leave it running.
npm start             # terminal 2. Scan the QR code with the iPhone Camera app; it opens in Expo Go.
```

You should see **Domi** and "Hello from Convex 👋".

```sh
npm test              # backend tests
npm run typecheck     # app + convex
```
