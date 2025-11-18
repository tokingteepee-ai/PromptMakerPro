import { Request, Response } from "express";
import { assertModelAvailable } from "../guards/modelGate.js";
import { getModelRegistry } from "../services/modelRegistry.js";

export default async function handler(req: Request, res: Response) {
  try {
    const { modelId, prompt, mode } = req.body;
    const registry = await getModelRegistry();
    
    // Check model availability
    assertModelAvailable(modelId, registry);
    
    // Run test logic here
    // For now, just return success
    res.status(200).json({ 
      ok: true,
      message: "Test completed successfully",
      mode,
      promptLength: prompt?.length || 0
    });
  } catch (e: any) {
    res.status(e.status ?? 500).json({ 
      ok: false, 
      code: e.code, 
      message: e.message 
    });
  }
}