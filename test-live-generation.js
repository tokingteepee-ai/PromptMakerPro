// Live Test Script for Promptinator
// Tests: Generate → Preflight → Publish cycle

const testPayload = {
  mode: "template",
  formData: {
    title: "AI Workflow Audit", 
    goal: "Generate a concise prompt template for reviewing an AI workflow's accuracy and safety.",
    tone: "technical",
    audience: "internal developers",
    task: "Audit workflow",
    context: "Internal review process",
    quality: "professional"
  },
  trustSettings: {
    safetyMode: true,
    rubric: "strict",
    proofVsOpinion: "balanced",
    mediaType: "static",
    clarityLevel: 4,
    consentSafeMode: true,
    ethicalGuardrails: true,
    personaIntegrityTags: ["Respectful", "Transparency-Focused"]
  }
};

async function runLiveTest() {
  console.log("🚀 Starting LIVE TEST (USE_MOCKS=false)");
  console.log("⏱️  Timeout: 15 seconds per request\n");
  
  const baseUrl = "http://localhost:5000";
  
  // Test 1: Model Registry
  console.log("📍 Test 1: Checking Model Registry...");
  const start1 = Date.now();
  try {
    const modelsRes = await fetch(`${baseUrl}/api/models`);
    const models = await modelsRes.json();
    console.log(`✅ Model Registry: ${modelsRes.status} (${Date.now() - start1}ms)`);
    console.log(`   Models:`, models.models || models);
  } catch (e) {
    console.error(`❌ Model Registry failed:`, e.message);
  }
  
  // Test 2: Generate
  console.log("\n📍 Test 2: Live Generation...");
  const start2 = Date.now();
  try {
    const generateRes = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload)
    });
    const result = await generateRes.json();
    const elapsed = Date.now() - start2;
    
    if (generateRes.ok) {
      console.log(`✅ Generation: ${generateRes.status} (${elapsed}ms)`);
      console.log(`   Prompt length: ${result.promptText?.length || 0} chars`);
      console.log(`   Trust score: ${result.trustScore}`);
      console.log(`   Badge eligible: ${result.trustBadgeEligible}`);
      
      if (elapsed > 15000) {
        console.error("⚠️  WARNING: Response took longer than 15s!");
      }
      
      // Test 3: Preflight
      console.log("\n📍 Test 3: Publishing Preflight...");
      const start3 = Date.now();
      const preflightPayload = {
        title: testPayload.formData.title,
        content: result.promptText,
        categories: ["ai-tools"],
        tags: ["audit", "workflow", "safety"],
        mode: testPayload.mode,
        metadata: testPayload.formData
      };
      
      const preflightRes = await fetch(`${baseUrl}/api/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preflightPayload)
      });
      const preflight = await preflightRes.json();
      console.log(`✅ Preflight: ${preflightRes.status} (${Date.now() - start3}ms)`);
      console.log(`   Validation:`, preflight.validation?.isValid ? "VALID" : "INVALID");
      
      // Test 4: Publish (should work if model available)
      console.log("\n📍 Test 4: Publishing...");
      const start4 = Date.now();
      const publishRes = await fetch(`${baseUrl}/api/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: preflight.payload,
          validation: preflight.validation
        })
      });
      const publish = await publishRes.json();
      console.log(`${publishRes.status === 200 ? '✅' : '⚠️'} Publish: ${publishRes.status} (${Date.now() - start4}ms)`);
      if (publish.success) {
        console.log(`   Published URL:`, publish.url);
      } else if (publishRes.status === 409) {
        console.log(`   Model unavailable (expected if guards working)`);
      }
      
    } else {
      console.error(`❌ Generation failed: ${generateRes.status}`);
      console.error(`   Error:`, result.error || result.message);
    }
    
  } catch (e) {
    console.error(`❌ Test failed:`, e.message);
  }
  
  console.log("\n✨ Live test complete!");
}

// Run the test
runLiveTest().catch(console.error);