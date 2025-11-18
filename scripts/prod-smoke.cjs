const { spawn } = require("child_process");
(async () => {
  // start prod server as child
  const child = spawn("node", ["dist/index.js"], {
    env: { ...process.env, NODE_ENV: "production", PORT: "5000" },
    stdio: ["ignore","ignore","ignore"]
  });

  // wait for readiness (<=20s)
  const deadline = Date.now() + 20000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const r = await fetch("http://127.0.0.1:5000/api/models");
      if (r.status === 200) { ready = true; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  if (!ready) {
    console.log("http_status:000");
    console.log("resolvedModel:N/A");
    console.log("usedMock:N/A");
    console.log("promptId_type:error");
    console.log("elapsed_ms:0");
    try { child.kill("SIGINT"); } catch {}
    process.exit(1);
  }

  // contract smoke for /api/generate
  const t0 = Date.now();
  let status = 0, o = {};
  try {
    const res = await fetch("http://127.0.0.1:5000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "template",
        formData: { title: "Prod smoke", goal: "Contract check", task: "Gen", context: "CI" },
        trustSettings: { sourceCitations: true, selfCheck: true, temperature: 0.2 }
      })
    });
    status = res.status;
    try { o = await res.json(); } catch {}
  } catch {}
  const elapsed = Date.now() - t0;

  // print EXACT five lines
  console.log("http_status:" + status);
  console.log("resolvedModel:" + (o.resolvedModel ?? "N/A"));
  console.log("usedMock:" + (o.usedMock ?? "N/A"));
  console.log("promptId_type:" + (typeof o.promptId));
  console.log("elapsed_ms:" + elapsed);

  try { child.kill("SIGINT"); } catch {}
  setTimeout(() => process.exit(status === 200 && typeof o.promptId === "string" ? 0 : 1), 150);
})().catch(() => {
  console.log("http_status:000");
  console.log("resolvedModel:N/A");
  console.log("usedMock:N/A");
  console.log("promptId_type:error");
  console.log("elapsed_ms:0");
  process.exit(1);
});
