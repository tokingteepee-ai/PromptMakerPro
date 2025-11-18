(async () => {
  const t0 = Date.now();
  const res = await fetch("http://127.0.0.1:5000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "template",
      formData: { title: "Smoke", goal: "Contract check", task: "Gen", context: "CI" },
      trustSettings: { sourceCitations: true, selfCheck: true, temperature: 0.2 }
    })
  });
  const elapsed = Date.now() - t0;
  let o={}; try { o = await res.json(); } catch {}
  const ok = res.status === 200 && typeof o.promptId === "string";
  console.log("http_status:"+res.status);
  console.log("resolvedModel:"+(o.resolvedModel ?? "N/A"));
  console.log("usedMock:"+(o.usedMock ?? "N/A"));
  console.log("promptId_type:"+typeof o.promptId);
  console.log("elapsed_ms:"+elapsed);
  process.exit(ok ? 0 : 1);
})().catch(() => { console.log("http_status:000"); console.log("resolvedModel:N/A"); console.log("usedMock:N/A"); console.log("promptId_type:error"); console.log("elapsed_ms:0"); process.exit(1); });
