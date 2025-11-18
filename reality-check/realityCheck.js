import fs from "fs";

const logPath = "./reality-check/reality-checks.json";
if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, "[]");

const entry = {
  timestamp: new Date().toISOString(),
  checklist: {
    CURRENT_STATE: "",
    RISK: "",
    SMALLEST_SAFE_FIX: "",
    NEXT_STEP: ""
  }
};

const log = JSON.parse(fs.readFileSync(logPath, "utf8"));
log.push(entry);
fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
console.log("✅ Reality-check placeholder added:", entry.timestamp);
console.log("Edit /reality-check/reality-checks.json to fill in details.");
