import { create } from "zustand";

type ModelStatus = "available" | "degraded" | "unavailable" | "unknown";

type State = {
  modelId: string | null;
  modelRegistry: Record<string, { status: ModelStatus; displayName: string }>;
  promptText: string;
  preflightResult?: { issues: string[]; ok: boolean };
  isPreviewMode: boolean;
  setModelId: (id: string | null) => void;
  setPromptText: (t: string) => void;
  setRegistry: (r: State["modelRegistry"]) => void;
  setPreviewMode: (mode: boolean) => void;
  setPreflightResult: (result: State["preflightResult"]) => void;
};

export const usePromptinator = create<State>((set, get) => ({
  modelId: "claude-3-5-sonnet-latest",
  modelRegistry: {
    "claude-3-5-sonnet-latest": {
      status: "unavailable", // Will be updated based on actual API availability
      displayName: "Claude 3.5 Sonnet"
    },
    "gpt-4": {
      status: "unknown",
      displayName: "GPT-4"
    },
    "gpt-3.5-turbo": {
      status: "unknown", 
      displayName: "GPT-3.5 Turbo"
    }
  },
  promptText: "",
  isPreviewMode: false,
  setModelId: (id) => set({ modelId: id }),
  setPromptText: (t) => set({ promptText: t }),
  setRegistry: (r) => set({ modelRegistry: r }),
  setPreviewMode: (mode) => set({ isPreviewMode: mode }),
  setPreflightResult: (result) => set({ preflightResult: result })
}));

// Selectors (single source of truth)
export const useModelGate = () => {
  const { modelId, modelRegistry } = usePromptinator();
  if (!modelId) return { available: false, reason: "NO_MODEL_SELECTED" as const };
  const status = modelRegistry[modelId]?.status ?? "unknown";
  return {
    available: status === "available",
    reason:
      status === "unavailable"
        ? ("MODEL_UNAVAILABLE" as const)
        : status === "degraded"
        ? ("MODEL_DEGRADED" as const)
        : status === "unknown"
        ? ("MODEL_UNKNOWN" as const)
        : null,
  };
};