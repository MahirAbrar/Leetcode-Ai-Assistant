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
  
  // OpenAI API endpoint
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: {
      default: 'gpt-4o',
      advanced: 'gpt-4.1',
      llama3: 'gpt-4.1',
      gemma: 'gpt-4.1-mini',
      mistral: 'gpt-4o-mini'
    }
  },
  
  // Fallback messages when no API key is set
  fallback: {
    'Small Hints': "I'd like to provide a small hint for this problem, but I need an API key to access my full capabilities. Please click the extension icon and enter your API key in the settings to unlock helpful guidance.",
    'Medium Hints': "I can analyze this problem and provide thoughtful guidance, but first I need an API key to unlock my full capabilities. Please click the extension icon and enter your API key in the settings.",
    'Big Hints': "I'd love to walk you through this problem step-by-step, but I need an API key to access my full capabilities. Please click the extension icon and enter your API key in the settings.",
    'Metaphorical Hints': "I can explain this problem using creative metaphors and analogies, but I need an API key to unlock my full capabilities. Please click the extension icon and enter your API key in the settings."
  }
};

// Mode-specific prompts
const PROMPTS = {
  'Small Hints': `
You are an expert computer science tutor helping a student solve a LeetCode programming problem. Your goal is to provide minimal guidance that points them in the right direction without revealing the solution.

Instructions:
1. Identify ONE key insight or concept that would help solve this problem
2. Briefly mention a relevant data structure or algorithm pattern WITHOUT explaining implementation details
3. Ask a thought-provoking question that guides their thinking
4. Keep your response under 150 words and focused on conceptual understanding
5. DO NOT provide code or explicit algorithm steps

Remember: The goal is to help the student learn through discovery, not to solve the problem for them.`,

  'Medium Hints': `
You are an expert programming coach analyzing a LeetCode problem for a student. Your task is to provide moderate guidance that helps them develop their own solution.

Instructions:
1. Identify 2-3 key insights or patterns needed to solve this problem
2. Suggest appropriate data structures/algorithms with brief explanations of WHY they're suitable
3. Break down the problem-solving approach into 3-4 conceptual steps (without implementation details)
4. Point out potential edge cases or optimization considerations
5. Use bullet points for clarity
6. DO NOT provide a complete solution or working code

Remember: Strike a balance between providing sufficient guidance and allowing the student to develop their own implementation.`,

  'Big Hints': `
You are an experienced programming instructor walking a student through a LeetCode problem. Your task is to provide detailed guidance that clearly outlines the solution approach.

Instructions:
1. Explain the core algorithm/approach needed to solve this problem
2. Break down the solution into clear, logical steps
3. Explain the reasoning behind each step
4. Highlight the specific data structures needed and why they're appropriate
5. Discuss time and space complexity considerations
6. If there are multiple approaches, briefly compare them
7. You may include short pseudocode snippets to illustrate specific concepts
8. Use a structured format with headers and bullet points

Remember: While providing detailed guidance, still encourage understanding rather than memorization of the solution.`,

  'Metaphorical Hints': `
You are a creative explainer who helps students understand programming concepts through metaphors and analogies. Your task is to explain a LeetCode problem solution using everyday concepts.

Instructions:
1. Create a vivid, coherent metaphor that maps to the programming solution
2. Ensure your metaphor accurately represents the key algorithmic concepts
3. Use familiar real-world scenarios (traffic flow, cooking, organizing books, etc.)
4. Explain how this metaphor maps to the computational approach
5. Keep technical jargon to an absolute minimum
6. Make your explanation engaging and visual
7. Use simple language that someone with no programming background could understand
8. DO NOT include any code or technical programming terms - stay entirely in the metaphorical realm
9. Structure your response as a story with a clear beginning, middle, and end
10. Use characters or objects to represent data structures and algorithms
11. Include sensory details to make your metaphor more memorable

Remember: The goal is to provide an intuitive understanding of the algorithm through creative, relatable storytelling that creates "aha" moments of understanding.`
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
    assistMode: 'Small Hints',
    apiKey: '',
    apiProvider: 'groq',
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
    chrome.storage.sync.get(['apiKey', 'apiProvider'], function(settings) {
      const apiKey = message.apiKey || settings.apiKey;
      const apiProvider = message.apiProvider || settings.apiProvider || 'groq';
      
      if (!apiKey) {
        sendResponse({ hasApiKey: false });
        return;
      }
      
      validateApiKey(apiKey, apiProvider)
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
    chrome.storage.sync.get(['apiKey', 'model', 'temperature', 'apiProvider', 'assistMode'], (settings) => {
      if (!settings.apiKey) {
        // Get the appropriate fallback message based on mode
        const mode = message.data.mode || settings.assistMode || 'Small Hints';
        const fallbackMsg = API_CONFIG.fallback[mode] || API_CONFIG.fallback['Small Hints'];
        sendResponse({ error: fallbackMsg, isApiKeyMissing: true });
        return;
      }
      
      validateApiKey(settings.apiKey, settings.apiProvider)
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
  
  // Add a new listener for toggling debug mode
  if (message.action === 'toggleDebugMode') {
    chrome.storage.sync.get(['debugMode'], function(settings) {
      const newDebugMode = !settings.debugMode;
      chrome.storage.sync.set({ debugMode: newDebugMode }, function() {
        console.log(`Debug mode ${newDebugMode ? 'enabled' : 'disabled'}`);
        sendResponse({ success: true, debugMode: newDebugMode });
      });
    });
    return true;
  }
});

// Get AI assistance based on problem, code, and mode
async function getAIAssistance(data, settings) {
  try {
    // Get mode from data or settings, with proper logging
    const mode = data.mode || settings.assistMode || 'Small Hints';
    
    console.log('===== LeetCode AI Assistant Mode =====');
    console.log(`Requested mode: ${data.mode}`);
    console.log(`Settings mode: ${settings.assistMode}`);
    console.log(`Using mode: ${mode}`);
    
    // Verify that we have a prompt for this mode
    if (!PROMPTS[mode]) {
      console.warn(`Unknown mode: ${mode}, falling back to Small Hints`);
    }
    
    const prompt = getPromptForMode(mode, data.problem, data.code);
    const response = await fetchAIResponse(prompt, settings);
    
    // Increment usage count
    const newCount = (settings.usageCount || 0) + 1;
    chrome.storage.sync.set({ usageCount: newCount });
    
    return response;
  } catch (error) {
    let errorMessage = 'Error getting AI assistance: ';
    
    if (error.message.includes('API key')) {
      errorMessage = "Invalid API key. Please check your API key in the extension settings.";
    } else if (error.message.includes('rate limit')) {
      errorMessage = "You've hit the API rate limit. Please try again later or check your account usage.";
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
  const basePrompt = PROMPTS[mode] || PROMPTS['Small Hints'];
  
  const fullPrompt = `${basePrompt}

PROBLEM:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
URL: ${problem.url || 'Not provided'}

PROBLEM DESCRIPTION:
${stripHtml(problem.description)}

STUDENT'S CURRENT CODE:
\`\`\`
${code}
\`\`\`

Based on the instructions above, provide appropriate guidance for this problem.`;

  return fullPrompt;
}

// Make the actual API call to the AI service
async function fetchAIResponse(prompt, settings) {
  try {
    const apiProvider = settings.apiProvider || 'groq';
    const modelKey = settings.model || 'default';
    const model = API_CONFIG[apiProvider].models[modelKey];
    const endpoint = API_CONFIG[apiProvider].endpoint;
    
    const response = await fetch(endpoint, {
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
      throw new Error("You've hit the API rate limit. Please try again later or check your account usage.");
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
  console.log('Saving settings:', settings);
  
  chrome.storage.sync.set(settings, function() {
    // If assist mode changed, notify all open tabs
    if (settings.assistMode) {
      console.log('Assist mode changed to:', settings.assistMode);
      
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          // Only send to LeetCode tabs
          if (tab.url && tab.url.includes('leetcode.com')) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'modeChanged',
              mode: settings.assistMode
            });
          }
        });
      });
    }
    sendResponse({ success: true });
  });
}

// Get current settings
function getSettings(sendResponse) {
  chrome.storage.sync.get(['apiKey', 'apiProvider', 'assistMode', 'usageCount', 'model', 'temperature'], function(settings) {
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
async function validateApiKey(apiKey, apiProvider) {
  try {
    const provider = apiProvider || 'groq';
    const endpoint = API_CONFIG[provider].endpoint;
    const model = API_CONFIG[provider].models.default;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
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