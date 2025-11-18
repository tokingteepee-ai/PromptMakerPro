import Anthropic from '@anthropic-ai/sdk';
import type { TrustSafetySettings, TemplateFormData, AgentFormData, BlueprintFormData } from '@shared/schema';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL_ALIASES: Record<string, string[]> = {
  'claude-sonnet-preferred': [
    'claude-3-7-sonnet-20250219'
  ]
};

const defaultAnthropicModel = 'claude-sonnet-preferred';

const ACCURACY_SYSTEM_PROMPT = 'You are optimizing AI prompt templates: enforce section headers, bullet clarity, guardrails, and zero fluff.';

interface GenerationResult {
  promptText: string;
  resolvedModel?: string;
  usedMock: boolean;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resolveModelAlias(modelId: string): string[] {
  return MODEL_ALIASES[modelId] || [modelId];
}

async function callAnthropicWithRetry(
  modelCandidates: string[],
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; model: string }> {
  let lastError: any;
  
  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i];
    
    try {
      console.log(`[promptGenerator] Attempting Anthropic API with model: ${model}`);
      
      const message = await anthropic.messages.create({
        model,
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 1.0,
        system: ACCURACY_SYSTEM_PROMPT + '\n\n' + systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });
      
      console.log(`[promptGenerator] Anthropic API call successful with model: ${model}`);
      const content = message.content[0];
      if (content.type === 'text') {
        return { text: content.text, model };
      }
      
      throw new Error('Unexpected response format from Claude');
    } catch (error: any) {
      lastError = error;
      const status = error?.status;
      const errorType = error?.error?.error?.type;
      
      console.error(`[promptGenerator] Error with model ${model}:`, {
        status,
        type: errorType,
        message: error?.message
      });
      
      if (status === 404 && errorType === 'not_found_error') {
        const requestId = error?.request_id || error?.error?.request_id;
        console.log(`[anthropic] candidate not found (404), skipping`, { modelId: model, request_id: requestId });
        continue;
      }
      
      if (status === 429 || (status >= 500 && status < 600)) {
        console.log(`[promptGenerator] Retryable error (${status}), backing off 400ms`);
        await sleep(400);
        
        try {
          const retryMessage = await anthropic.messages.create({
            model,
            max_tokens: 2000,
            temperature: 0.2,
            top_p: 1.0,
            system: ACCURACY_SYSTEM_PROMPT + '\n\n' + systemPrompt,
            messages: [
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          });
          
          console.log(`[promptGenerator] Retry successful with model: ${model}`);
          const content = retryMessage.content[0];
          if (content.type === 'text') {
            return { text: content.text, model };
          }
        } catch (retryError: any) {
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
  
  throw lastError || new Error('All model candidates exhausted');
}

export async function generatePrompt(
  mode: 'template' | 'agent' | 'blueprint',
  formData: Record<string, any>,
  trustSettings: TrustSafetySettings
): Promise<GenerationResult> {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  console.log(`[promptGenerator] API key present: ${hasApiKey}`);
  
  if (!hasApiKey) {
    console.warn('[promptGenerator] ANTHROPIC_API_KEY not found, using mock generation');
    return {
      promptText: generateMockPrompt(mode, formData, trustSettings),
      usedMock: true
    };
  }

  const requestedModel = formData.aiModels || defaultAnthropicModel;
  const modelCandidates = resolveModelAlias(requestedModel);
  
  console.log(`[promptGenerator] Requested model: ${requestedModel}, candidates: ${modelCandidates.join(', ')}`);

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
    console.error('[promptGenerator] All Anthropic attempts failed:', error);
    console.log('[promptGenerator] Falling back to mock generation');
    return {
      promptText: generateMockPrompt(mode, formData, trustSettings),
      usedMock: true
    };
  }
}

function generateMockPrompt(
  mode: string,
  formData: Record<string, any>,
  trustSettings: TrustSafetySettings
): string {
  const timestamp = new Date().toISOString();
  
  if (mode === 'template') {
    return `# ${formData.templateName || 'AI Prompt Template'}

**Generated:** ${timestamp}
**Mode:** Prompt Template
**AI Models:** ${formData.aiModels || 'Claude 3.5 Sonnet'}
**Industry:** ${formData.industry || 'General'}

## Role Definition
You are an expert ${formData.tone || 'professional'} communicator specializing in ${formData.industry || 'various industries'}.

## Goal
${formData.goal || 'Achieve the specified objective with precision and clarity'}

## Target Audience
${formData.targetAudience || 'General audience'} (${formData.experienceLevel || 'Intermediate'} level)

## Instructions
1. Create ${formData.outputFormat || 'text'} content that delivers value
2. Focus on: ${formData.offer || 'providing valuable insights'}
3. Maintain ${formData.outputLength || 'medium'} length output
4. ${formData.citationRequired === 'true' ? 'Include citations and sources' : 'Focus on original content'}

## Output Format
- Format: ${formData.outputFormat || 'Text'}
- Length: ${formData.outputLength || 'Medium (300-800 words)'}
- Accuracy Level: ${formData.accuracyLevel || 'General'}
${formData.seoKeywords ? `- SEO Keywords: ${formData.seoKeywords}` : ''}

## Constraints
${formData.contentToAvoid ? `- Avoid: ${formData.contentToAvoid}` : ''}
${formData.customAvoid ? `- Also avoid: ${formData.customAvoid}` : ''}
${trustSettings.safetyMode ? '- Follow safety guidelines and ethical standards' : ''}

## Success Criteria
- Clear and structured output
- Meets target audience needs
- Achieves stated goal effectively`;
  }
  
  if (mode === 'agent') {
    const tags = trustSettings.personaIntegrityTags?.join(', ') || 'Professional, Ethical';
    return `# ${formData.agentTitle || 'AI Media Agent'}

**Generated:** ${timestamp}
**Mode:** Prompt Engineer Agent
**Platform:** ${formData.mediaTool || 'General Media Tool'}

## Agent Persona
You are a specialized AI agent for ${formData.mediaTool || 'media creation'} with expertise in ${formData.specialization || 'content generation'}.

### Core Identity
- **Role:** Expert ${formData.mediaTool || 'Media'} Creator
- **Expertise Level:** ${formData.expertise || 'Intermediate'}
- **Integrity Tags:** ${tags}

### Specialization
${formData.specialization || 'General media content creation with focus on quality and engagement'}

### Behavioral Guidelines
1. Maintain professional standards
2. Follow platform-specific best practices
3. Ensure ethical content creation
4. Optimize for user engagement

### Technical Capabilities
- Platform: ${formData.mediaTool || 'Various'}
- Output Types: ${trustSettings.outputContentType || 'Media prompts'}
- Quality Standards: High-fidelity, production-ready

### Ethical Framework
${trustSettings.ethicalGuardrails ? '- Strict ethical guidelines enforced' : '- Standard ethical practices'}
${trustSettings.safetyMode ? '- Safety-first approach to content' : ''}
${trustSettings.consentSafeMode ? '- Respect user privacy and consent' : ''}`;
  }
  
  if (mode === 'blueprint') {
    return `# ${formData.blueprintTitle || 'Media Blueprint'}

**Generated:** ${timestamp}
**Mode:** Media Prompt Blueprint
**Platform:** ${formData.platform || 'Midjourney'}

## Blueprint Prompt

${formData.subject || 'Beautiful landscape scene'}

**Style:** ${formData.style || 'photorealistic, cinematic'}
**Mood:** ${formData.mood || 'inspiring, peaceful'}
**Use Case:** ${formData.useCase || 'creative project'}

### Technical Parameters
- Resolution: ${formData.resolution || '1920x1080'}
- Aspect Ratio: ${formData.aspectRatio || '16:9'}
- File Type: ${formData.fileType || 'PNG'}
- Export: ${formData.exportUseCase || 'Digital'}
${formData.frameRate ? `- Frame Rate: ${formData.frameRate}` : ''}
${formData.audioBitrate ? `- Audio: ${formData.audioBitrate}` : ''}

### Platform-Specific Format
${formData.platform === 'midjourney' ? '/imagine prompt:' : ''}
${formData.subject}, ${formData.style} style, ${formData.mood} mood, high quality, detailed
${formData.platform === 'midjourney' ? '--ar ' + (formData.aspectRatio || '16:9') : ''}

### Quality Modifiers
- Ultra detailed
- Professional quality
- ${trustSettings.mediaType || 'static'} output
- Production ready`;
  }
  
  return 'Mock prompt generated for unknown mode';
}

function getSystemPrompt(mode: string, trustSettings: TrustSafetySettings): string {
  const basePrompt = `You are Prompt Maker, an expert AI prompt engineer specializing in creating highly effective, structured prompts for AI platforms and media generation tools.`;
  
  const safetyGuidelines = trustSettings.safetyMode ? `
SAFETY REQUIREMENTS:
- Reject any prompts that could generate harmful, unethical, or inappropriate content
- Ensure all outputs respect user privacy and consent
- Follow ${trustSettings.rubric} safety rubric standards
- Clarity level: ${trustSettings.clarityLevel}/5 - Make explanations appropriately clear
- Content style: ${trustSettings.proofVsOpinion === 'proof' ? 'Focus on facts and evidence' : trustSettings.proofVsOpinion === 'opinion' ? 'Include perspectives and viewpoints' : 'Balance facts with perspectives'}
${trustSettings.consentSafeMode ? '- Ensure all outputs are consent-safe and respect data privacy' : ''}
${trustSettings.ethicalGuardrails ? '- Apply strict ethical guardrails to all generated content' : ''}` : '';

  const modeInstructions: Record<string, string> = {
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
- Be production-ready without requiring edits`,
  };
  
  return `${basePrompt}${safetyGuidelines}${modeInstructions[mode] || ''}`;
}

function getUserPrompt(mode: string, formData: Record<string, any>, trustSettings: TrustSafetySettings): string {
  switch (mode) {
    case 'template':
      return generateTemplatePrompt(formData as TemplateFormData, trustSettings);
    case 'agent':
      return generateAgentPrompt(formData as AgentFormData, trustSettings);
    case 'blueprint':
      return generateBlueprintPrompt(formData as BlueprintFormData, trustSettings);
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
}

function generateTemplatePrompt(data: TemplateFormData, trustSettings: TrustSafetySettings): string {
  return `Create a comprehensive prompt template with the following specifications:

GOAL: ${data.goal}
TARGET AUDIENCE: ${data.targetAudience}
TONE/STYLE: ${data.tone}
KEY VALUE/OFFER: ${data.offer}

ADDITIONAL REQUIREMENTS:
- Template Name: ${data.templateName || 'Not specified'}
- Optimized for AI Models: ${data.aiModels || 'Claude 3.5 Sonnet'}
- Industry/Niche: ${data.industry || 'General'}
- Audience Experience Level: ${data.experienceLevel || 'Intermediate'}
- Output Format: ${data.outputFormat || 'Text'}
- Output Length: ${data.outputLength || 'medium'}
- Content to Avoid: ${data.contentToAvoid || 'None specified'}${data.customAvoid ? `, ${data.customAvoid}` : ''}
- Accuracy Level: ${data.accuracyLevel || 'general'}
- SEO Keywords: ${data.seoKeywords || 'None specified'}
- Citations Required: ${data.citationRequired === 'true' ? 'Yes' : 'No'}
- Output Content Type: ${trustSettings.outputContentType || 'Text article'}

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

function generateAgentPrompt(data: AgentFormData, trustSettings: TrustSafetySettings): string {
  const integrityTags = trustSettings.personaIntegrityTags?.join(', ') || 'None';
  
  return `Create an AI agent persona for media generation with these specifications:

AGENT TITLE: ${data.agentTitle}
MEDIA TOOL: ${data.mediaTool}
SPECIALIZATION: ${data.specialization}
EXPERTISE LEVEL: ${data.expertise}

TRUST & SAFETY:
- Persona Integrity Tags: ${integrityTags}
- Ethical Guardrails: ${trustSettings.ethicalGuardrails ? 'Enabled' : 'Standard'}
- Output Content Type: ${trustSettings.outputContentType || 'Media prompt'}

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

function generateBlueprintPrompt(data: BlueprintFormData, trustSettings: TrustSafetySettings): string {
  return `Create a production-ready media prompt blueprint for ${data.platform}:

PROMPT TITLE: ${data.blueprintTitle}
TARGET PLATFORM: ${data.platform}
CONTENT FOCUS: ${data.subject}
STYLE/GENRE: ${data.style}
MOOD/EMOTION: ${data.mood}
USE CASE: ${data.useCase}

OUTPUT SPECIFICATIONS:
- Resolution: ${data.resolution || 'Platform default'}
- Aspect Ratio: ${data.aspectRatio || 'Platform default'}
- File Type: ${data.fileType || 'Platform default'}
- Export Use Case: ${data.exportUseCase || 'General'}
${data.frameRate ? `- Frame Rate: ${data.frameRate}` : ''}
${data.audioBitrate ? `- Audio Bitrate: ${data.audioBitrate}` : ''}
- Packaging: ${data.packaging || 'Single File'}
- Media Type: ${trustSettings.mediaType || 'static'}
- Output Content Type: ${trustSettings.outputContentType || 'Image/graphic prompt'}

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
