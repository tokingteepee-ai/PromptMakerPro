import { TEMPLATE_METADATA, type WordPressResponse } from '@shared/wordpress-metadata';

export async function savePromptToWordPress(
  promptTitle: string, 
  promptContent: string, 
  templateMode: string
): Promise<WordPressResponse> {
  const wpUsername = process.env.WP_USERNAME;
  const wpAppPassword = process.env.WP_APP_PASSWORD;
  
  // Check for partial configuration
  if ((wpUsername && !wpAppPassword) || (!wpUsername && wpAppPassword)) {
    console.error('[WordPress] Partial credentials configured - missing username or password');
    return {
      success: false,
      error: 'WordPress publishing service misconfigured. Please contact support.'
    };
  }
  
  if (!wpUsername || !wpAppPassword) {
    console.warn('[WordPress] Credentials not configured - WP_USERNAME and WP_APP_PASSWORD required');
    return {
      success: false,
      error: 'WordPress publishing is not currently available. Please contact support.'
    };
  }
  
  const metadata = TEMPLATE_METADATA[templateMode];
  if (!metadata) {
    console.error('[WordPress] Invalid template mode provided:', templateMode);
    return {
      success: false,
      error: 'Invalid template mode. Please select a valid template from the dropdown.'
    };
  }
  
  const requestBody = {
    title: promptTitle,
    content: promptContent,
    status: 'publish',
    'prompt-category': [metadata.category],
    'use-case': metadata.useCases,
    'ai-model': metadata.aiModels
  };
  
  try {
    console.log('=== WordPress POST Request Debug ===');
    console.log('[WordPress] 1. Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('[WordPress] 2. Template Mode:', templateMode);
    console.log('[WordPress] 3. Metadata:', JSON.stringify(metadata, null, 2));
    console.log('[WordPress] 4. Username:', wpUsername ? `${wpUsername.substring(0, 3)}***` : 'NOT SET');
    console.log('[WordPress] 5. Password:', wpAppPassword ? '***SET***' : 'NOT SET');

    const authHeader = 'Basic ' + Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');
    
    console.log('[WordPress] 6. Making POST request to:', 'https://aifirstmovers.net/?promptinator_api=1');
    
    const response = await fetch('https://aifirstmovers.net/?promptinator_api=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('[WordPress] 7. Response Status:', response.status, response.statusText);
    console.log('[WordPress] 8. Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    // Get response text first before parsing
    const responseText = await response.text();
    console.log('[WordPress] 9. Raw Response Text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('[WordPress] 10. Parsed Response Data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('[WordPress] 11. JSON Parse Error:', parseError);
      console.error('[WordPress] 12. Response was not valid JSON');
      return {
        success: false,
        error: `Invalid response from WordPress: ${responseText.substring(0, 200)}`
      };
    }
    
    if (!response.ok) {
      console.error('[WordPress] 13. API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        errorCode: data.code,
        errorMessage: data.message,
        errorData: data.data,
        fullResponse: data
      });

      // Show the actual WordPress error message
      let errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
      
      // Add additional error details if available
      if (data.data?.params) {
        errorMessage += ` | Invalid params: ${Object.keys(data.data.params).join(', ')}`;
      }
      
      if (data.code) {
        errorMessage += ` (${data.code})`;
      }
      
      console.error('[WordPress] 14. Final Error Message:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    console.log('[WordPress] Prompt published successfully:', {
      id: data.id,
      url: data.link
    });

    return {
      success: true,
      id: data.id,
      url: data.link,
      title: data.title?.rendered || promptTitle
    };
    
  } catch (error: any) {
    console.error('[WordPress] Network/fetch error:', error);
    
    let errorMessage = 'Connection error. Please check your internet connection.';
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('ETIMEDOUT')) {
      errorMessage = 'Cannot reach WordPress server. Please try again later.';
    } else if (error.message && !error.message.includes('fetch')) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export function validateWordPressPublish(title: string, content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Title cannot be empty');
  }
  
  if (title && title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (!content || content.trim().length === 0) {
    errors.push('Content cannot be empty');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
