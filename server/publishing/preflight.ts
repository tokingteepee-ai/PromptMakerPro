/**
 * Publishing Preflight Module
 * Handles term validation, title generation, and slug uniqueness
 */

import { PublishingStateMachine, PublishingState } from './state';
import { logPreflight } from './logger';

export interface TermsInput {
  categories: string[];
  tags: string[];
}

export interface TermsResult {
  created: string[];
  existing: string[];
}

export interface TitleInput {
  mode: 'template' | 'agent' | 'blueprint';
  goal?: string;
  category?: string;
  agentName?: string;
  platform?: string;
  mediaStyle?: string;
}

export interface PostPayload {
  title: string;
  slug: string;
  content: string;
  categories: string[];
  tags: string[];
  meta: Record<string, unknown>;
}

/**
 * Mock database of existing terms (in production, this would query actual DB)
 */
const existingTerms = {
  categories: new Set<string>([
    'business-marketing',
    'creative-writing',
    'technical-coding',
    'education-training',
    'data-analysis',
    'customer-support',
    'content-creation',
    'research-academic',
    'media-production',
    'general-purpose'
  ]),
  tags: new Set<string>([
    'template',
    'agent',
    'blueprint',
    'marketing',
    'email',
    'conversion',
    'assistant',
    'coding',
    'python',
    'midjourney',
    'product-photo',
    'ecommerce'
  ])
};

/**
 * Ensure terms exist in the system (create if needed)
 */
export async function ensureTerms(input: TermsInput): Promise<TermsResult> {
  const result: TermsResult = {
    created: [],
    existing: []
  };

  // Process categories
  for (const category of input.categories) {
    const normalizedCategory = category.toLowerCase().trim().replace(/\s+/g, '-');
    if (normalizedCategory) {
      if (existingTerms.categories.has(normalizedCategory)) {
        result.existing.push(normalizedCategory);
      } else {
        // Simulate creating new category
        existingTerms.categories.add(normalizedCategory);
        result.created.push(normalizedCategory);
        
        await logPreflight('term_created', { 
          type: 'category', 
          value: normalizedCategory 
        });
      }
    }
  }

  // Process tags
  for (const tag of input.tags) {
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '-');
    if (normalizedTag) {
      if (existingTerms.tags.has(normalizedTag)) {
        result.existing.push(normalizedTag);
      } else {
        // Simulate creating new tag
        existingTerms.tags.add(normalizedTag);
        result.created.push(normalizedTag);
        
        await logPreflight('term_created', { 
          type: 'tag', 
          value: normalizedTag 
        });
      }
    }
  }

  return result;
}

/**
 * Generate a title based on input parameters
 */
export function generateTitle(input: TitleInput): string {
  const { mode, goal, category, agentName, platform, mediaStyle } = input;

  let title = '';

  switch (mode) {
    case 'template':
      if (goal) {
        title = `${goal} Prompt Template`;
      } else if (category) {
        title = `${capitalizeWords(category.replace(/-/g, ' '))} Template`;
      } else {
        title = 'Custom Prompt Template';
      }
      break;

    case 'agent':
      if (agentName) {
        title = `${agentName} - AI Assistant`;
      } else if (goal) {
        title = `${goal} Agent`;
      } else {
        title = 'Custom AI Agent';
      }
      break;

    case 'blueprint':
      if (platform && mediaStyle) {
        title = `${capitalizeWords(platform)} ${mediaStyle} Blueprint`;
      } else if (platform) {
        title = `${capitalizeWords(platform)} Media Blueprint`;
      } else if (mediaStyle) {
        title = `${mediaStyle} Creation Blueprint`;
      } else {
        title = 'Media Generation Blueprint';
      }
      break;

    default:
      title = 'Untitled Prompt';
  }

  // Ensure title length constraints
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }

  return title;
}

/**
 * Generate a unique slug with collision handling
 */
export async function uniqueSlug(
  base: string,
  fetcher: (slug: string) => Promise<boolean>
): Promise<string> {
  // Normalize the base slug
  let slug = base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens

  // Limit slug length
  if (slug.length > 50) {
    slug = slug.substring(0, 50);
  }

  // Check if slug exists
  let isUnique = !(await fetcher(slug));
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    
    // Generate a random suffix
    const suffix = generateRandomSuffix(Math.min(attempts * 2, 8));
    const candidateSlug = `${slug}-${suffix}`;
    
    isUnique = !(await fetcher(candidateSlug));
    
    if (isUnique) {
      slug = candidateSlug;
    }

    await logPreflight('slug_collision', {
      original: base,
      attempt: attempts,
      candidate: candidateSlug,
      success: isUnique
    });
  }

  if (!isUnique) {
    // Final fallback: use timestamp
    slug = `${slug}-${Date.now()}`;
  }

  return slug;
}

/**
 * Build the final payload for publishing
 */
export function buildPayload(input: {
  title: string;
  slug: string;
  content: string;
  categories: string[];
  tags: string[];
  meta?: Record<string, unknown>;
}): PostPayload {
  const { title, slug, content, categories, tags, meta = {} } = input;

  // Validate required fields
  if (!title || !slug || !content) {
    throw new Error('Missing required fields: title, slug, or content');
  }

  if (categories.length === 0) {
    throw new Error('At least one category is required');
  }

  if (tags.length < 3) {
    throw new Error('At least 3 tags are required');
  }

  return {
    title: title.trim(),
    slug: slug.trim(),
    content: content.trim(),
    categories: categories.map(c => c.toLowerCase().trim()),
    tags: tags.map(t => t.toLowerCase().trim().replace(/\s+/g, '-')),
    meta: {
      ...meta,
      created_at: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Helper function to capitalize words
 */
function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a random alphanumeric suffix
 */
function generateRandomSuffix(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}