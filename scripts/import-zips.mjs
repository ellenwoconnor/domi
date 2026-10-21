#!/usr/bin/env node
// Builds the zipCodes table from GeoNames' US postal code file.
//
// 1. Download https://download.geonames.org/export/zip/US.zip and unzip it (gives US.txt).
//    GeoNames data is CC BY 4.0: credit "GeoNames (geonames.org)" in the app's About/legal screen.
// 2. node scripts/import-zips.mjs path/to/US.txt          -> writes zipCodes.jsonl
// 3. npx convex import --table zipCodes --replace --format jsonLines zipCodes.jsonl
//    (add --prod for the production deployment)
import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
const output = process.argv[3] ?? "zipCodes.jsonl";
if (!input) {
  console.error("usage: node scripts/import-zips.mjs US.txt [out.jsonl]");
  process.exit(1);
}

const seen = new Set();
const lines = [];
for (const row of readFileSync(input, "utf8").split("\n")) {
  // country, postal code, place name, admin name1, admin code1, admin name2, admin code2,
  // admin name3, admin code3, latitude, longitude, accuracy
  const cols = row.split("\t");
  if (cols.length < 11 || cols[0] !== "US") continue;
  const zip = cols[1].trim();
  if (!/^\d{5}$/.test(zip) || seen.has(zip)) continue;
  const lat = Number(cols[9]);
  const lng = Number(cols[10]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  seen.add(zip);
  lines.push(JSON.stringify({ zip, city: cols[2].trim(), state: cols[4].trim(), lat, lng }));
}
writeFileSync(output, lines.join("\n") + "\n");
console.log(`Wrote ${lines.length} zip codes to ${output}`);
