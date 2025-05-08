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
  defaultMode: 'Small Hints',
  modelTemperatures: {
    default: { min: 0.3, max: 0.9, step: 0.1, default: 0.7 },
    advanced: { min: 0.2, max: 0.8, step: 0.1, default: 0.6 },
    llama3: { min: 0.1, max: 0.7, step: 0.1, default: 0.5 },
    gemma: { min: 0.4, max: 1.0, step: 0.1, default: 0.8 },
    mistral: { min: 0.3, max: 0.9, step: 0.1, default: 0.7 }
  },
  apiProviders: {
    groq: {
      keyPlaceholder: 'Enter your Groq API key',
      keyHelp: 'Get a key from Groq',
      keyFormat: apiKey => apiKey.startsWith('gsk_') && apiKey.length >= 40,
      keyFormatError: 'Invalid API key format. Groq API keys start with "gsk_" and are typically around 50-60 characters long.',
      modelDetails: {
        default: { name: 'Llama 4 Scout (17B)', description: 'Fast and efficient 17B parameter model, great for quick hints' },
        advanced: { name: 'Mixtral 8x7B', description: 'Powerful 8x7B parameter model, excellent for detailed problem analysis' },
        llama3: { name: 'Llama 3 (70B)', description: 'State-of-the-art 70B parameter model, best for complex problems' },
        gemma: { name: 'Gemma 7B', description: 'Lightweight 7B parameter model, good for quick responses' },
        mistral: { name: 'Mistral 7B', description: 'Efficient 7B parameter model, great balance of speed and capability' }
      }
    },
    openai: {
      keyPlaceholder: 'Enter your OpenAI API key',
      keyHelp: 'Get a key from OpenAI',
      keyFormat: apiKey => apiKey.startsWith('sk-') && apiKey.length >= 40,
      keyFormatError: 'Invalid API key format. OpenAI API keys start with "sk-" and are typically around 50-60 characters long.',
      modelDetails: {
        default: { name: 'GPT-4o', description: 'Latest multi-modal model with excellent reasoning capabilities' },
        advanced: { name: 'GPT-4.1', description: 'Newest generation model with advanced reasoning abilities' },
        llama3: { name: 'GPT-4.1 (High Precision)', description: 'GPT-4.1 configured for maximum accuracy and detail' },
        gemma: { name: 'GPT-4.1-mini', description: 'Compact version of GPT-4.1 with excellent performance' },
        mistral: { name: 'GPT-4o-mini', description: 'Lightweight version of GPT-4o offering speed and efficiency' }
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup DOM loaded');
  
  // Initialize all elements
  const elements = {
    saveButton: document.getElementById('saveSettings'),
    apiKeyInput: document.getElementById('apiKey'),
    apiProviderSelect: document.getElementById('apiProvider'),
    apiKeyHelp: document.getElementById('apiKeyHelp'),
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
  
  // Add API provider change listener
  elements.apiProviderSelect.addEventListener('change', function() {
    const provider = this.value;
    const providerConfig = CONFIG.apiProviders[provider];
    
    // Update API key input placeholder and help text
    elements.apiKeyInput.placeholder = providerConfig.keyPlaceholder;
    elements.apiKeyHelp.textContent = providerConfig.keyHelp;
    
    // Update model option texts and descriptions
    updateModelOptions(provider);
    
    validateApiKey();
    
    showStatusMessage(`API provider changed to ${provider}`, false);
  });
  
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
  const apiProvider = elements.apiProviderSelect.value;
  const statusElement = document.getElementById('apiKeyStatus');
  
  if (!apiKey) {
    statusElement.className = 'api-key-status invalid';
    return;
  }
  
  // Send message to background script to validate API key
  chrome.runtime.sendMessage({ 
    action: 'checkApiKeyStatus',
    apiKey: apiKey,
    apiProvider: apiProvider
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
    }
    if (settings.apiProvider) {
      elements.apiProviderSelect.value = settings.apiProvider;
      // Update placeholder and help text based on provider
      const providerConfig = CONFIG.apiProviders[settings.apiProvider];
      elements.apiKeyInput.placeholder = providerConfig.keyPlaceholder;
      elements.apiKeyHelp.textContent = providerConfig.keyHelp;
      
      // Update model options based on provider
      updateModelOptions(settings.apiProvider);
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
    
    validateApiKey();
  });
}

// Function to update model options based on the selected provider
function updateModelOptions(provider) {
  const modelSelect = document.getElementById('model');
  const modelOptions = modelSelect.options;
  const providerModelDetails = CONFIG.apiProviders[provider].modelDetails;
  
  for (let i = 0; i < modelOptions.length; i++) {
    const option = modelOptions[i];
    const modelKey = option.value;
    const modelDetail = providerModelDetails[modelKey];
    
    if (modelDetail) {
      option.text = modelDetail.name;
      option.title = modelDetail.description;
    }
  }
}

// Function to save settings
function saveSettings() {
  console.log('saveSettings function called');
  
  const elements = {
    apiKey: document.getElementById('apiKey'),
    apiProvider: document.getElementById('apiProvider'),
    model: document.getElementById('model'),
    temperature: document.getElementById('temperature'),
    assistMode: document.getElementById('assistMode'),
    saveButton: document.getElementById('saveSettings')
  };
  
  const settings = {
    apiKey: elements.apiKey.value.trim(),
    apiProvider: elements.apiProvider.value,
    model: elements.model.value,
    temperature: parseFloat(elements.temperature.value) || CONFIG.defaultTemperature,
    assistMode: elements.assistMode.value || CONFIG.defaultMode
  };
  
  console.log('Attempting to save settings:', {
    apiKeyLength: settings.apiKey.length,
    apiKeyPrefix: settings.apiKey.substring(0, 7),
    apiProvider: settings.apiProvider,
    model: settings.model,
    temperature: settings.temperature,
    assistMode: settings.assistMode
  });
  
  // Show loading state
  const originalText = elements.saveButton.textContent;
  elements.saveButton.textContent = 'Saving...';
  elements.saveButton.disabled = true;
  
  // Validate API key format
  const validation = validateApiKeyFormat(settings.apiKey, settings.apiProvider);
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
function validateApiKeyFormat(apiKey, provider) {
  const providerConfig = CONFIG.apiProviders[provider];
  const isValidFormat = providerConfig.keyFormat(apiKey);
  
  return {
    isValid: isValidFormat,
    message: isValidFormat ? '' : providerConfig.keyFormatError
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