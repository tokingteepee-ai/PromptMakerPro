/**
 * WordPress Integration Example
 * Demonstrates how to use the WordPress connector
 * 
 * To run this example:
 * 1. Set up your WordPress credentials in .env file
 * 2. Run: npx tsx server/integrations/wp/example.ts
 */

import { WordPressClient } from './wpClient';
import type { PostPayload } from '../../publishing/preflight';

async function runExample() {
  console.log('=== WordPress Integration Example ===\n');
  
  // Initialize the client (uses environment variables)
  const wp = new WordPressClient();
  
  try {
    // 1. Test the connection
    console.log('1. Testing connection...');
    const connected = await wp.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to WordPress');
    }
    console.log('✓ Connected successfully\n');
    
    // 2. Ensure terms exist
    console.log('2. Creating/checking categories and tags...');
    const termsResult = await wp.upsertTerms({
      categories: ['Technology', 'AI'],
      tags: ['wordpress', 'api', 'integration', 'promptinator']
    });
    
    console.log(`✓ Categories mapped: ${Array.from(termsResult.categories.keys()).join(', ')}`);
    console.log(`✓ Tags mapped: ${Array.from(termsResult.tags.keys()).join(', ')}`);
    console.log(`✓ Created: ${termsResult.created.length} new terms`);
    console.log(`✓ Existing: ${termsResult.existing.length} existing terms\n`);
    
    // 3. Create a draft post
    console.log('3. Creating draft post...');
    const payload: PostPayload = {
      title: 'Test Post from Promptinator',
      slug: 'test-post-promptinator',
      content: `
        <h2>This is a test post</h2>
        <p>This post was created using the WordPress REST API integration.</p>
        <ul>
          <li>Created as draft first</li>
          <li>Categories and tags auto-created</li>
          <li>Can be published programmatically</li>
        </ul>
        <p>Generated at: ${new Date().toISOString()}</p>
      `,
      categories: ['Technology', 'AI'],
      tags: ['wordpress', 'api', 'integration', 'promptinator'],
      meta: {
        source: 'promptinator',
        version: '1.0.0'
      }
    };
    
    const draftPost = await wp.createDraftPost(payload);
    console.log(`✓ Draft created with ID: ${draftPost.id}`);
    console.log(`✓ Draft status: ${draftPost.status}`);
    console.log(`✓ Edit URL: ${process.env.WP_BASE_URL}/wp-admin/post.php?post=${draftPost.id}&action=edit\n`);
    
    // 4. Optional: Publish the draft
    console.log('4. Publishing the draft...');
    const publishedPost = await wp.publishPost(draftPost.id);
    console.log(`✓ Post published! Status: ${publishedPost.status}`);
    console.log(`✓ View URL: ${process.env.WP_BASE_URL}/?p=${publishedPost.id}\n`);
    
    // 5. Optional: Clean up (delete the test post)
    console.log('5. Cleaning up (optional)...');
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      await wp.deletePost(publishedPost.id, true);
      console.log('✓ Test post deleted\n');
    } else {
      console.log('ℹ Run with --cleanup to delete the test post\n');
    }
    
    console.log('=== Example completed successfully ===');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Check your WordPress URL in WP_BASE_URL');
    console.log('2. Verify Application Password is set in WP_APP_PASSWORD');
    console.log('3. Ensure user has proper capabilities (edit_posts, publish_posts)');
    console.log('4. Check that REST API is enabled on your WordPress site');
    process.exit(1);
  }
}

// Run the example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample().catch(console.error);
}

export { runExample };