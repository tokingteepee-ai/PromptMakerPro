export type TemplateMode = "template" | "agent" | "media";

export type TemplateMetadata = {
  label: string;
  description: string;
  category: string;
};

export const TEMPLATE_METADATA: Record<TemplateMode, TemplateMetadata> = {
  template: {
    label: "Prompt Template",
    description: "Single structured prompt template for a task or workflow.",
    category: "Prompt Templates",
  },
  agent: {
    label: "Prompt Agent",
    description: "Multi-step or persona-style agent prompt with a role, context, and workflow.",
    category: "Agents",
  },
  media: {
    label: "Media Blueprint",
    description: "Prompt blueprint tailored for media generation (video, image, audio, etc.).",
    category: "Media",
  },
};
