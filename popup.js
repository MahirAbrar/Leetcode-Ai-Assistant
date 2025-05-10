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
        default: { name: 'Llama 4 Scout (17B)', description: 'Best overall performance. Great balance of speed and capability. Recommended for most users.' },
        advanced: { name: 'Mixtral 8x7B', description: 'Excellent reasoning with higher token limit. Good for complex multi-step problems. Medium cost.' },
        llama3: { name: 'Llama 3 (70B)', description: 'Most powerful model. Best for difficult problems but slower response time. Higher cost.' },
        gemma: { name: 'Gemma 7B', description: 'Lightweight model with good performance. Fast responses at lower cost. Good for simpler problems.' },
        mistral: { name: 'Mistral 7B', description: 'Efficient model with excellent speed. Lowest cost option with responsive performance.' }
      }
    },
    openai: {
      keyPlaceholder: 'Enter your OpenAI API key',
      keyHelp: 'Get a key from OpenAI',
      keyFormat: apiKey => apiKey.startsWith('sk-') && apiKey.length >= 40,
      keyFormatError: 'Invalid API key format. OpenAI API keys start with "sk-" and are typically around 50-60 characters long.',
      modelDetails: {
        default: { name: 'GPT-4o', description: 'Flagship model with excellent reasoning. Best balance of quality and speed. Medium-high cost.' },
        advanced: { name: 'GPT-4.1', description: 'Latest GPT model with advanced reasoning. Best quality but higher cost. Good for complex problems.' },
        llama3: { name: 'GPT-4.1 (High Precision)', description: 'Premium configuration for maximum accuracy. Highest cost but best results for difficult problems.' },
        gemma: { name: 'GPT-4.1-mini', description: 'Efficient GPT-4.1 variant that is faster at lower cost. Good balance for most problems.' },
        mistral: { name: 'GPT-4o-mini', description: 'Fast and efficient model with lowest cost. Quick responses for simpler problems.' }
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
  
  // Initialize model options based on initial provider selection (before loading settings)
  const initialProvider = elements.apiProviderSelect.value;
  updateModelOptions(initialProvider);
  console.log('Initialized model options for provider:', initialProvider);
  
  // IMPORTANT: Load settings FIRST before setting up any event handlers
  // This ensures saved settings take precedence over default values
  loadSettings();
  
  // Initialize temperature slider AFTER settings are loaded
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
    console.log('Updated model options for provider:', provider);
    
    validateApiKey();
    
    showStatusMessage(`API provider changed to ${provider}`, false);
  });
  
  // Add model change listener
  elements.modelSelect.addEventListener('change', function(e) {
    const model = this.value;
    const tempConfig = CONFIG.modelTemperatures[model];
    
    // Check if this is a user-initiated change (not from loading settings)
    const isUserChange = e.isTrusted;
    
    if (isUserChange) {
      console.log('User changed model to:', model);
      elements.temperatureInput.min = tempConfig.min;
      elements.temperatureInput.max = tempConfig.max;
      elements.temperatureInput.step = tempConfig.step;
      elements.temperatureInput.value = tempConfig.default;
      elements.temperatureValue.textContent = tempConfig.default;
      
      showStatusMessage(`Temperature range adjusted for ${this.options[this.selectedIndex].text}`, false);
    } else {
      console.log('Model set programmatically to:', model);
      // Don't reset temperature to default if loading from settings
    }
  });
});

// Additionally, listen for visibility changes to reload settings when popup regains focus
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    console.log('Popup became visible again, reloading settings');
    loadSettings();
  }
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
  console.log('Loading settings from storage...');
  
  chrome.storage.sync.get(['apiKey', 'apiProvider', 'assistMode', 'usageCount', 'model', 'temperature'], function(settings) {
    if (chrome.runtime.lastError) {
      console.error('Error loading settings from chrome.storage.sync:', chrome.runtime.lastError);
      
      // Try to load from localStorage as fallback
      try {
        const localSettings = localStorage.getItem('leetcode_assistant_settings');
        if (localSettings) {
          console.log('Found settings in localStorage, using as fallback');
          settings = JSON.parse(localSettings);
        }
      } catch (e) {
        console.error('Failed to load settings from localStorage:', e);
        showStatusMessage('Failed to load settings', true);
        return;
      }
    }
    
    console.log('Settings retrieved:', {
      hasApiKey: !!settings.apiKey,
      apiKeyLength: settings.apiKey ? settings.apiKey.length : 0,
      apiProvider: settings.apiProvider,
      assistMode: settings.assistMode,
      model: settings.model,
      temperature: settings.temperature,
      usageCount: settings.usageCount
    });
    
    // Apply settings to form elements in a specific order to avoid overrides
    
    // 1. First set the API provider (this affects model options)
    if (settings.apiProvider) {
      elements.apiProviderSelect.value = settings.apiProvider;
      // Update placeholder and help text based on provider
      const providerConfig = CONFIG.apiProviders[settings.apiProvider];
      elements.apiKeyInput.placeholder = providerConfig.keyPlaceholder;
      elements.apiKeyHelp.textContent = providerConfig.keyHelp;
      
      // Update model options based on provider
      updateModelOptions(settings.apiProvider);
    }
    
    // 2. Set the model (affects temperature range)
    if (settings.model) {
      elements.modelSelect.value = settings.model;
      
      // Update temperature range based on model without changing value
      const model = settings.model;
      const tempConfig = CONFIG.modelTemperatures[model];
      elements.temperatureInput.min = tempConfig.min;
      elements.temperatureInput.max = tempConfig.max;
      elements.temperatureInput.step = tempConfig.step;
    }
    
    // 3. Set the temperature (should be done after model to avoid overriding)
    if (settings.temperature) {
      console.log('Setting temperature to saved value:', settings.temperature);
      elements.temperatureInput.value = settings.temperature;
      elements.temperatureValue.textContent = settings.temperature;
    }
    
    // 4. Set other settings that don't depend on each other
    if (settings.apiKey) {
      elements.apiKeyInput.value = settings.apiKey;
    }
    
    if (settings.assistMode) {
      elements.assistModeSelect.value = settings.assistMode;
    }
    
    if (settings.usageCount) {
      document.getElementById('usageCount').textContent = settings.usageCount;
    }
    
    validateApiKey();
    showStatusMessage('Settings loaded successfully');
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
      // Display the actual model name as the option text
      option.text = modelDetail.name;
      
      // Set detailed description as the title (tooltip)
      option.title = modelDetail.description;
      
      // Add visual indicator for performance characteristics 
      let indicator = '';
      
      if (modelKey === 'default') {
        indicator = '⭐ '; // Recommended
      } else if (modelKey === 'advanced') {
        indicator = '🔍 '; // Best quality
      } else if (modelKey === 'llama3') {
        indicator = '🚀 '; // Most powerful
      } else if (modelKey === 'gemma') {
        indicator = '⚖️ '; // Balanced
      } else if (modelKey === 'mistral') {
        indicator = '⚡ '; // Fast & efficient
      }
      
      // Combine indicator with model name
      option.text = indicator + modelDetail.name;
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
  
  // Also save to local storage as a backup
  try {
    localStorage.setItem('leetcode_assistant_settings', JSON.stringify(settings));
    console.log('Settings saved to localStorage as backup');
  } catch (e) {
    console.warn('Could not save settings to localStorage:', e);
  }
  
  // Save to synced storage
  saveToSyncedStorage(settings)
    .then(() => {
      console.log('Settings saved successfully to chrome.storage.sync');
      showStatusMessage('Settings saved successfully!');
      elements.saveButton.textContent = 'Saved!';
      
      // Try to reload settings to verify they were saved correctly
      return verifySettings(settings);
    })
    .catch((error) => {
      console.error('Error saving settings:', error);
      showStatusMessage('Failed to save settings: ' + error.message, true);
    })
    .finally(() => {
      setTimeout(() => {
        elements.saveButton.textContent = originalText;
        elements.saveButton.disabled = false;
      }, 2000);
    });
}

// Function to save settings to synced storage
function saveToSyncedStorage(settings) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(settings, function() {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

// Function to verify settings were saved correctly
function verifySettings(originalSettings) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(Object.keys(originalSettings), function(savedSettings) {
      if (chrome.runtime.lastError) {
        console.warn('Could not verify saved settings:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        // Check that all settings were saved correctly
        let allCorrect = true;
        const differences = {};
        
        // Compare each setting
        for (const key in originalSettings) {
          if (JSON.stringify(savedSettings[key]) !== JSON.stringify(originalSettings[key])) {
            allCorrect = false;
            differences[key] = {
              original: originalSettings[key],
              saved: savedSettings[key]
            };
          }
        }
        
        if (allCorrect) {
          console.log('All settings verified to be saved correctly');
          resolve(true);
        } else {
          console.warn('Some settings were not saved correctly:', differences);
          // We'll still resolve because the save technically worked
          resolve(false);
        }
      }
    });
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