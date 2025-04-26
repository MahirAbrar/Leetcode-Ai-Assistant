// LeetCode AI Assistant Background Script
// This script runs in the extension background and handles API calls

// Add a very visible startup log
console.log('=== LeetCode AI Assistant Background Script Starting ===');
console.log('Background script loaded and running!');

// Add a startup message that will be sent to all tabs
chrome.runtime.onStartup.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && tab.url.includes('leetcode.com')) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'backgroundScriptStarted',
          timestamp: new Date().toISOString()
        }).catch(() => {
          // Ignore errors for tabs that can't receive messages
        });
      }
    });
  });
});

// Also send the message when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && tab.url.includes('leetcode.com')) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'backgroundScriptStarted',
          timestamp: new Date().toISOString()
        }).catch(() => {
          // Ignore errors for tabs that can't receive messages
        });
      }
    });
  });
});

// Configuration
const API_CONFIG = {
  // Groq API endpoint
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: {
      default: 'meta-llama/llama-4-scout-17b-16e-instruct',
      advanced: 'mixtral-8x7b-32768'
    }
  },
  
  // Fallback messages when no API key is set
  fallback: {
    'hint': "I can provide hints for this problem, but first you need to set up an API key. Click the extension icon and enter your Groq API key in the settings.",
    'critical-thinking': "I can help analyze this problem with critical thinking steps, but you need to set up an API key first. Click the extension icon and enter your Groq API key in the settings.",
    'problem-solving': "I can guide you through solving this problem step by step, but you need to set up an API key first. Click the extension icon and enter your Groq API key in the settings."
  }
};

// Mode-specific prompts
const PROMPTS = {
  'hint': `You are an AI assistant helping a programmer solve a LeetCode problem. 
Give a small hint to help them solve this problem without giving away the full solution. 
Be concise and focus on guiding their thinking rather than providing code.`,

  'critical-thinking': `You are an AI assistant helping a programmer solve a LeetCode problem.
Analyze this problem and provide critical thinking steps to approach it.
Break down the problem into smaller parts and suggest useful data structures or algorithms.
Don't provide full code solutions, but guide their thought process.`,

  'problem-solving': `You are an AI assistant helping a programmer solve a LeetCode problem.
Guide them through solving this problem step by step.
Start with a high-level approach, then break it down into detailed steps.
If they already have some code, suggest how to improve or fix it.
You can include code snippets to illustrate specific parts, but focus on explaining the solution approach.`
};

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(function() {
  console.log('Extension installed/updated, initializing...');
  // Set default settings
  chrome.storage.sync.set({
    assistMode: 'hint',
    apiKey: '',
    usageCount: 0,
    model: 'default',
    temperature: 0.7
  });
  
  console.log('Default settings initialized');
});

// Add a test log for storage
chrome.storage.sync.get(['apiKey'], (result) => {
  console.log('=== Initial Storage Check ===');
  console.log('API Key exists:', !!result.apiKey);
  console.log('API Key length:', result.apiKey ? result.apiKey.length : 0);
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('=== Message Received ===');
  console.log('Message:', message);
  
  if (message.action === 'checkApiKeyStatus') {
    // Get settings from storage
    chrome.storage.sync.get(['apiKey'], (settings) => {
      console.log('=== API Key Status Check ===');
      const hasApiKey = !!settings.apiKey;
      const apiKeyLength = settings.apiKey ? settings.apiKey.length : 0;
      const apiKeyPrefix = settings.apiKey ? settings.apiKey.substring(0, 7) : 'none';
      const apiKeySuffix = settings.apiKey ? settings.apiKey.substring(settings.apiKey.length - 4) : 'none';
      
      console.log('API Key Status:', {
        exists: hasApiKey,
        length: apiKeyLength,
        prefix: apiKeyPrefix,
        suffix: apiKeySuffix
      });
      
      sendResponse({
        hasApiKey,
        apiKeyLength,
        apiKeyPrefix,
        apiKeySuffix
      });
    });
    return true; // Will respond asynchronously
  }
  
  if (message.action === 'getAIAssistance') {
    console.log('=== Processing AI Assistance Request ===');
    console.log('Request data:', message.data);
    
    // Get settings from storage
    chrome.storage.sync.get(['apiKey', 'model', 'temperature'], (settings) => {
      console.log('=== Storage Retrieval ===');
      console.log('Storage result:', {
        hasApiKey: !!settings.apiKey,
        apiKeyLength: settings.apiKey ? settings.apiKey.length : 0,
        apiKeyPrefix: settings.apiKey ? settings.apiKey.substring(0, 7) : 'none',
        apiKeySuffix: settings.apiKey ? settings.apiKey.substring(settings.apiKey.length - 4) : 'none',
        model: settings.model || 'not set',
        temperature: settings.temperature || 'not set'
      });
      
      if (!settings.apiKey) {
        console.log('=== No API Key Found ===');
        console.error('No API key found in storage');
        sendResponse({ error: 'Please set your Groq API key in the extension settings.', isApiKeyMissing: true });
        return;
      }
      
      // Validate API key
      validateApiKey(settings.apiKey)
        .then(isValid => {
          console.log('=== API Key Validation Result ===');
          console.log('Is valid:', isValid);
          
          if (!isValid) {
            console.error('Invalid API key');
            sendResponse({ error: 'Invalid API key. Please check your API key in the extension settings.', isApiKeyInvalid: true });
            return;
          }
          
          // Get AI assistance
          getAIAssistance(message.data, settings)
            .then(response => {
              console.log('=== AI Response Received ===');
              console.log('Response:', response);
              sendResponse({ answer: response });
            })
            .catch(error => {
              console.error('=== AI Assistance Error ===');
              console.error('Error:', error);
              sendResponse({ error: error.message || 'Failed to get AI assistance. Please try again.' });
            });
        })
        .catch(error => {
          console.error('=== API Key Validation Error ===');
          console.error('Error:', error);
          sendResponse({ 
            error: `API key validation failed: ${error.message}. Please check your API key in the extension settings.`,
            isApiKeyInvalid: true 
          });
        });
    });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
  
  if (message.action === 'saveSettings') {
    console.log('Processing save settings request');
    saveSettings(message.settings, sendResponse);
    return true;
  }
  
  if (message.action === 'getSettings') {
    console.log('Processing get settings request');
    getSettings(sendResponse);
    return true;
  }
});

// Add a listener for storage changes with more detailed logging
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('=== Storage Changed ===');
  console.log('Namespace:', namespace);
  console.log('Changes:', Object.keys(changes).map(key => ({
    key,
    oldValue: changes[key].oldValue ? '***' : 'not set',
    newValue: changes[key].newValue ? '***' : 'not set',
    oldLength: changes[key].oldValue ? changes[key].oldValue.length : 0,
    newLength: changes[key].newValue ? changes[key].newValue.length : 0
  })));
});

// Get AI assistance based on problem, code, and mode
async function getAIAssistance(data, settings) {
  console.log('Starting getAIAssistance with data:', data);
  
  try {
    // Use the saved mode if available, otherwise use the one from the request
    const mode = settings.assistMode || data.mode;
    console.log('Using mode:', mode);
    
    // Get the appropriate prompt based on mode
    const prompt = getPromptForMode(mode, data.problem, data.code);
    console.log('Generated prompt:', prompt);
    
    // Call the AI API
    const response = await fetchAIResponse(prompt, settings);
    console.log('Received API response:', response);
    
    // Increment usage count
    const newCount = (settings.usageCount || 0) + 1;
    chrome.storage.sync.set({ usageCount: newCount });
    
    return response;
  } catch (error) {
    console.error('Error in getAIAssistance:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Error getting AI assistance: ';
    
    if (error.message.includes('API key')) {
      errorMessage = "Invalid API key. Please check your Groq API key in the extension settings.";
    } else if (error.message.includes('rate limit')) {
      errorMessage = "You've hit the API rate limit. Please try again later or check your Groq account usage.";
    } else if (error.message.includes('quota')) {
      errorMessage = "Your API usage quota has been exceeded. Please check your billing information or use a different API key.";
    } else if (error.message.includes('network')) {
      errorMessage = "Network error. Please check your internet connection and try again.";
    } else {
      errorMessage += error.message;
    }
    
    throw new Error(errorMessage);
  }
}

// Get the appropriate prompt based on mode
function getPromptForMode(mode, problem, code) {
  const basePrompt = PROMPTS[mode] || PROMPTS['hint'];
  
  return `${basePrompt}

Problem: ${problem.title}
Difficulty: ${problem.difficulty}
URL: ${problem.url || 'Not provided'}

Problem Description:
${stripHtml(problem.description)}

Current Code:
\`\`\`
${code}
\`\`\`

Please provide assistance with this problem.`;
}

// Make the actual API call to the AI service
async function fetchAIResponse(prompt, settings) {
  try {
    console.log('Making API call to Groq...');
    
    // Select model based on settings
    const modelKey = settings.model || 'default';
    const model = API_CONFIG.groq.models[modelKey];
    
    const response = await fetch(API_CONFIG.groq.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: prompt }
        ],
        max_tokens: 1000,
        temperature: settings.temperature || 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error response:', errorData);
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API response received:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid API response format');
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('API call error:', error);
    
    // Provide helpful error message based on the type of error
    if (error.message.includes('API key')) {
      throw new Error("Invalid API key. Please check your API key in the extension settings.");
    } else if (error.message.includes('rate limit')) {
      throw new Error("You've hit the API rate limit. Please try again later or check your Groq account usage.");
    } else if (error.message.includes('quota')) {
      throw new Error("Your API usage quota has been exceeded. Please check your billing information or use a different API key.");
    } else if (error.message.includes('network')) {
      throw new Error("Network error. Please check your internet connection and try again.");
    }
    
    throw error;
  }
}

// Save user settings
function saveSettings(settings, sendResponse) {
  chrome.storage.sync.set(settings, function() {
    // If mode was changed, notify content script
    if (settings.assistMode) {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'modeChanged',
            mode: settings.assistMode
          });
        }
      });
    }
    
    sendResponse({ success: true });
  });
}

// Get current settings
function getSettings(sendResponse) {
  chrome.storage.sync.get(['apiKey', 'assistMode', 'usageCount', 'model'], function(settings) {
    sendResponse(settings);
  });
}

// Helper function to strip HTML from problem description
function stripHtml(html) {
  if (!html) return '';
  
  // Create a temporary element
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Replace <pre> and <code> elements with properly formatted code blocks
  const pres = temp.querySelectorAll('pre');
  pres.forEach(pre => {
    pre.textContent = '\n```\n' + pre.textContent.trim() + '\n```\n';
  });
  
  // Replace <code> elements that aren't inside <pre> with inline code
  const codes = temp.querySelectorAll('code:not(pre code)');
  codes.forEach(code => {
    code.textContent = '`' + code.textContent + '`';
  });
  
  // Return the text content
  return temp.textContent || '';
}

// Helper function to validate API key
async function validateApiKey(apiKey) {
  console.log('=== Starting API Key Validation ===');
  console.log('Validating API key with prefix:', apiKey.substring(0, 7));
  
  try {
    const response = await fetch(API_CONFIG.groq.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: API_CONFIG.groq.models.default,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' }
        ],
        max_tokens: 1,
        temperature: 0.7
      })
    });
    
    console.log('Validation response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Key Validation Error:', errorData);
      throw new Error(`API key validation failed: ${errorData.error?.message || `HTTP ${response.status}`}`);
    }
    
    console.log('API Key Validation Successful');
    return true;
  } catch (error) {
    console.error('API Key Validation Exception:', error);
    throw error;
  }
} 