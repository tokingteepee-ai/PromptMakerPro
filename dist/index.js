// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";

// server/services/promptGenerator.ts
import Anthropic from "@anthropic-ai/sdk";
var anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
var MODEL_ALIASES = {
  "claude-sonnet-preferred": [
    "claude-3-7-sonnet-20250219"
  ]
};
var defaultAnthropicModel = "claude-sonnet-preferred";
var ACCURACY_SYSTEM_PROMPT = "You are optimizing AI prompt templates: enforce section headers, bullet clarity, guardrails, and zero fluff.";
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function resolveModelAlias(modelId) {
  return MODEL_ALIASES[modelId] || [modelId];
}
async function callAnthropicWithRetry(modelCandidates, systemPrompt, userPrompt) {
  let lastError;
  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i];
    try {
      console.log(`[promptGenerator] Attempting Anthropic API with model: ${model}`);
      const message = await anthropic.messages.create({
        model,
        max_tokens: 2e3,
        temperature: 0.2,
        top_p: 1,
        system: ACCURACY_SYSTEM_PROMPT + "\n\n" + systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ]
      });
      console.log(`[promptGenerator] Anthropic API call successful with model: ${model}`);
      const content = message.content[0];
      if (content.type === "text") {
        return { text: content.text, model };
      }
      throw new Error("Unexpected response format from Claude");
    } catch (error) {
      lastError = error;
      const status = error?.status;
      const errorType = error?.error?.error?.type;
      console.error(`[promptGenerator] Error with model ${model}:`, {
        status,
        type: errorType,
        message: error?.message
      });
      if (status === 404 && errorType === "not_found_error") {
        const requestId = error?.request_id || error?.error?.request_id;
        console.log(`[anthropic] candidate not found (404), skipping`, { modelId: model, request_id: requestId });
        continue;
      }
      if (status === 429 || status >= 500 && status < 600) {
        console.log(`[promptGenerator] Retryable error (${status}), backing off 400ms`);
        await sleep(400);
        try {
          const retryMessage = await anthropic.messages.create({
            model,
            max_tokens: 2e3,
            temperature: 0.2,
            top_p: 1,
            system: ACCURACY_SYSTEM_PROMPT + "\n\n" + systemPrompt,
            messages: [
              {
                role: "user",
                content: userPrompt
              }
            ]
          });
          console.log(`[promptGenerator] Retry successful with model: ${model}`);
          const content = retryMessage.content[0];
          if (content.type === "text") {
            return { text: content.text, model };
          }
        } catch (retryError) {
          console.error(`[promptGenerator] Retry failed for ${model}, trying next candidate`);
          lastError = retryError;
          continue;
        }
      }
      if (i < modelCandidates.length - 1) {
        console.log(`[promptGenerator] Non-retryable error, trying next candidate`);
        continue;
      }
    }
  }
  throw lastError || new Error("All model candidates exhausted");
}
async function generatePrompt(mode, formData, trustSettings) {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  console.log(`[promptGenerator] API key present: ${hasApiKey}`);
  if (!hasApiKey) {
    console.warn("[promptGenerator] ANTHROPIC_API_KEY not found, using mock generation");
    return {
      promptText: generateMockPrompt(mode, formData, trustSettings),
      usedMock: true
    };
  }
  const requestedModel = formData.aiModels || defaultAnthropicModel;
  const modelCandidates = resolveModelAlias(requestedModel);
  console.log(`[promptGenerator] Requested model: ${requestedModel}, candidates: ${modelCandidates.join(", ")}`);
  try {
    const systemPrompt = getSystemPrompt(mode, trustSettings);
    const userPrompt = getUserPrompt(mode, formData, trustSettings);
    const result = await callAnthropicWithRetry(modelCandidates, systemPrompt, userPrompt);
    return {
      promptText: result.text,
      resolvedModel: result.model,
      usedMock: false
    };
  } catch (error) {
    console.error("[promptGenerator] All Anthropic attempts failed:", error);
    console.log("[promptGenerator] Falling back to mock generation");
    return {
      promptText: generateMockPrompt(mode, formData, trustSettings),
      usedMock: true
    };
  }
}
function generateMockPrompt(mode, formData, trustSettings) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  if (mode === "template") {
    return `# ${formData.templateName || "AI Prompt Template"}

**Generated:** ${timestamp}
**Mode:** Prompt Template
**AI Models:** ${formData.aiModels || "Claude 3.5 Sonnet"}
**Industry:** ${formData.industry || "General"}

## Role Definition
You are an expert ${formData.tone || "professional"} communicator specializing in ${formData.industry || "various industries"}.

## Goal
${formData.goal || "Achieve the specified objective with precision and clarity"}

## Target Audience
${formData.targetAudience || "General audience"} (${formData.experienceLevel || "Intermediate"} level)

## Instructions
1. Create ${formData.outputFormat || "text"} content that delivers value
2. Focus on: ${formData.offer || "providing valuable insights"}
3. Maintain ${formData.outputLength || "medium"} length output
4. ${formData.citationRequired === "true" ? "Include citations and sources" : "Focus on original content"}

## Output Format
- Format: ${formData.outputFormat || "Text"}
- Length: ${formData.outputLength || "Medium (300-800 words)"}
- Accuracy Level: ${formData.accuracyLevel || "General"}
${formData.seoKeywords ? `- SEO Keywords: ${formData.seoKeywords}` : ""}

## Constraints
${formData.contentToAvoid ? `- Avoid: ${formData.contentToAvoid}` : ""}
${formData.customAvoid ? `- Also avoid: ${formData.customAvoid}` : ""}
${trustSettings.safetyMode ? "- Follow safety guidelines and ethical standards" : ""}

## Success Criteria
- Clear and structured output
- Meets target audience needs
- Achieves stated goal effectively`;
  }
  if (mode === "agent") {
    const tags = trustSettings.personaIntegrityTags?.join(", ") || "Professional, Ethical";
    return `# ${formData.agentTitle || "AI Media Agent"}

**Generated:** ${timestamp}
**Mode:** Prompt Engineer Agent
**Platform:** ${formData.mediaTool || "General Media Tool"}

## Agent Persona
You are a specialized AI agent for ${formData.mediaTool || "media creation"} with expertise in ${formData.specialization || "content generation"}.

### Core Identity
- **Role:** Expert ${formData.mediaTool || "Media"} Creator
- **Expertise Level:** ${formData.expertise || "Intermediate"}
- **Integrity Tags:** ${tags}

### Specialization
${formData.specialization || "General media content creation with focus on quality and engagement"}

### Behavioral Guidelines
1. Maintain professional standards
2. Follow platform-specific best practices
3. Ensure ethical content creation
4. Optimize for user engagement

### Technical Capabilities
- Platform: ${formData.mediaTool || "Various"}
- Output Types: ${trustSettings.outputContentType || "Media prompts"}
- Quality Standards: High-fidelity, production-ready

### Ethical Framework
${trustSettings.ethicalGuardrails ? "- Strict ethical guidelines enforced" : "- Standard ethical practices"}
${trustSettings.safetyMode ? "- Safety-first approach to content" : ""}
${trustSettings.consentSafeMode ? "- Respect user privacy and consent" : ""}`;
  }
  if (mode === "blueprint") {
    return `# ${formData.blueprintTitle || "Media Blueprint"}

**Generated:** ${timestamp}
**Mode:** Media Prompt Blueprint
**Platform:** ${formData.platform || "Midjourney"}

## Blueprint Prompt

${formData.subject || "Beautiful landscape scene"}

**Style:** ${formData.style || "photorealistic, cinematic"}
**Mood:** ${formData.mood || "inspiring, peaceful"}
**Use Case:** ${formData.useCase || "creative project"}

### Technical Parameters
- Resolution: ${formData.resolution || "1920x1080"}
- Aspect Ratio: ${formData.aspectRatio || "16:9"}
- File Type: ${formData.fileType || "PNG"}
- Export: ${formData.exportUseCase || "Digital"}
${formData.frameRate ? `- Frame Rate: ${formData.frameRate}` : ""}
${formData.audioBitrate ? `- Audio: ${formData.audioBitrate}` : ""}

### Platform-Specific Format
${formData.platform === "midjourney" ? "/imagine prompt:" : ""}
${formData.subject}, ${formData.style} style, ${formData.mood} mood, high quality, detailed
${formData.platform === "midjourney" ? "--ar " + (formData.aspectRatio || "16:9") : ""}

### Quality Modifiers
- Ultra detailed
- Professional quality
- ${trustSettings.mediaType || "static"} output
- Production ready`;
  }
  return "Mock prompt generated for unknown mode";
}
function getSystemPrompt(mode, trustSettings) {
  const basePrompt = `You are Prompt Maker, an expert AI prompt engineer specializing in creating highly effective, structured prompts for AI platforms and media generation tools.`;
  const safetyGuidelines = trustSettings.safetyMode ? `
SAFETY REQUIREMENTS:
- Reject any prompts that could generate harmful, unethical, or inappropriate content
- Ensure all outputs respect user privacy and consent
- Follow ${trustSettings.rubric} safety rubric standards
- Clarity level: ${trustSettings.clarityLevel}/5 - Make explanations appropriately clear
- Content style: ${trustSettings.proofVsOpinion === "proof" ? "Focus on facts and evidence" : trustSettings.proofVsOpinion === "opinion" ? "Include perspectives and viewpoints" : "Balance facts with perspectives"}
${trustSettings.consentSafeMode ? "- Ensure all outputs are consent-safe and respect data privacy" : ""}
${trustSettings.ethicalGuardrails ? "- Apply strict ethical guardrails to all generated content" : ""}` : "";
  const modeInstructions = {
    template: `
You are creating a structured prompt template optimized for Claude, GPT-4, and other LLMs.
The prompt should be:
- Highly structured with clear sections
- Include role definition, context, instructions, and output format
- Optimized for the specific AI models selected
- Include appropriate constraints and guidelines`,
    agent: `
You are creating an AI agent persona for media generation tools.
The agent prompt should:
- Define a clear persona with expertise and specialization
- Include behavioral guidelines and communication style
- Specify technical capabilities and limitations
- Be optimized for the selected media tool platform
- Include integrity tags and ethical guidelines`,
    blueprint: `
You are creating a media prompt blueprint ready for direct use in AI media platforms.
The blueprint should:
- Be formatted for direct copy-paste into the target platform
- Include all necessary technical parameters and specifications
- Use platform-specific syntax and keywords
- Include style, mood, and aesthetic descriptions
- Be production-ready without requiring edits`
  };
  return `${basePrompt}${safetyGuidelines}${modeInstructions[mode] || ""}`;
}
function getUserPrompt(mode, formData, trustSettings) {
  switch (mode) {
    case "template":
      return generateTemplatePrompt(formData, trustSettings);
    case "agent":
      return generateAgentPrompt(formData, trustSettings);
    case "blueprint":
      return generateBlueprintPrompt(formData, trustSettings);
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
}
function generateTemplatePrompt(data, trustSettings) {
  return `Create a comprehensive prompt template with the following specifications:

GOAL: ${data.goal}
TARGET AUDIENCE: ${data.targetAudience}
TONE/STYLE: ${data.tone}
KEY VALUE/OFFER: ${data.offer}

ADDITIONAL REQUIREMENTS:
- Template Name: ${data.templateName || "Not specified"}
- Optimized for AI Models: ${data.aiModels || "Claude 3.5 Sonnet"}
- Industry/Niche: ${data.industry || "General"}
- Audience Experience Level: ${data.experienceLevel || "Intermediate"}
- Output Format: ${data.outputFormat || "Text"}
- Output Length: ${data.outputLength || "medium"}
- Content to Avoid: ${data.contentToAvoid || "None specified"}${data.customAvoid ? `, ${data.customAvoid}` : ""}
- Accuracy Level: ${data.accuracyLevel || "general"}
- SEO Keywords: ${data.seoKeywords || "None specified"}
- Citations Required: ${data.citationRequired === "true" ? "Yes" : "No"}
- Output Content Type: ${trustSettings.outputContentType || "Text article"}

Generate a complete, production-ready prompt template that:
1. Starts with a clear role definition for the AI
2. Provides comprehensive context and background
3. Includes step-by-step instructions
4. Specifies the exact output format and structure
5. Sets appropriate constraints and guidelines
6. Includes examples where helpful
7. Ends with clear success criteria

Format the prompt with clear section headers using markdown. Make it ready to copy and paste directly into Claude or GPT-4.`;
}
function generateAgentPrompt(data, trustSettings) {
  const integrityTags = trustSettings.personaIntegrityTags?.join(", ") || "None";
  return `Create an AI agent persona for media generation with these specifications:

AGENT TITLE: ${data.agentTitle}
MEDIA TOOL: ${data.mediaTool}
SPECIALIZATION: ${data.specialization}
EXPERTISE LEVEL: ${data.expertise}

TRUST & SAFETY:
- Persona Integrity Tags: ${integrityTags}
- Ethical Guardrails: ${trustSettings.ethicalGuardrails ? "Enabled" : "Standard"}
- Output Content Type: ${trustSettings.outputContentType || "Media prompt"}

Generate a comprehensive agent persona that includes:

1. **Agent Identity & Role**
   - Clear persona name and title
   - Professional background and expertise
   - Communication style and personality traits

2. **Specialization & Capabilities**
   - Core competencies in ${data.mediaTool}
   - Specific technical skills
   - Creative approach and methodology

3. **Behavioral Guidelines**
   - How the agent interacts with users
   - Problem-solving approach
   - Quality standards and best practices

4. **Technical Specifications**
   - Platform-specific optimizations for ${data.mediaTool}
   - Output formats and parameters
   - Performance expectations

5. **Ethical Framework**
   - Content guidelines and restrictions
   - User safety considerations
   - Creative boundaries

Format as a complete agent prompt ready for deployment in ${data.mediaTool} workflows.`;
}
function generateBlueprintPrompt(data, trustSettings) {
  return `Create a production-ready media prompt blueprint for ${data.platform}:

PROMPT TITLE: ${data.blueprintTitle}
TARGET PLATFORM: ${data.platform}
CONTENT FOCUS: ${data.subject}
STYLE/GENRE: ${data.style}
MOOD/EMOTION: ${data.mood}
USE CASE: ${data.useCase}

OUTPUT SPECIFICATIONS:
- Resolution: ${data.resolution || "Platform default"}
- Aspect Ratio: ${data.aspectRatio || "Platform default"}
- File Type: ${data.fileType || "Platform default"}
- Export Use Case: ${data.exportUseCase || "General"}
${data.frameRate ? `- Frame Rate: ${data.frameRate}` : ""}
${data.audioBitrate ? `- Audio Bitrate: ${data.audioBitrate}` : ""}
- Packaging: ${data.packaging || "Single File"}
- Media Type: ${trustSettings.mediaType || "static"}
- Output Content Type: ${trustSettings.outputContentType || "Image/graphic prompt"}

Generate a complete, copy-paste ready prompt for ${data.platform} that:

1. Uses platform-specific syntax and keywords
2. Includes all technical parameters in the correct format
3. Incorporates artistic and stylistic descriptions
4. Specifies quality and output requirements
5. Includes any platform-specific optimizations

FORMAT REQUIREMENTS:
- Start with the main subject/scene description
- Add style modifiers using platform-appropriate syntax
- Include technical parameters using correct formatting
- Add quality and enhancement keywords
- End with any negative prompts or exclusions if applicable

Make the prompt immediately usable in ${data.platform} without any editing required. If the platform uses specific syntax (like --parameters for Midjourney), use the correct format.`;
}

// server/storage.ts
import { nanoid } from "nanoid";
var MemStorage = class {
  prompts = /* @__PURE__ */ new Map();
  async createPrompt(promptData) {
    const id = nanoid();
    const prompt = {
      id,
      mode: promptData.mode,
      title: promptData.title,
      promptText: promptData.promptText,
      formData: promptData.formData,
      trustSettings: promptData.trustSettings,
      trustScore: promptData.trustScore ?? null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.prompts.set(id, prompt);
    return prompt;
  }
  async getPrompt(id) {
    return this.prompts.get(id) || null;
  }
  async getAllPrompts() {
    return Array.from(this.prompts.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async getPromptsByMode(mode) {
    return Array.from(this.prompts.values()).filter((p) => p.mode === mode).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async deletePrompt(id) {
    return this.prompts.delete(id);
  }
};
var storage = new MemStorage();

// server/guards/modelGate.ts
var makeErr = (status, code, message) => Object.assign(new Error(message), { status, code });
function assertModelAvailable(modelId, registry) {
  if (!modelId) {
    return;
  }
  const s = registry[modelId]?.status ?? "unknown";
  if (s !== "available") {
    throw makeErr(409, "MODEL_UNAVAILABLE", "Selected model is unavailable.");
  }
}

// server/services/modelRegistry.ts
var modelRegistry = {
  "claude-3-5-sonnet-20241022": {
    status: "available"
  },
  "gpt-4-turbo": {
    status: "unavailable",
    reason: "Model not configured in this environment"
  },
  "gpt-3.5-turbo": {
    status: "unavailable",
    reason: "Model not configured in this environment"
  }
};
async function getModelRegistry() {
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  if (!hasAnthropicKey) {
    modelRegistry["claude-3-5-sonnet-20241022"] = {
      status: "unavailable",
      reason: "ANTHROPIC_API_KEY not configured",
      lastChecked: /* @__PURE__ */ new Date()
    };
  } else {
    modelRegistry["claude-3-5-sonnet-20241022"] = {
      status: "available",
      lastChecked: /* @__PURE__ */ new Date()
    };
  }
  return modelRegistry;
}

// server/publishing/state.ts
var PublishingStateMachine = class {
  currentState;
  history = [];
  metadata = {};
  constructor(initialState = "DRAFT" /* DRAFT */) {
    this.currentState = initialState;
  }
  /**
   * Get the current state
   */
  getState() {
    return this.currentState;
  }
  /**
   * Get the state history
   */
  getHistory() {
    return [...this.history];
  }
  /**
   * Get metadata
   */
  getMetadata() {
    return { ...this.metadata };
  }
  /**
   * Set metadata
   */
  setMetadata(key, value) {
    this.metadata[key] = value;
  }
  /**
   * Transition to a new state
   */
  transition(to, metadata) {
    const validTransitions = {
      ["DRAFT" /* DRAFT */]: ["PREFLIGHT" /* PREFLIGHT */],
      ["PREFLIGHT" /* PREFLIGHT */]: ["READY_TO_PUBLISH" /* READY_TO_PUBLISH */, "FAILED" /* FAILED */],
      ["READY_TO_PUBLISH" /* READY_TO_PUBLISH */]: ["PUBLISHED" /* PUBLISHED */, "FAILED" /* FAILED */],
      ["PUBLISHED" /* PUBLISHED */]: ["DRAFT" /* DRAFT */],
      // Can start new draft after publishing
      ["FAILED" /* FAILED */]: ["DRAFT" /* DRAFT */, "PREFLIGHT" /* PREFLIGHT */]
      // Can retry from failed state
    };
    const allowedTransitions = validTransitions[this.currentState] || [];
    if (!allowedTransitions.includes(to)) {
      return false;
    }
    this.history.push({
      from: this.currentState,
      to,
      timestamp: /* @__PURE__ */ new Date(),
      metadata
    });
    this.currentState = to;
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        this.setMetadata(key, value);
      });
    }
    return true;
  }
  /**
   * Check if a transition is valid
   */
  canTransition(to) {
    const validTransitions = {
      ["DRAFT" /* DRAFT */]: ["PREFLIGHT" /* PREFLIGHT */],
      ["PREFLIGHT" /* PREFLIGHT */]: ["READY_TO_PUBLISH" /* READY_TO_PUBLISH */, "FAILED" /* FAILED */],
      ["READY_TO_PUBLISH" /* READY_TO_PUBLISH */]: ["PUBLISHED" /* PUBLISHED */, "FAILED" /* FAILED */],
      ["PUBLISHED" /* PUBLISHED */]: ["DRAFT" /* DRAFT */],
      ["FAILED" /* FAILED */]: ["DRAFT" /* DRAFT */, "PREFLIGHT" /* PREFLIGHT */]
    };
    const allowedTransitions = validTransitions[this.currentState] || [];
    return allowedTransitions.includes(to);
  }
  /**
   * Reset the state machine
   */
  reset() {
    this.currentState = "DRAFT" /* DRAFT */;
    this.history = [];
    this.metadata = {};
  }
};

// server/publishing/logger.ts
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var LOG_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
function getLogFileName() {
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `publishing-${year}-${month}-${day}.log`;
}
function getLogFilePath() {
  return path.join(LOG_DIR, getLogFileName());
}
async function logPreflight(event, data, level = "info") {
  const entry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    event,
    data,
    level
  };
  const logLine = JSON.stringify(entry) + "\n";
  const logPath = getLogFilePath();
  try {
    await fs.promises.appendFile(logPath, logLine, "utf8");
    if (process.env.NODE_ENV !== "production") {
      console.log(`[${level.toUpperCase()}] ${event}:`, data);
    }
  } catch (error) {
    console.error("Failed to write log:", error);
  }
}

// server/publishing/preflight.ts
var existingTerms = {
  categories: /* @__PURE__ */ new Set([
    "business-marketing",
    "creative-writing",
    "technical-coding",
    "education-training",
    "data-analysis",
    "customer-support",
    "content-creation",
    "research-academic",
    "media-production",
    "general-purpose"
  ]),
  tags: /* @__PURE__ */ new Set([
    "template",
    "agent",
    "blueprint",
    "marketing",
    "email",
    "conversion",
    "assistant",
    "coding",
    "python",
    "midjourney",
    "product-photo",
    "ecommerce"
  ])
};
async function ensureTerms(input) {
  const result = {
    created: [],
    existing: []
  };
  for (const category of input.categories) {
    const normalizedCategory = category.toLowerCase().trim().replace(/\s+/g, "-");
    if (normalizedCategory) {
      if (existingTerms.categories.has(normalizedCategory)) {
        result.existing.push(normalizedCategory);
      } else {
        existingTerms.categories.add(normalizedCategory);
        result.created.push(normalizedCategory);
        await logPreflight("term_created", {
          type: "category",
          value: normalizedCategory
        });
      }
    }
  }
  for (const tag of input.tags) {
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, "-");
    if (normalizedTag) {
      if (existingTerms.tags.has(normalizedTag)) {
        result.existing.push(normalizedTag);
      } else {
        existingTerms.tags.add(normalizedTag);
        result.created.push(normalizedTag);
        await logPreflight("term_created", {
          type: "tag",
          value: normalizedTag
        });
      }
    }
  }
  return result;
}
function generateTitle(input) {
  const { mode, goal, category, agentName, platform, mediaStyle } = input;
  let title = "";
  switch (mode) {
    case "template":
      if (goal) {
        title = `${goal} Prompt Template`;
      } else if (category) {
        title = `${capitalizeWords(category.replace(/-/g, " "))} Template`;
      } else {
        title = "Custom Prompt Template";
      }
      break;
    case "agent":
      if (agentName) {
        title = `${agentName} - AI Assistant`;
      } else if (goal) {
        title = `${goal} Agent`;
      } else {
        title = "Custom AI Agent";
      }
      break;
    case "blueprint":
      if (platform && mediaStyle) {
        title = `${capitalizeWords(platform)} ${mediaStyle} Blueprint`;
      } else if (platform) {
        title = `${capitalizeWords(platform)} Media Blueprint`;
      } else if (mediaStyle) {
        title = `${mediaStyle} Creation Blueprint`;
      } else {
        title = "Media Generation Blueprint";
      }
      break;
    default:
      title = "Untitled Prompt";
  }
  if (title.length > 60) {
    title = title.substring(0, 57) + "...";
  }
  return title;
}
async function uniqueSlug(base, fetcher) {
  let slug = base.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (slug.length > 50) {
    slug = slug.substring(0, 50);
  }
  let isUnique = !await fetcher(slug);
  let attempts = 0;
  const maxAttempts = 10;
  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    const suffix = generateRandomSuffix(Math.min(attempts * 2, 8));
    const candidateSlug = `${slug}-${suffix}`;
    isUnique = !await fetcher(candidateSlug);
    if (isUnique) {
      slug = candidateSlug;
    }
    await logPreflight("slug_collision", {
      original: base,
      attempt: attempts,
      candidate: candidateSlug,
      success: isUnique
    });
  }
  if (!isUnique) {
    slug = `${slug}-${Date.now()}`;
  }
  return slug;
}
function buildPayload(input) {
  const { title, slug, content, categories, tags, meta = {} } = input;
  if (!title || !slug || !content) {
    throw new Error("Missing required fields: title, slug, or content");
  }
  if (categories.length === 0) {
    throw new Error("At least one category is required");
  }
  if (tags.length < 3) {
    throw new Error("At least 3 tags are required");
  }
  return {
    title: title.trim(),
    slug: slug.trim(),
    content: content.trim(),
    categories: categories.map((c) => c.toLowerCase().trim()),
    tags: tags.map((t) => t.toLowerCase().trim().replace(/\s+/g, "-")),
    meta: {
      ...meta,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0.0"
    }
  };
}
function capitalizeWords(str) {
  return str.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
function generateRandomSuffix(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// shared/wordpress-metadata.ts
var TEMPLATE_METADATA = {
  template: {
    label: "Prompt Template",
    description: "Single structured prompt template for a task or workflow.",
    category: "Prompt Templates"
  },
  agent: {
    label: "Prompt Agent",
    description: "Multi-step or persona-style agent prompt with a role, context, and workflow.",
    category: "Agents"
  },
  media: {
    label: "Media Blueprint",
    description: "Prompt blueprint tailored for media generation (video, image, audio, etc.).",
    category: "Media"
  }
};

// server/services/wordpressPublisher.ts
async function savePromptToWordPress(promptTitle, promptContent, templateMode) {
  const wpUsername = process.env.WP_USERNAME;
  const wpAppPassword = process.env.WP_APP_PASSWORD;
  if (wpUsername && !wpAppPassword || !wpUsername && wpAppPassword) {
    console.error("[WordPress] Partial credentials configured - missing username or password");
    return {
      success: false,
      error: "WordPress publishing service misconfigured. Please contact support."
    };
  }
  if (!wpUsername || !wpAppPassword) {
    console.warn("[WordPress] Credentials not configured - WP_USERNAME and WP_APP_PASSWORD required");
    return {
      success: false,
      error: "WordPress publishing is not currently available. Please contact support."
    };
  }
  const metadata = TEMPLATE_METADATA[templateMode];
  if (!metadata) {
    console.error("[WordPress] Invalid template mode provided:", templateMode);
    return {
      success: false,
      error: "Invalid template mode. Please select a valid template from the dropdown."
    };
  }
  const requestBody = {
    title: promptTitle,
    content: promptContent,
    status: "publish",
    "prompt-category": [metadata.category],
    "use-case": metadata.useCases,
    "ai-model": metadata.aiModels
  };
  try {
    console.log("=== WordPress POST Request Debug ===");
    console.log("[WordPress] 1. Request Body:", JSON.stringify(requestBody, null, 2));
    console.log("[WordPress] 2. Template Mode:", templateMode);
    console.log("[WordPress] 3. Metadata:", JSON.stringify(metadata, null, 2));
    console.log("[WordPress] 4. Username:", wpUsername ? `${wpUsername.substring(0, 3)}***` : "NOT SET");
    console.log("[WordPress] 5. Password:", wpAppPassword ? "***SET***" : "NOT SET");
    const authHeader = "Basic " + Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64");
    console.log("[WordPress] 6. Making POST request to:", "https://aifirstmovers.net/?promptinator_api=1");
    const response = await fetch("https://aifirstmovers.net/?promptinator_api=1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify(requestBody)
    });
    console.log("[WordPress] 7. Response Status:", response.status, response.statusText);
    console.log("[WordPress] 8. Response Headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    const responseText = await response.text();
    console.log("[WordPress] 9. Raw Response Text:", responseText);
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("[WordPress] 10. Parsed Response Data:", JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error("[WordPress] 11. JSON Parse Error:", parseError);
      console.error("[WordPress] 12. Response was not valid JSON");
      return {
        success: false,
        error: `Invalid response from WordPress: ${responseText.substring(0, 200)}`
      };
    }
    if (!response.ok) {
      console.error("[WordPress] 13. API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        errorCode: data.code,
        errorMessage: data.message,
        errorData: data.data,
        fullResponse: data
      });
      let errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
      if (data.data?.params) {
        errorMessage += ` | Invalid params: ${Object.keys(data.data.params).join(", ")}`;
      }
      if (data.code) {
        errorMessage += ` (${data.code})`;
      }
      console.error("[WordPress] 14. Final Error Message:", errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
    console.log("[WordPress] Prompt published successfully:", {
      id: data.id,
      url: data.link
    });
    return {
      success: true,
      id: data.id,
      url: data.link,
      title: data.title?.rendered || promptTitle
    };
  } catch (error) {
    console.error("[WordPress] Network/fetch error:", error);
    let errorMessage = "Connection error. Please check your internet connection.";
    if (error.message?.includes("ENOTFOUND") || error.message?.includes("ETIMEDOUT")) {
      errorMessage = "Cannot reach WordPress server. Please try again later.";
    } else if (error.message && !error.message.includes("fetch")) {
      errorMessage = error.message;
    }
    return {
      success: false,
      error: errorMessage
    };
  }
}
function validateWordPressPublish(title, content) {
  const errors = [];
  if (!title || title.trim().length === 0) {
    errors.push("Title cannot be empty");
  }
  if (title && title.length > 200) {
    errors.push("Title must be less than 200 characters");
  }
  if (!content || content.trim().length === 0) {
    errors.push("Content cannot be empty");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

// server/routes.ts
import { z } from "zod";

// server/routes/releases.ts
import express from "express";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import fs2 from "fs";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var router = express.Router();
var RELEASES_DIR = path2.resolve(__dirname2, "../../shared/releases");
router.get("/releases/:file", (req, res) => {
  try {
    const raw = req.params.file || "";
    const fileName = path2.basename(raw);
    const fullPath = path2.join(RELEASES_DIR, fileName);
    if (!fs2.existsSync(fullPath)) {
      return res.status(404).send("Not found");
    }
    const isZip = fileName.toLowerCase().endsWith(".zip");
    const isTarGz = fileName.toLowerCase().endsWith(".tar.gz");
    if (!isZip && !isTarGz) {
      return res.status(403).send("Forbidden");
    }
    res.download(fullPath, fileName, (err) => {
      if (err) {
        console.error("releases download error", err);
        if (!res.headersSent) res.status(500).send("Server error");
      }
    });
  } catch (err) {
    console.error("releases route error", err);
    return res.status(500).send("Server error");
  }
});
var releases_default = router;

// server/routes.ts
var USE_MOCKS = process.env.USE_MOCKS === "true";
var GENERATE_TIMEOUT_MS = Number(process.env.GENERATE_TIMEOUT_MS ?? 3e4);
function withTimeout(p, ms = GENERATE_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
function simpleClarityScore(text) {
  const t = text || "";
  const headingCount = (t.match(/^##s/mg) || []).length;
  const bulletLines = (t.match(/^s*(?:[-*]|d+.)s/mg) || []).length;
  const len = t.length;
  let score = 30;
  score += Math.min(headingCount, 5) * 10;
  score += Math.min(bulletLines, 8) * 3;
  if (len >= 400 && len <= 5e3) score += 20;
  else if (len >= 200) score += 10;
  if (score > 100) score = 100;
  if (score < 0) score = 0;
  return Math.round(score);
}
async function registerRoutes(app2) {
  app2.post("/api/generate", async (req, res) => {
    try {
      const { mode, formData, trustSettings } = req.body ?? {};
      console.log(`[API /api/generate] USE_MOCKS=${USE_MOCKS}, mode=${mode}`);
      if (USE_MOCKS) {
        console.log("[API /api/generate] Using routes.ts mock path (USE_MOCKS=true)");
        const promptText = `[MOCK ${mode?.toUpperCase() ?? "TEMPLATE"}]
Title: ${formData?.title ?? "Untitled"}
Goal: ${formData?.goal ?? "N/A"}
Task: ${formData?.task ?? "N/A"}
Context: ${formData?.context ?? "N/A"}
Constraints: ${JSON.stringify(trustSettings ?? {})}`;
        const trustScore2 = simpleClarityScore(promptText);
        const id2 = await storage.createPrompt({
          mode: mode || "template",
          title: formData?.title || `${mode} prompt`,
          promptText,
          formData: formData || {},
          trustSettings: trustSettings || {},
          trustScore: trustScore2
        });
        return res.status(200).json({
          ok: true,
          promptText,
          trustScore: trustScore2,
          trustBadgeEligible: trustScore2 >= 80,
          promptId: id2.id
        });
      }
      console.log("[API /api/generate] Taking real generation path, calling promptGenerator.ts");
      const generationPromise = generatePrompt(mode, formData, trustSettings);
      const result = await withTimeout(generationPromise);
      if (!result?.promptText?.trim()) throw new Error("EMPTY_PROMPT");
      const trustScore = simpleClarityScore(result.promptText);
      const id = await storage.createPrompt({
        mode,
        title: formData?.title || `${mode} prompt`,
        promptText: result.promptText,
        formData,
        trustSettings,
        trustScore
      });
      return res.status(200).json({
        ok: true,
        promptText: result.promptText,
        trustScore,
        trustBadgeEligible: trustScore >= 80,
        promptId: id.id,
        resolvedModel: result.resolvedModel,
        usedMock: result.usedMock
      });
    } catch (e) {
      const msg = e?.message === "TIMEOUT" ? "Generation timed out." : e?.message || "Generate failed";
      return res.status(400).json({ ok: false, error: msg });
    }
  });
  app2.post("/api/test", async (req, res) => {
    try {
      const { modelId, prompt, mode } = req.body;
      const registry = await getModelRegistry();
      assertModelAvailable(modelId, registry);
      res.status(200).json({
        ok: true,
        message: "Test completed successfully",
        mode,
        promptLength: prompt?.length || 0
      });
    } catch (e) {
      res.status(e.status ?? 500).json({
        ok: false,
        code: e.code,
        message: e.message
      });
    }
  });
  app2.get("/api/models", async (_req, res) => {
    try {
      const registry = await getModelRegistry();
      res.json({
        ok: true,
        models: registry
      });
    } catch (error) {
      console.error("Error fetching model registry:", error);
      res.status(500).json({
        ok: false,
        error: "INTERNAL_ERROR",
        message: "Failed to fetch model registry"
      });
    }
  });
  app2.post("/api/preflight", async (req, res) => {
    try {
      const { title, content, categories = [], tags = [], mode, metadata = {} } = req.body;
      const stateMachine = new PublishingStateMachine();
      stateMachine.transition("PREFLIGHT" /* PREFLIGHT */);
      const termsResult = await ensureTerms({ categories, tags });
      const finalTitle = title || generateTitle({
        mode,
        goal: metadata.goal,
        category: categories[0],
        agentName: metadata.agentName,
        platform: metadata.platform,
        mediaStyle: metadata.mediaStyle
      });
      const baseSlug = finalTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
      const slugChecker = async (slug) => {
        return false;
      };
      const finalSlug = await uniqueSlug(baseSlug, slugChecker);
      const validationErrors = [];
      const validationWarnings = [];
      if (categories.length === 0) {
        validationErrors.push("At least one category is required");
      }
      if (tags.length < 3) {
        validationErrors.push("At least 3 tags are required");
      }
      if (!content || content.length < 10) {
        validationWarnings.push("Content seems too short");
      }
      const isValid = validationErrors.length === 0;
      let payload = null;
      if (content && categories.length > 0 && tags.length >= 3) {
        payload = buildPayload({
          title: finalTitle,
          slug: finalSlug,
          content: content || "",
          categories,
          tags,
          meta: metadata
        });
      }
      await logPreflight("preflight_complete", {
        title: finalTitle,
        slug: finalSlug,
        termsCreated: termsResult.created.length,
        termsExisting: termsResult.existing.length,
        valid: isValid
      });
      if (isValid) {
        stateMachine.transition("READY_TO_PUBLISH" /* READY_TO_PUBLISH */);
      }
      res.json({
        success: true,
        title: finalTitle,
        slug: finalSlug,
        termsResult,
        payload,
        state: stateMachine.getState(),
        validation: {
          isValid,
          errors: validationErrors,
          warnings: validationWarnings
        }
      });
    } catch (error) {
      console.error("Preflight error:", error);
      res.status(500).json({
        success: false,
        error: "Preflight failed",
        details: error.message
      });
    }
  });
  app2.post("/api/draft", async (req, res) => {
    try {
      const { payload } = req.body;
      if (!payload) {
        return res.status(400).json({
          success: false,
          error: "Payload is required"
        });
      }
      const id = await storage.createPrompt({
        mode: "template",
        title: payload.title,
        promptText: payload.content,
        formData: payload.meta || {},
        trustSettings: {},
        trustScore: 0
      });
      await logPreflight("draft_created", {
        id,
        title: payload.title,
        slug: payload.slug
      });
      res.json({
        success: true,
        draftId: id,
        message: "Draft created successfully"
      });
    } catch (error) {
      console.error("Draft creation error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create draft",
        details: error.message
      });
    }
  });
  app2.post("/api/publish", async (req, res) => {
    try {
      const { payload, validation } = req.body;
      if (!payload) {
        return res.status(400).json({
          success: false,
          error: "Payload is required"
        });
      }
      if (!validation?.isValid) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validation?.errors || ["Cannot publish with validation errors"]
        });
      }
      const id = await storage.createPrompt({
        mode: payload.meta?.mode || "template",
        title: payload.title,
        promptText: payload.content,
        formData: payload.meta || {},
        trustSettings: {},
        trustScore: payload.meta?.trustScore || 0
      });
      await logPreflight("prompt_published", {
        id,
        title: payload.title,
        slug: payload.slug
      });
      res.json({
        success: true,
        publishedId: id,
        message: "Prompt published successfully",
        url: `/prompts/${id}`
      });
    } catch (error) {
      console.error("Publishing error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to publish",
        details: error.message
      });
    }
  });
  app2.get("/api/prompts", async (_req, res) => {
    try {
      const prompts = await storage.getAllPrompts();
      res.json({ prompts });
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({
        error: "Failed to fetch prompts",
        details: error.message
      });
    }
  });
  app2.get("/api/prompts/:id", async (req, res) => {
    try {
      const prompt = await storage.getPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      res.status(500).json({
        error: "Failed to fetch prompts",
        details: error.message
      });
    }
  });
  app2.post("/api/wordpress/publish", async (req, res) => {
    try {
      const wpPublishSchema = z.object({
        title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
        content: z.string().min(1, "Content is required").max(1e5, "Content is too large"),
        templateMode: z.enum(Object.keys(TEMPLATE_METADATA), {
          errorMap: () => ({ message: "Invalid template mode" })
        })
      });
      const parseResult = wpPublishSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((e) => e.message);
        console.warn("[API /api/wordpress/publish] Validation failed:", errors);
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: errors
        });
      }
      const { title, content, templateMode } = parseResult.data;
      const validation = validateWordPressPublish(title, content);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validation.errors
        });
      }
      const result = await savePromptToWordPress(title, content, templateMode);
      if (result.success) {
        console.log("[API /api/wordpress/publish] Success:", result);
        res.json(result);
      } else {
        console.error("[API /api/wordpress/publish] Failed:", result.error);
        const statusCode = result.error?.includes("Authentication") || result.error?.includes("credentials") ? 401 : result.error?.includes("Invalid") ? 400 : 500;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      console.error("[API /api/wordpress/publish] Unexpected error:", error);
      res.status(500).json({
        success: false,
        error: "Server error while publishing to WordPress"
      });
    }
  });
  app2.use(releases_default);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
