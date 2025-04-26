// LeetCode AI Assistant Popup Script
// Controls the behavior of the popup UI

// Configuration
const CONFIG = {
  models: {
    default: 'meta-llama/llama-4-scout-17b-16e-instruct',
    advanced: 'mixtral-8x7b-32768'
  },
  defaultTemperature: 0.7,
  defaultMode: 'hint'
};

document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup DOM loaded');
  
  // Initialize all elements
  const elements = {
    saveButton: document.getElementById('saveSettings'),
    apiKeyInput: document.getElementById('apiKey'),
    modelSelect: document.getElementById('model'),
    assistModeSelect: document.getElementById('assistMode'),
    temperatureInput: document.getElementById('temperature'),
    temperatureValue: document.getElementById('temperatureValue'),
    statusMessage: document.getElementById('statusMessage')
  };
  
  // Check if all required elements exist
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Required element not found: ${key}`);
      return;
    }
  }
  
  // Initialize temperature slider
  elements.temperatureInput.addEventListener('input', function() {
    elements.temperatureValue.textContent = this.value;
  });
  
  // Add click listener to save button
  elements.saveButton.addEventListener('click', function(e) {
    console.log('Save button clicked');
    e.preventDefault();
    saveSettings();
  });
  
  // Add input listener to API key
  elements.apiKeyInput.addEventListener('input', validateApiKey);
  
  // Load current settings
  loadSettings();
});

// Load current settings from storage
function loadSettings() {
  console.log('Loading settings from storage');
  chrome.storage.sync.get(['apiKey', 'assistMode', 'usageCount', 'model', 'temperature'], function(settings) {
    console.log('Retrieved settings:', settings);
    
    // Set API key
    if (settings.apiKey) {
      document.getElementById('apiKey').value = settings.apiKey;
    }
    
    // Set assist mode
    if (settings.assistMode) {
      const assistModeSelect = document.getElementById('assistMode');
      assistModeSelect.value = settings.assistMode;
    }
    
    // Set model
    if (settings.model) {
      const modelSelect = document.getElementById('model');
      modelSelect.value = settings.model;
    }
    
    // Set temperature
    if (settings.temperature !== undefined) {
      const temperatureInput = document.getElementById('temperature');
      const temperatureValue = document.getElementById('temperatureValue');
      temperatureInput.value = settings.temperature;
      temperatureValue.textContent = settings.temperature;
    }
    
    // Set usage count
    if (settings.usageCount !== undefined) {
      document.getElementById('usageCount').textContent = settings.usageCount;
    }
  });
}

// Function to save settings
function saveSettings() {
  console.log('saveSettings function called');
  
  const elements = {
    apiKey: document.getElementById('apiKey'),
    model: document.getElementById('model'),
    temperature: document.getElementById('temperature'),
    assistMode: document.getElementById('assistMode'),
    saveButton: document.getElementById('saveSettings')
  };
  
  const settings = {
    apiKey: elements.apiKey.value.trim(),
    model: elements.model.value,
    temperature: parseFloat(elements.temperature.value) || CONFIG.defaultTemperature,
    assistMode: elements.assistMode.value || CONFIG.defaultMode
  };
  
  console.log('Attempting to save settings:', {
    apiKeyLength: settings.apiKey.length,
    apiKeyPrefix: settings.apiKey.substring(0, 7),
    model: settings.model,
    temperature: settings.temperature,
    assistMode: settings.assistMode
  });
  
  // Show loading state
  const originalText = elements.saveButton.textContent;
  elements.saveButton.textContent = 'Saving...';
  elements.saveButton.disabled = true;
  
  // Validate API key format
  const validation = validateApiKeyFormat(settings.apiKey);
  if (!validation.isValid) {
    console.error('API key validation failed:', validation.message);
    showStatusMessage(validation.message, true);
    elements.saveButton.textContent = originalText;
    elements.saveButton.disabled = false;
    return;
  }
  
  // Save settings
  chrome.storage.sync.set(settings, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving settings:', chrome.runtime.lastError);
      showStatusMessage('Failed to save settings: ' + chrome.runtime.lastError.message, true);
      elements.saveButton.textContent = originalText;
      elements.saveButton.disabled = false;
      return;
    }
    
    console.log('Settings saved successfully');
    showStatusMessage('Settings saved successfully!');
    elements.saveButton.textContent = 'Saved!';
    
    setTimeout(() => {
      elements.saveButton.textContent = originalText;
      elements.saveButton.disabled = false;
    }, 2000);
  });
}

// Function to validate API key format
function validateApiKeyFormat(apiKey) {
  // Groq API keys start with 'gsk_' and are typically around 50-60 characters
  const isValidFormat = apiKey.startsWith('gsk_') && apiKey.length >= 40;
  return {
    isValid: isValidFormat,
    message: isValidFormat ? '' : 'Invalid API key format. Groq API keys start with "gsk_" and are typically around 50-60 characters long.'
  };
}

// Show status message
function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.className = `status-message ${isError ? 'error' : 'success'}`;
  
  setTimeout(() => {
    statusElement.className = 'status-message';
  }, 3000);
}

// Function to validate API key with server
async function validateApiKey(apiKey) {
  console.log('Validating API key with server...');
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: CONFIG.models.default,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' }
        ],
        max_tokens: 1
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API validation failed:', errorData);
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    console.log('API key validation successful');
    return true;
  } catch (error) {
    console.error('API key validation error:', error);
    throw error;
  }
} 