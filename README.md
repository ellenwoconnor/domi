# Domi

Give away things for free within your circles. See `CLAUDE.md` for stack and conventions, `docs/` for the spec and build plan.

## Run it locally

Domi is on Expo SDK 58, which the App Store Expo Go doesn't support, so it runs in a **development build** (your own "Expo Go" with Domi's native code). Install that once; after that you only rebuild when native dependencies change.

Prereqs: Node 20+, a Convex account, an iPhone with Developer Mode on (Settings → Privacy & Security → Developer Mode), and on the same Wi‑Fi as your Mac.

### 1. Backend
```sh
npm install
npm run dev:backend   # first run: log in, create the "domi" project; writes .env.local and seeds data. Leave it running.
```

### 2. Install the dev build on your iPhone (once)
Either:
- **Paid Apple Developer account (EAS, cloud build):**
  ```sh
  npx eas-cli@latest login
  npx eas-cli@latest device:create   # open the link on your iPhone to register it
  npm run build:dev:ios              # ~15 min; open the install link/QR on your iPhone when it finishes
  ```
- **Free Apple ID + Xcode on this Mac (local build, expires after 7 days):** plug in the iPhone, then
  ```sh
  npm run ios:device
  ```
  First time: in Xcode → Settings → Accounts, add your Apple ID; on the iPhone, trust the developer in Settings → General → VPN & Device Management.

### 3. Run
```sh
npm start             # in a second terminal; open the Domi app on your iPhone (or scan the QR code with the Camera)
```

You should see **Domi** and "Hello from Convex 👋".

```sh
npm test              # backend tests
npm run typecheck     # app + convex
```
