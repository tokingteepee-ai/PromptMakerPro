/**
 * WordPress Client Integration Tests
 * Tests the WordPress REST API client with mocked responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WordPressClient } from '../../../server/integrations/wp/wpClient';
import type { WPPost, WPTerm } from '../../../server/integrations/wp/wpClient';
import type { PostPayload } from '../../../server/publishing/preflight';

// Mock fetch globally
global.fetch = vi.fn();

describe('WordPressClient', () => {
  let client: WordPressClient;
  const mockConfig = {
    baseUrl: 'https://test.wordpress.com',
    username: 'testuser',
    password: 'test-app-password'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables for default constructor
    process.env.WP_BASE_URL = mockConfig.baseUrl;
    process.env.WP_APP_USER = mockConfig.username;
    process.env.WP_APP_PASSWORD = mockConfig.password;
    
    client = new WordPressClient();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with environment variables', () => {
      const envClient = new WordPressClient();
      expect(envClient).toBeDefined();
    });

    it('should throw error if baseUrl is missing', () => {
      delete process.env.WP_BASE_URL;
      expect(() => new WordPressClient()).toThrow('WP_BASE_URL is required');
    });

    it('should throw error if not using HTTPS (except localhost)', () => {
      expect(() => new WordPressClient({
        baseUrl: 'http://production-site.com',
        username: 'user',
        password: 'pass'
      })).toThrow('WordPress API requires HTTPS');
      
      // Should work with localhost
      expect(() => new WordPressClient({
        baseUrl: 'http://localhost:8080',
        username: 'user',
        password: 'pass'
      })).not.toThrow();
    });
  });

  describe('Authentication', () => {
    it('should handle 401 authentication errors with guidance', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        status: 401,
        ok: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ code: 'rest_forbidden', message: 'Invalid credentials' })
      });

      await expect(client.testConnection()).rejects.toThrow(
        'Authentication failed. Check Application Password or user caps.'
      );
    });

    it('should handle 403 permission errors with guidance', async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ code: 'rest_forbidden', message: 'Insufficient permissions' })
      });

      await expect(client.testConnection()).rejects.toThrow(
        'Permission denied. Check Application Password or user caps.'
      );
    });
  });

  describe('upsertTerms', () => {
    it('should create new categories and tags when they don\'t exist', async () => {
      const mockFetch = global.fetch as any;
      
      // Mock search for existing category (not found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      });
      
      // Mock create category
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 10, name: 'Technology', slug: 'technology' } as WPTerm)
      });
      
      // Mock search for existing tag (not found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      });
      
      // Mock create tag
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 20, name: 'AI', slug: 'ai' } as WPTerm)
      });

      const result = await client.upsertTerms({
        categories: ['Technology'],
        tags: ['AI']
      });

      expect(result.categories.get('Technology')).toBe(10);
      expect(result.tags.get('AI')).toBe(20);
      expect(result.created).toContain('category:Technology');
      expect(result.created).toContain('tag:AI');
      expect(result.existing).toHaveLength(0);
    });

    it('should reuse existing terms instead of creating duplicates', async () => {
      const mockFetch = global.fetch as any;
      
      // Mock search for existing category (found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          { id: 5, name: 'Technology', slug: 'technology' } as WPTerm
        ]
      });
      
      // Mock search for existing tag (found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          { id: 15, name: 'AI', slug: 'ai' } as WPTerm
        ]
      });

      const result = await client.upsertTerms({
        categories: ['Technology'],
        tags: ['AI']
      });

      expect(result.categories.get('Technology')).toBe(5);
      expect(result.tags.get('AI')).toBe(15);
      expect(result.created).toHaveLength(0);
      expect(result.existing).toContain('category:Technology');
      expect(result.existing).toContain('tag:AI');
    });

    it('should retry once on race condition when creating terms', async () => {
      const mockFetch = global.fetch as any;
      
      // Mock search for existing category (not found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      });
      
      // Mock create category (fails with term_exists)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          code: 'term_exists',
          message: 'A term with the name provided already exists.'
        })
      });
      
      // Mock retry search for existing category (now found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          { id: 8, name: 'Technology', slug: 'technology' } as WPTerm
        ]
      });

      const result = await client.upsertTerms({
        categories: ['Technology'],
        tags: []
      });

      expect(result.categories.get('Technology')).toBe(8);
      expect(result.existing).toContain('category:Technology');
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial search, failed create, retry search
    });
  });

  describe('createDraftPost', () => {
    it('should create a draft post with categories and tags', async () => {
      const mockFetch = global.fetch as any;
      
      // Mock term searches and creations
      // Category search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 10, name: 'Technology', slug: 'technology' }]
      });
      
      // Tag searches (3 tags)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 20, name: 'AI', slug: 'ai' }]
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 21, name: 'WordPress', slug: 'wordpress' }]
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      });
      
      // Create missing tag
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 22, name: 'API', slug: 'api' })
      });
      
      // Mock post creation
      const mockPost: WPPost = {
        id: 123,
        date: '2025-10-18T10:00:00',
        date_gmt: '2025-10-18T10:00:00',
        slug: 'test-post',
        status: 'draft',
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Test content</p>' },
        categories: [10],
        tags: [20, 21, 22]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockPost
      });

      const payload: PostPayload = {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        categories: ['Technology'],
        tags: ['AI', 'WordPress', 'API'],
        meta: { custom_field: 'value' }
      };

      const post = await client.createDraftPost(payload);

      expect(post.id).toBe(123);
      expect(post.status).toBe('draft');
      expect(post.categories).toContain(10);
      expect(post.tags).toContain(20);
      expect(post.tags).toContain(21);
      expect(post.tags).toContain(22);
    });

    it('should fail with clear error when post creation fails', async () => {
      const mockFetch = global.fetch as any;
      
      // Mock category search and creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 1, name: 'Test', slug: 'test' })
      });
      
      // Mock tag searches and creations
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => []
        });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: i + 10, name: `tag${i + 1}`, slug: `tag${i + 1}` })
        });
      }
      
      // Mock post creation failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          code: 'rest_invalid_param',
          message: 'Invalid parameter(s): title'
        })
      });

      const payload: PostPayload = {
        title: '',
        slug: 'test-post',
        content: 'Test content',
        categories: ['Test'],
        tags: ['tag1', 'tag2', 'tag3'],
        meta: {}
      };

      await expect(client.createDraftPost(payload)).rejects.toThrow(
        'Failed to create draft post'
      );
    });
  });

  describe('publishPost', () => {
    it('should successfully publish a draft post', async () => {
      const mockFetch = global.fetch as any;
      
      const publishedPost: WPPost = {
        id: 123,
        date: '2025-10-18T10:00:00',
        date_gmt: '2025-10-18T10:00:00',
        slug: 'test-post',
        status: 'publish',
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Test content</p>' }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => publishedPost
      });

      const post = await client.publishPost(123);

      expect(post.id).toBe(123);
      expect(post.status).toBe('publish');
      
      // Verify correct API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.wordpress.com/wp-json/wp/v2/posts/123',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ status: 'publish' })
        })
      );
    });

    it('should handle publish errors gracefully', async () => {
      const mockFetch = global.fetch as any;
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          code: 'rest_post_invalid_id',
          message: 'Invalid post ID.'
        })
      });

      await expect(client.publishPost(999)).rejects.toThrow(
        'Failed to publish post 999'
      );
    });
  });

  describe('Integration Flow', () => {
    it('should complete full draft-to-publish workflow', async () => {
      const mockFetch = global.fetch as any;
      
      // 1. Test connection
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 1, name: 'Test User' })
      });
      
      const connected = await client.testConnection();
      expect(connected).toBe(true);
      
      // 2. Create draft with terms
      // Mock category exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 5, name: 'News', slug: 'news' }]
      });
      
      // Mock tags (create new ones)
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => []
        });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 30 + i, name: `tag${i}`, slug: `tag${i}` })
        });
      }
      
      // Mock draft creation
      const draftPost: WPPost = {
        id: 456,
        date: '2025-10-18T12:00:00',
        date_gmt: '2025-10-18T12:00:00',
        slug: 'integration-test',
        status: 'draft',
        title: { rendered: 'Integration Test Post' },
        content: { rendered: '<p>Integration test content</p>' },
        categories: [5],
        tags: [30, 31, 32]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => draftPost
      });
      
      const payload: PostPayload = {
        title: 'Integration Test Post',
        slug: 'integration-test',
        content: 'Integration test content',
        categories: ['News'],
        tags: ['tag0', 'tag1', 'tag2'],
        meta: { test: true }
      };
      
      const draft = await client.createDraftPost(payload);
      expect(draft.status).toBe('draft');
      
      // 3. Publish the draft
      const publishedPost = { ...draftPost, status: 'publish' as const };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => publishedPost
      });
      
      const published = await client.publishPost(draft.id);
      expect(published.status).toBe('publish');
      expect(published.id).toBe(456);
    });
  });
});