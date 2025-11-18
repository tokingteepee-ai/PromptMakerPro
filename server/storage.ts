import { nanoid } from 'nanoid';

// Define simplified types for in-memory storage that work without Drizzle
export interface StoredPrompt {
  id: string;
  mode: 'template' | 'agent' | 'blueprint';
  title: string;
  promptText: string;
  trustScore: number | null;
  formData: Record<string, any>;
  trustSettings: Record<string, any>;
  createdAt: Date;
}

export interface IStorage {
  createPrompt(prompt: Omit<StoredPrompt, 'id' | 'createdAt'>): Promise<StoredPrompt>;
  getPrompt(id: string): Promise<StoredPrompt | null>;
  getAllPrompts(): Promise<StoredPrompt[]>;
  getPromptsByMode(mode: string): Promise<StoredPrompt[]>;
  deletePrompt(id: string): Promise<boolean>;
}

class MemStorage implements IStorage {
  private prompts: Map<string, StoredPrompt> = new Map();

  async createPrompt(promptData: Omit<StoredPrompt, 'id' | 'createdAt'>): Promise<StoredPrompt> {
    const id = nanoid();
    const prompt: StoredPrompt = {
      id,
      mode: promptData.mode,
      title: promptData.title,
      promptText: promptData.promptText,
      formData: promptData.formData,
      trustSettings: promptData.trustSettings,
      trustScore: promptData.trustScore ?? null,
      createdAt: new Date(),
    };
    
    this.prompts.set(id, prompt);
    return prompt;
  }

  async getPrompt(id: string): Promise<StoredPrompt | null> {
    return this.prompts.get(id) || null;
  }

  async getAllPrompts(): Promise<StoredPrompt[]> {
    return Array.from(this.prompts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPromptsByMode(mode: string): Promise<StoredPrompt[]> {
    return Array.from(this.prompts.values())
      .filter(p => p.mode === mode)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deletePrompt(id: string): Promise<boolean> {
    return this.prompts.delete(id);
  }
}

export const storage = new MemStorage();