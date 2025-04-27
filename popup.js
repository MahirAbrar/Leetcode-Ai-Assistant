// LeetCode AI Assistant Popup Script
// Controls the behavior of the popup UI

// Configuration
const CONFIG = {
  models: {
    default: 'meta-llama/llama-4-scout-17b-16e-instruct',
    advanced: 'mixtral-8x7b-32768',
    llama3: 'meta-llama/llama-3-70b-instruct',
    gemma: 'google/gemma-7b-it',
    mistral: 'mistralai/mistral-7b-instruct'
  },
  defaultTemperature: 0.7,
  defaultMode: 'hint',
  modelTemperatures: {
    default: { min: 0.3, max: 0.9, step: 0.1, default: 0.7 },
    advanced: { min: 0.2, max: 0.8, step: 0.1, default: 0.6 },
    llama3: { min: 0.1, max: 0.7, step: 0.1, default: 0.5 },
    gemma: { min: 0.4, max: 1.0, step: 0.1, default: 0.8 },
    mistral: { min: 0.3, max: 0.9, step: 0.1, default: 0.7 }
  }
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
    statusMessage: document.getElementById('statusMessage'),
    apiKeyStatus: document.getElementById('apiKeyStatus')
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
  
  // Add model change listener
  elements.modelSelect.addEventListener('change', function() {
    const model = this.value;
    const tempConfig = CONFIG.modelTemperatures[model];
    
    elements.temperatureInput.min = tempConfig.min;
    elements.temperatureInput.max = tempConfig.max;
    elements.temperatureInput.step = tempConfig.step;
    elements.temperatureInput.value = tempConfig.default;
    elements.temperatureValue.textContent = tempConfig.default;
    
    showStatusMessage(`Temperature range adjusted for ${this.options[this.selectedIndex].text}`, false);
  });
  
  // Load current settings
  loadSettings();
});

// Function to validate API key and update status
function validateApiKey() {
  const apiKey = elements.apiKeyInput.value;
  const statusElement = document.getElementById('apiKeyStatus');
  
  if (!apiKey) {
    statusElement.className = 'api-key-status invalid';
    return;
  }
  
  // Send message to background script to validate API key
  chrome.runtime.sendMessage({ 
    action: 'checkApiKeyStatus',
    apiKey: apiKey 
  }, function(response) {
    if (response.hasApiKey) {
      statusElement.className = 'api-key-status valid';
      showStatusMessage('API key is valid', false);
    } else {
      statusElement.className = 'api-key-status invalid';
      showStatusMessage('Invalid API key', true);
    }
  });
}

// Function to load settings and update UI
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, function(settings) {
    if (settings.apiKey) {
      elements.apiKeyInput.value = settings.apiKey;
      validateApiKey();
    }
    if (settings.assistMode) {
      elements.assistModeSelect.value = settings.assistMode;
    }
    if (settings.model) {
      elements.modelSelect.value = settings.model;
    }
    if (settings.temperature) {
      elements.temperatureInput.value = settings.temperature;
      elements.temperatureValue.textContent = settings.temperature;
    }
    if (settings.usageCount) {
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