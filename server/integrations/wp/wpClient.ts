/**
 * WordPress REST API Client
 * Handles authentication and interaction with WordPress REST API
 * Uses Application Passwords for secure authentication
 */

import { PostPayload } from '../../publishing/preflight';

export interface WPConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export interface WPTerm {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  slug: string;
  status: 'publish' | 'draft' | 'pending' | 'private';
  title: {
    rendered: string;
    raw?: string;
  };
  content: {
    rendered: string;
    raw?: string;
  };
  categories?: number[];
  tags?: number[];
}

export interface WPErrorResponse {
  code: string;
  message: string;
  data?: {
    status: number;
    [key: string]: any;
  };
}

export interface UpsertTermsResult {
  categories: Map<string, number>;
  tags: Map<string, number>;
  created: string[];
  existing: string[];
}

export class WordPressClient {
  private config: WPConfig;
  private authHeader: string;

  constructor(config?: WPConfig) {
    this.config = config || {
      baseUrl: process.env.WP_BASE_URL || '',
      username: process.env.WP_APP_USER || '',
      password: process.env.WP_APP_PASSWORD || ''
    };

    // Validate configuration
    if (!this.config.baseUrl) {
      throw new Error('WP_BASE_URL is required');
    }
    if (!this.config.username) {
      throw new Error('WP_APP_USER is required');
    }
    if (!this.config.password) {
      throw new Error('WP_APP_PASSWORD is required');
    }

    // Ensure HTTPS for security (unless localhost for testing)
    const url = new URL(this.config.baseUrl);
    if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
      throw new Error('WordPress API requires HTTPS for Application Password authentication');
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Make an authenticated request to WordPress REST API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}/wp-json${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Handle authentication errors
    if (response.status === 401) {
      throw new Error('Authentication failed. Check Application Password or user caps.');
    }
    if (response.status === 403) {
      throw new Error('Permission denied. Check Application Password or user caps.');
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      
      // Check for WordPress error response
      if (!response.ok && data.code) {
        const error = data as WPErrorResponse;
        throw new Error(`WordPress API Error [${error.code}]: ${error.message}`);
      }
      
      return data as T;
    }

    if (!response.ok) {
      throw new Error(`WordPress API Error: ${response.status} ${response.statusText}`);
    }

    return {} as T;
  }

  /**
   * Get or create a term (category or tag)
   */
  private async upsertTerm(
    name: string,
    taxonomy: 'categories' | 'tags',
    retryOnConflict: boolean = true
  ): Promise<{ id: number; created: boolean }> {
    const endpoint = `/wp/v2/${taxonomy}`;
    
    // First, try to find existing term
    try {
      const existingTerms = await this.request<WPTerm[]>(
        `${endpoint}?search=${encodeURIComponent(name)}&per_page=100`
      );
      
      const exactMatch = existingTerms.find(
        term => term.name.toLowerCase() === name.toLowerCase()
      );
      
      if (exactMatch) {
        return { id: exactMatch.id, created: false };
      }
    } catch (error) {
      console.error(`Error searching for ${taxonomy}:`, error);
    }

    // Create new term
    try {
      const newTerm = await this.request<WPTerm>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          name: name,
          slug: name.toLowerCase().replace(/\s+/g, '-')
        })
      });
      
      return { id: newTerm.id, created: true };
    } catch (error: any) {
      // Handle race condition where term was created by another process
      if (error.message?.includes('term_exists') && retryOnConflict) {
        // Retry once to get the existing term
        return this.upsertTerm(name, taxonomy, false);
      }
      throw error;
    }
  }

  /**
   * Ensure categories and tags exist, creating if necessary
   */
  async upsertTerms(input: {
    categories: string[];
    tags: string[];
  }): Promise<UpsertTermsResult> {
    const result: UpsertTermsResult = {
      categories: new Map(),
      tags: new Map(),
      created: [],
      existing: []
    };

    // Process categories
    for (const categoryName of input.categories) {
      if (!categoryName.trim()) continue;
      
      try {
        const { id, created } = await this.upsertTerm(categoryName, 'categories');
        result.categories.set(categoryName, id);
        
        if (created) {
          result.created.push(`category:${categoryName}`);
        } else {
          result.existing.push(`category:${categoryName}`);
        }
      } catch (error) {
        console.error(`Failed to upsert category "${categoryName}":`, error);
        throw new Error(`Failed to upsert category "${categoryName}": ${error}`);
      }
    }

    // Process tags
    for (const tagName of input.tags) {
      if (!tagName.trim()) continue;
      
      try {
        const { id, created } = await this.upsertTerm(tagName, 'tags');
        result.tags.set(tagName, id);
        
        if (created) {
          result.created.push(`tag:${tagName}`);
        } else {
          result.existing.push(`tag:${tagName}`);
        }
      } catch (error) {
        console.error(`Failed to upsert tag "${tagName}":`, error);
        throw new Error(`Failed to upsert tag "${tagName}": ${error}`);
      }
    }

    return result;
  }

  /**
   * Create a draft post
   */
  async createDraftPost(payload: PostPayload): Promise<WPPost> {
    // First ensure terms exist
    const terms = await this.upsertTerms({
      categories: payload.categories,
      tags: payload.tags
    });

    // Map category and tag names to IDs
    const categoryIds = Array.from(terms.categories.values());
    const tagIds = Array.from(terms.tags.values());

    // Create the post as draft
    const postData = {
      title: payload.title,
      content: payload.content,
      slug: payload.slug,
      status: 'draft' as const,
      categories: categoryIds,
      tags: tagIds,
      meta: payload.meta || {}
    };

    try {
      const post = await this.request<WPPost>('/wp/v2/posts', {
        method: 'POST',
        body: JSON.stringify(postData)
      });

      console.log(`Draft post created with ID: ${post.id}`);
      return post;
    } catch (error) {
      console.error('Failed to create draft post:', error);
      throw new Error(`Failed to create draft post: ${error}`);
    }
  }

  /**
   * Publish a draft post
   */
  async publishPost(id: number): Promise<WPPost> {
    try {
      const post = await this.request<WPPost>(`/wp/v2/posts/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'publish'
        })
      });

      console.log(`Post ${id} published successfully`);
      return post;
    } catch (error) {
      console.error(`Failed to publish post ${id}:`, error);
      throw new Error(`Failed to publish post ${id}: ${error}`);
    }
  }

  /**
   * Get a post by ID
   */
  async getPost(id: number): Promise<WPPost> {
    try {
      return await this.request<WPPost>(`/wp/v2/posts/${id}`);
    } catch (error) {
      console.error(`Failed to get post ${id}:`, error);
      throw new Error(`Failed to get post ${id}: ${error}`);
    }
  }

  /**
   * Delete a post (for testing cleanup)
   */
  async deletePost(id: number, force: boolean = false): Promise<void> {
    try {
      await this.request(`/wp/v2/posts/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ force })
      });
      console.log(`Post ${id} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete post ${id}:`, error);
      throw new Error(`Failed to delete post ${id}: ${error}`);
    }
  }

  /**
   * Test the connection and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to get current user info
      const user = await this.request('/wp/v2/users/me');
      console.log(`WordPress connection successful. Authenticated as: ${(user as any).name}`);
      return true;
    } catch (error) {
      console.error('WordPress connection test failed:', error);
      // Re-throw the error to allow proper error handling in tests
      throw error;
    }
  }
}