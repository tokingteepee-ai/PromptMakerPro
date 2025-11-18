export function generateOfflineMockPrompt(
  mode: string,
  data: Record<string, any>,
  settings: Record<string, any>
): string {
  const timestamp = new Date().toISOString();
  
  if (mode === 'template') {
    return `# ${data.templateName || 'AI Prompt Template'}

**Generated:** ${timestamp} (Offline Mode)
**AI Models:** ${data.aiModels || 'Claude 3.5 Sonnet'}
**Industry:** ${data.industry || 'General'}

## Role Definition
You are an expert ${data.tone || 'professional'} communicator specializing in ${data.industry || 'various industries'}.

## Goal
${data.goal || 'Achieve the specified objective with precision and clarity'}

## Target Audience
${data.targetAudience || 'General audience'} (${data.experienceLevel || 'Intermediate'} level)

## Instructions
1. Create ${data.outputFormat || 'text'} content that delivers value
2. Focus on: ${data.offer || 'providing valuable insights'}
3. Maintain ${data.outputLength || 'medium'} length output
4. ${data.citationRequired === 'true' ? 'Include citations and sources' : 'Focus on original content'}

## Output Format
- Format: ${data.outputFormat || 'Text'}
- Length: ${data.outputLength || 'Medium (300-800 words)'}
- Accuracy Level: ${data.accuracyLevel || 'General'}
${data.seoKeywords ? `- SEO Keywords: ${data.seoKeywords}` : ''}

## Constraints
${data.contentToAvoid ? `- Avoid: ${data.contentToAvoid}` : ''}
${data.customAvoid ? `- Also avoid: ${data.customAvoid}` : ''}
${settings.safetyMode ? '- Follow safety guidelines and ethical standards' : ''}

## Success Criteria
- Clear and structured output
- Meets target audience needs
- Achieves stated goal effectively`;
  }
  
  if (mode === 'agent') {
    const tags = settings.personaIntegrityTags?.join(', ') || 'Professional, Ethical';
    return `# ${data.agentTitle || 'AI Media Agent'}

**Generated:** ${timestamp} (Offline Mode)
**Platform:** ${data.mediaTool || 'General Media Tool'}

## Agent Persona
You are a specialized AI agent for ${data.mediaTool || 'media creation'} with expertise in ${data.specialization || 'content generation'}.

### Core Identity
- **Role:** Expert ${data.mediaTool || 'Media'} Creator
- **Expertise Level:** ${data.expertise || 'Intermediate'}
- **Integrity Tags:** ${tags}

### Specialization
${data.specialization || 'General media content creation with focus on quality and engagement'}

### Behavioral Guidelines
1. Maintain professional standards
2. Follow platform-specific best practices
3. Ensure ethical content creation
4. Optimize for user engagement

### Technical Capabilities
- Platform: ${data.mediaTool || 'Various'}
- Output Types: ${settings.outputContentType || 'Media prompts'}
- Quality Standards: High-fidelity, production-ready

### Ethical Framework
${settings.ethicalGuardrails ? '- Strict ethical guidelines enforced' : '- Standard ethical practices'}
${settings.safetyMode ? '- Safety-first approach to content' : ''}
${settings.consentSafeMode ? '- Respect user privacy and consent' : ''}`;
  }
  
  if (mode === 'blueprint') {
    return `# ${data.blueprintTitle || 'Media Blueprint'}

**Generated:** ${timestamp} (Offline Mode)
**Platform:** ${data.platform || 'Midjourney'}

## Blueprint Prompt

${data.subject || 'Beautiful landscape scene'}

**Style:** ${data.style || 'photorealistic, cinematic'}
**Mood:** ${data.mood || 'inspiring, peaceful'}
**Use Case:** ${data.useCase || 'creative project'}

### Technical Parameters
- Resolution: ${data.resolution || '1920x1080'}
- Aspect Ratio: ${data.aspectRatio || '16:9'}
- File Type: ${data.fileType || 'PNG'}
- Export: ${data.exportUseCase || 'Digital'}
${data.frameRate ? `- Frame Rate: ${data.frameRate}` : ''}
${data.audioBitrate ? `- Audio: ${data.audioBitrate}` : ''}

### Platform-Specific Format
${data.platform === 'midjourney' ? '/imagine prompt:' : ''}
${data.subject}, ${data.style} style, ${data.mood} mood, high quality, detailed
${data.platform === 'midjourney' ? '--ar ' + (data.aspectRatio || '16:9') : ''}

### Quality Modifiers
- Ultra detailed
- Professional quality
- ${settings.mediaType || 'static'} output
- Production ready`;
  }
  
  return '';
}