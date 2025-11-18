/**
 * Publishing Preflight Unit Tests
 * Tests for state machine, term preflight, title generation, and slug safety
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  PublishingState,
  PublishingStateMachine,
  ensureTerms,
  generateTitle,
  uniqueSlug,
  buildPayload,
  logPreflight,
  readLogs
} from '../../server/publishing';

describe('Publishing Preflight Module', () => {
  
  describe('PublishingStateMachine', () => {
    let stateMachine: PublishingStateMachine;

    beforeEach(() => {
      stateMachine = new PublishingStateMachine();
    });

    it('should initialize with DRAFT state', () => {
      expect(stateMachine.getState()).toBe(PublishingState.DRAFT);
    });

    it('should handle happy path transitions: DRAFT → PREFLIGHT → READY_TO_PUBLISH → PUBLISHED', () => {
      // Start in DRAFT
      expect(stateMachine.getState()).toBe(PublishingState.DRAFT);

      // Transition to PREFLIGHT
      const toPreflight = stateMachine.transition(PublishingState.PREFLIGHT);
      expect(toPreflight).toBe(true);
      expect(stateMachine.getState()).toBe(PublishingState.PREFLIGHT);

      // Transition to READY_TO_PUBLISH
      const toReady = stateMachine.transition(PublishingState.READY_TO_PUBLISH);
      expect(toReady).toBe(true);
      expect(stateMachine.getState()).toBe(PublishingState.READY_TO_PUBLISH);

      // Transition to PUBLISHED
      const toPublished = stateMachine.transition(PublishingState.PUBLISHED);
      expect(toPublished).toBe(true);
      expect(stateMachine.getState()).toBe(PublishingState.PUBLISHED);

      // Verify history
      const history = stateMachine.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].from).toBe(PublishingState.DRAFT);
      expect(history[0].to).toBe(PublishingState.PREFLIGHT);
      expect(history[2].to).toBe(PublishingState.PUBLISHED);
    });

    it('should handle failure transitions and recovery', () => {
      // Go to PREFLIGHT
      stateMachine.transition(PublishingState.PREFLIGHT);
      
      // Transition to FAILED
      const toFailed = stateMachine.transition(PublishingState.FAILED);
      expect(toFailed).toBe(true);
      expect(stateMachine.getState()).toBe(PublishingState.FAILED);

      // Should be able to retry from FAILED state
      const retryPreflight = stateMachine.transition(PublishingState.PREFLIGHT);
      expect(retryPreflight).toBe(true);
      expect(stateMachine.getState()).toBe(PublishingState.PREFLIGHT);
    });

    it('should prevent invalid transitions', () => {
      // Cannot go directly from DRAFT to PUBLISHED
      const invalidTransition = stateMachine.transition(PublishingState.PUBLISHED);
      expect(invalidTransition).toBe(false);
      expect(stateMachine.getState()).toBe(PublishingState.DRAFT);

      // Move to PREFLIGHT
      stateMachine.transition(PublishingState.PREFLIGHT);
      
      // Cannot go back to DRAFT from PREFLIGHT
      const backToDraft = stateMachine.transition(PublishingState.DRAFT);
      expect(backToDraft).toBe(false);
      expect(stateMachine.getState()).toBe(PublishingState.PREFLIGHT);
    });
  });

  describe('ensureTerms', () => {
    it('should identify existing and new terms correctly', async () => {
      const input = {
        categories: ['business-marketing', 'new-category'],
        tags: ['template', 'new-tag', 'another-new-tag']
      };

      const result = await ensureTerms(input);

      // Check existing terms
      expect(result.existing).toContain('business-marketing');
      expect(result.existing).toContain('template');

      // Check created terms
      expect(result.created).toContain('new-category');
      expect(result.created).toContain('new-tag');
      expect(result.created).toContain('another-new-tag');
    });

    it('should handle missing terms gracefully', async () => {
      const input = {
        categories: ['completely-new-category'],
        tags: ['brand-new-tag-1', 'brand-new-tag-2', 'brand-new-tag-3']
      };

      const result = await ensureTerms(input);

      // All should be created as they don't exist
      expect(result.created).toHaveLength(4); // 1 category + 3 tags
      expect(result.existing).toHaveLength(0);
      
      // Verify they were created
      expect(result.created).toContain('completely-new-category');
      expect(result.created).toContain('brand-new-tag-1');
    });

    it('should normalize terms properly', async () => {
      const input = {
        categories: ['  Business Marketing  '], // with spaces
        tags: ['Template  ', '  UNIQUE TEST TAG  ', 'Another Unique Tag'] // various formatting
      };

      const result = await ensureTerms(input);

      // Should normalize to lowercase and trim
      expect(result.existing).toContain('business-marketing');
      expect(result.existing).toContain('template');
      
      // Tags should be hyphenated and created or existing
      const allTags = [...result.created, ...result.existing];
      expect(allTags).toContain('unique-test-tag');
      expect(allTags).toContain('another-unique-tag');
      
      // Verify normalization happened
      expect(allTags.every(tag => tag === tag.toLowerCase())).toBe(true);
      expect(allTags.every(tag => !tag.includes(' '))).toBe(true);
    });
  });

  describe('generateTitle', () => {
    it('should generate appropriate titles for template mode', () => {
      const title = generateTitle({
        mode: 'template',
        goal: 'Sales Email Conversion',
        category: 'business-marketing'
      });

      expect(title).toBe('Sales Email Conversion Prompt Template');
    });

    it('should generate appropriate titles for agent mode', () => {
      const title = generateTitle({
        mode: 'agent',
        agentName: 'Dr. Data',
        goal: 'Python Analytics'
      });

      expect(title).toBe('Dr. Data - AI Assistant');
    });

    it('should generate appropriate titles for blueprint mode', () => {
      const title = generateTitle({
        mode: 'blueprint',
        platform: 'midjourney',
        mediaStyle: 'Product Photography'
      });

      expect(title).toBe('Midjourney Product Photography Blueprint');
    });

    it('should truncate long titles', () => {
      const title = generateTitle({
        mode: 'template',
        goal: 'This is an extremely long goal that should definitely be truncated to fit within the 60 character limit for titles'
      });

      expect(title.length).toBeLessThanOrEqual(60);
      expect(title).toContain('...');
    });
  });

  describe('uniqueSlug', () => {
    it('should return base slug when no collision', async () => {
      const fetcher = vi.fn().mockResolvedValue(false); // No collision
      const slug = await uniqueSlug('my-awesome-title', fetcher);

      expect(slug).toBe('my-awesome-title');
      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher).toHaveBeenCalledWith('my-awesome-title');
    });

    it('should handle 3+ collisions with random suffixes', async () => {
      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(async (slug: string) => {
        callCount++;
        // First 3 calls return true (collision), 4th returns false
        return callCount <= 3;
      });

      const slug = await uniqueSlug('popular-title', fetcher);

      // Should have a suffix added
      expect(slug).toMatch(/^popular-title-[a-z0-9]+$/);
      expect(slug).not.toBe('popular-title');
      expect(fetcher).toHaveBeenCalledTimes(4); // Original + 3 collisions
    });

    it('should normalize slug properly', async () => {
      const fetcher = vi.fn().mockResolvedValue(false);
      const slug = await uniqueSlug('  My AWESOME Title!!!  ', fetcher);

      expect(slug).toBe('my-awesome-title');
    });

    it('should handle special characters and spaces', async () => {
      const fetcher = vi.fn().mockResolvedValue(false);
      const slug = await uniqueSlug('Title with $pecial Ch@rs & Spaces', fetcher);

      expect(slug).toBe('title-with-pecial-chrs-spaces');
      expect(slug).not.toMatch(/[^a-z0-9-]/); // Only lowercase letters, numbers, and hyphens
    });

    it('should limit slug length to 50 characters', async () => {
      const fetcher = vi.fn().mockResolvedValue(false);
      const longTitle = 'this-is-an-extremely-long-title-that-definitely-exceeds-fifty-characters-limit';
      const slug = await uniqueSlug(longTitle, fetcher);

      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it('should use timestamp fallback after max attempts', async () => {
      // Always return collision
      const fetcher = vi.fn().mockResolvedValue(true);
      
      const before = Date.now();
      const slug = await uniqueSlug('always-colliding', fetcher);
      const after = Date.now();

      // Should contain timestamp
      expect(slug).toMatch(/^always-colliding-\d+$/);
      
      // Extract timestamp and verify it's recent
      const timestamp = parseInt(slug.split('-').pop() || '0');
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('buildPayload', () => {
    it('should build valid payload with all required fields', () => {
      const payload = buildPayload({
        title: 'My Awesome Prompt',
        slug: 'my-awesome-prompt',
        content: 'This is the prompt content',
        categories: ['business-marketing'],
        tags: ['template', 'marketing', 'email', 'conversion']
      });

      expect(payload.title).toBe('My Awesome Prompt');
      expect(payload.slug).toBe('my-awesome-prompt');
      expect(payload.content).toBe('This is the prompt content');
      expect(payload.categories).toEqual(['business-marketing']);
      expect(payload.tags).toHaveLength(4);
      expect(payload.meta.created_at).toBeDefined();
      expect(payload.meta.version).toBe('1.0.0');
    });

    it('should throw error for missing required fields', () => {
      expect(() => buildPayload({
        title: '',
        slug: 'test-slug',
        content: 'content',
        categories: ['test'],
        tags: ['tag1', 'tag2', 'tag3']
      })).toThrow('Missing required fields');

      expect(() => buildPayload({
        title: 'Title',
        slug: 'slug',
        content: 'content',
        categories: [],
        tags: ['tag1', 'tag2', 'tag3']
      })).toThrow('At least one category is required');

      expect(() => buildPayload({
        title: 'Title',
        slug: 'slug',
        content: 'content',
        categories: ['category'],
        tags: ['tag1', 'tag2'] // Only 2 tags
      })).toThrow('At least 3 tags are required');
    });

    it('should normalize and clean input data', () => {
      const payload = buildPayload({
        title: '  My Title  ',
        slug: '  my-slug  ',
        content: '  Content  ',
        categories: ['  Category One  '],
        tags: ['  Tag One  ', 'Tag Two', 'tag-three'],
        meta: { custom: 'value' }
      });

      expect(payload.title).toBe('My Title');
      expect(payload.slug).toBe('my-slug');
      expect(payload.content).toBe('Content');
      expect(payload.categories[0]).toBe('category one');
      expect(payload.tags[0]).toBe('tag-one');
      expect(payload.meta.custom).toBe('value');
    });
  });

  describe('Logging', () => {
    const logDir = path.join(process.cwd(), 'logs');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const logFileName = `publishing-${year}-${month}-${day}.log`;
    const logFilePath = path.join(logDir, logFileName);

    afterEach(async () => {
      // Clean up test log file after each test
      try {
        if (fs.existsSync(logFilePath)) {
          await fs.promises.unlink(logFilePath);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create log file and write entries', async () => {
      await logPreflight('test_event', { 
        test: 'data',
        timestamp: Date.now()
      });

      // Verify log file was created
      expect(fs.existsSync(logFilePath)).toBe(true);

      // Read and verify log content
      const logs = await readLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.event).toBe('test_event');
      expect(lastLog.data.test).toBe('data');
      expect(lastLog.level).toBe('info');
    });

    it('should append multiple log entries', async () => {
      await logPreflight('event_1', { data: 1 });
      await logPreflight('event_2', { data: 2 }, 'warn');
      await logPreflight('event_3', { data: 3 }, 'error');

      const logs = await readLogs();
      expect(logs.length).toBeGreaterThanOrEqual(3);

      // Find our test logs
      const testLogs = logs.filter(log => 
        log.event === 'event_1' || 
        log.event === 'event_2' || 
        log.event === 'event_3'
      );

      expect(testLogs).toHaveLength(3);
      expect(testLogs[0].level).toBe('info');
      expect(testLogs[1].level).toBe('warn');
      expect(testLogs[2].level).toBe('error');
    });
  });
});

describe('Integration Test: Complete Publishing Flow', () => {
  it('should handle complete publishing preflight flow', async () => {
    const stateMachine = new PublishingStateMachine();
    
    // Start preflight
    stateMachine.transition(PublishingState.PREFLIGHT);

    // Ensure terms
    const termsResult = await ensureTerms({
      categories: ['technical-coding'],
      tags: ['api', 'documentation', 'typescript', 'testing']
    });
    expect(termsResult.existing.length + termsResult.created.length).toBeGreaterThan(0);

    // Generate title
    const title = generateTitle({
      mode: 'template',
      goal: 'API Documentation',
      category: 'technical-coding'
    });
    expect(title).toBe('API Documentation Prompt Template');

    // Create unique slug
    const existingSlugs = new Set(['api-documentation-prompt-template']);
    const fetcher = async (slug: string) => existingSlugs.has(slug);
    const slug = await uniqueSlug(title, fetcher);
    expect(slug).not.toBe('api-documentation-prompt-template'); // Should be different due to collision

    // Build payload
    const payload = buildPayload({
      title,
      slug,
      content: 'Generated prompt content here...',
      categories: ['technical-coding'],
      tags: ['api', 'documentation', 'typescript', 'testing'],
      meta: {
        mode: 'template',
        trust_score: 85
      }
    });

    // Transition to ready
    stateMachine.transition(PublishingState.READY_TO_PUBLISH);
    
    // Simulate publish
    stateMachine.transition(PublishingState.PUBLISHED);

    // Log the result
    await logPreflight('publishing_complete', {
      payload,
      state: stateMachine.getState()
    });

    expect(stateMachine.getState()).toBe(PublishingState.PUBLISHED);
    expect(payload.slug).toBeDefined();
    expect(payload.meta.trust_score).toBe(85);
  });
});