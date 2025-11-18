/**
 * Reality-Check Mode
 * Run before build / deploy to prevent credit burn or drift.
 */
import fs from "fs";

const checklist = [
  "✅ CURRENT STATE: Describe the latest error or feature. (File + line)",
  "⚠️ RISK: Does this change hit paid APIs or rebuild the app?",
  "🛠️ SMALLEST SAFE FIX: One-line or single-file patch only.",
  "🧩 NEXT STEP: Exact command or file to touch next.",
];

console.log("\n=== Reality-Check Mode ===");
checklist.forEach((item, i) => console.log(`${i + 1}. ${item}`));

console.log("\nIf unsure, stop here and run mock mode:\n");
console.log("  export USE_MOCKS=true\n");
console.log("Then rebuild locally before hitting production.\n");

// Exit with success to continue the build
process.exit(0);