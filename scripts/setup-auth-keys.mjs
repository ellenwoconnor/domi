// One-time setup: generates the signing keys Convex Auth uses for session
// tokens and stores them on your Convex dev deployment.
// Run from the project root:  node scripts/setup-auth-keys.mjs
import { execFileSync } from "node:child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

function set(name, value) {
  execFileSync("npx", ["convex", "env", "set", name, "--", value], { stdio: ["ignore", "inherit", "inherit"] });
}
set("JWT_PRIVATE_KEY", privateKey.trimEnd().replace(/\n/g, " "));
set("JWKS", jwks);
console.log("Convex Auth keys are set. You only need to run this once per deployment.");
