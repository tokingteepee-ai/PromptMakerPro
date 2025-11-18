const makeErr = (status: number, code: string, message: string) => 
  Object.assign(new Error(message), { status, code });

export function assertModelAvailable(
  modelId: string | null | undefined, 
  registry: Record<string, { status: string }>
) {
  // Allow undefined modelId for mock generation fallback
  if (!modelId) {
    return; // Allow proceeding without a model (will use mock fallback)
  }
  
  const s = registry[modelId]?.status ?? "unknown";
  if (s !== "available") {
    throw makeErr(409, "MODEL_UNAVAILABLE", "Selected model is unavailable.");
  }
}