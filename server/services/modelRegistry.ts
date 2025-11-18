export type ModelStatusType = 'available' | 'degraded' | 'unavailable';

export interface ModelStatus {
  status: ModelStatusType;
  reason?: string;
  lastChecked?: Date;
}

export interface ModelRegistry {
  [modelId: string]: ModelStatus;
}

// Default registry with models and their current status
const modelRegistry: ModelRegistry = {
  'claude-3-5-sonnet-20241022': {
    status: 'available'
  },
  'gpt-4-turbo': {
    status: 'unavailable',
    reason: 'Model not configured in this environment'
  },
  'gpt-3.5-turbo': {
    status: 'unavailable',
    reason: 'Model not configured in this environment'
  }
};

/**
 * Get the current model registry
 */
export async function getModelRegistry(): Promise<ModelRegistry> {
  // Check for ANTHROPIC_API_KEY to determine if Claude is available
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  
  if (!hasAnthropicKey) {
    modelRegistry['claude-3-5-sonnet-20241022'] = {
      status: 'unavailable',
      reason: 'ANTHROPIC_API_KEY not configured',
      lastChecked: new Date()
    };
  } else {
    modelRegistry['claude-3-5-sonnet-20241022'] = {
      status: 'available',
      lastChecked: new Date()
    };
  }
  
  return modelRegistry;
}

/**
 * Check if a specific model is available
 */
export async function isModelAvailable(modelId: string): Promise<boolean> {
  const registry = await getModelRegistry();
  const model = registry[modelId];
  return model?.status === 'available';
}

/**
 * Update model status (for testing or admin purposes)
 */
export function updateModelStatus(
  modelId: string, 
  status: ModelStatusType, 
  reason?: string
): void {
  modelRegistry[modelId] = {
    status,
    reason,
    lastChecked: new Date()
  };
}