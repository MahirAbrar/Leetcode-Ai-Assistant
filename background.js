// LeetCode AI Assistant Background Script
// This script runs in the extension background and handles API calls

// Configuration
const API_CONFIG = {
  // Groq API endpoint
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: {
      default: 'meta-llama/llama-4-scout-17b-16e-instruct',
      advanced: 'mixtral-8x7b-32768',
      llama3: 'meta-llama/llama-3-70b-instruct',
      gemma: 'google/gemma-7b-it',
      mistral: 'mistralai/mistral-7b-instruct'
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
  'hint': `
Give a small hints to help them solve this problem without giving away the full solution. 
Be concise and focus on guiding their thinking rather than providing code.
Tell the user what data structures they can use to solve the problem.`,

  'critical-thinking': `
Analyze this problem and provide critical thinking steps to approach it. Make the user think of ways to solve the problem.
Break down the problem into smaller parts and suggest useful data structures or algorithms.
Don't provide full code solutions, but guide their thought process.`,

  'problem-solving': `
Guide them through solving this problem step by step.
Start with a high-level approach, then break it down into detailed steps.
If they already have some code, suggest how to improve or fix it.
You can include code snippets to illustrate specific parts, but focus on explaining the solution approach.
Tell the user what data structures they can use to solve the problem.`,
};

// Helper function to send startup message to LeetCode tabs
function sendStartupMessage() {
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
}

// Initialize extension and handle startup
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({
    assistMode: 'hint',
    apiKey: '',
    usageCount: 0,
    model: 'default',
    temperature: 0.7
  });
  
  // Send startup message
  sendStartupMessage();
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  sendStartupMessage();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkApiKeyStatus') {
    chrome.storage.sync.get(['apiKey'], function(settings) {
      const apiKey = message.apiKey || settings.apiKey;
      
      if (!apiKey) {
        sendResponse({ hasApiKey: false });
        return;
      }
      
      validateApiKey(apiKey)
        .then(isValid => {
          sendResponse({ 
            hasApiKey: true,
            isValid: isValid,
            apiKeyLength: apiKey.length,
            apiKeyPrefix: apiKey.substring(0, 7),
            apiKeySuffix: apiKey.substring(apiKey.length - 4)
          });
        })
        .catch(() => {
          sendResponse({ hasApiKey: false });
        });
    });
    return true;
  }
  
  if (message.action === 'getAIAssistance') {
    chrome.storage.sync.get(['apiKey', 'model', 'temperature'], (settings) => {
      if (!settings.apiKey) {
        sendResponse({ error: 'Please set your Groq API key in the extension settings.', isApiKeyMissing: true });
        return;
      }
      
      validateApiKey(settings.apiKey)
        .then(isValid => {
          if (!isValid) {
            sendResponse({ error: 'Invalid API key. Please check your API key in the extension settings.', isApiKeyInvalid: true });
            return;
          }
          
          getAIAssistance(message.data, settings)
            .then(response => {
              sendResponse({ answer: response });
            })
            .catch(error => {
              sendResponse({ error: error.message || 'Failed to get AI assistance. Please try again.' });
            });
        })
        .catch(error => {
          sendResponse({ 
            error: `API key validation failed: ${error.message}. Please check your API key in the extension settings.`,
            isApiKeyInvalid: true 
          });
        });
    });
    return true;
  }
  
  if (message.action === 'saveSettings') {
    saveSettings(message.settings, sendResponse);
    return true;
  }
  
  if (message.action === 'getSettings') {
    getSettings(sendResponse);
    return true;
  }
});

// Get AI assistance based on problem, code, and mode
async function getAIAssistance(data, settings) {
  try {
    const mode = settings.assistMode || data.mode;
    const prompt = getPromptForMode(mode, data.problem, data.code);
    const response = await fetchAIResponse(prompt, settings);
    
    // Increment usage count
    const newCount = (settings.usageCount || 0) + 1;
    chrome.storage.sync.set({ usageCount: newCount });
    
    return response;
  } catch (error) {
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
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid API response format');
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
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
  
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  const pres = temp.querySelectorAll('pre');
  pres.forEach(pre => {
    pre.textContent = '\n```\n' + pre.textContent.trim() + '\n```\n';
  });
  
  const codes = temp.querySelectorAll('code:not(pre code)');
  codes.forEach(code => {
    code.textContent = '`' + code.textContent + '`';
  });
  
  return temp.textContent || '';
}

// Helper function to validate API key
async function validateApiKey(apiKey) {
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
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API key validation failed: ${errorData.error?.message || `HTTP ${response.status}`}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
} 