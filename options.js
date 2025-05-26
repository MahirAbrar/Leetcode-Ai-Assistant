// LeetCode AI Assistant Options Page Script
// Controls the behavior of the full options page UI

// Configuration (shared with popup.js)
const CONFIG = {
  models: {
    default: "meta-llama/llama-4-scout-17b-16e-instruct",
    advanced: "mixtral-8x7b-32768",
    llama3: "meta-llama/llama-3-70b-instruct",
    gemma: "google/gemma-7b-it",
    mistral: "mistralai/mistral-7b-instruct",
  },
  defaultTemperature: 0.7,
  defaultMode: "Small Hints",
  modelTemperatures: {
    default: { min: 0.3, max: 0.9, step: 0.1, default: 0.7 },
    advanced: { min: 0.2, max: 0.8, step: 0.1, default: 0.6 },
    llama3: { min: 0.1, max: 0.7, step: 0.1, default: 0.5 },
    gemma: { min: 0.4, max: 1.0, step: 0.1, default: 0.8 },
    mistral: { min: 0.3, max: 0.9, step: 0.1, default: 0.7 },
  },
  apiProviders: {
    groq: {
      keyPlaceholder: "Enter your Groq API key",
      keyHelp: "Get a key from Groq",
      keyFormat: (apiKey) => apiKey.startsWith("gsk_") && apiKey.length >= 40,
      keyFormatError:
        'Invalid API key format. Groq API keys start with "gsk_" and are typically around 50-60 characters long.',
      modelDetails: {
        default: {
          name: "Llama 4 Scout (17B)",
          description:
            "Best overall performance. Great balance of speed and capability. Recommended for most users.",
        },
        advanced: {
          name: "Mixtral 8x7B",
          description:
            "Excellent reasoning with higher token limit. Good for complex multi-step problems. Medium cost.",
        },
        llama3: {
          name: "Llama 3 (70B)",
          description:
            "Most powerful model. Best for difficult problems but slower response time. Higher cost.",
        },
        gemma: {
          name: "Gemma 7B",
          description:
            "Lightweight model with good performance. Fast responses at lower cost. Good for simpler problems.",
        },
        mistral: {
          name: "Mistral 7B",
          description:
            "Efficient model with excellent speed. Lowest cost option with responsive performance.",
        },
      },
    },
    openai: {
      keyPlaceholder: "Enter your OpenAI API key",
      keyHelp: "Get a key from OpenAI",
      keyFormat: (apiKey) => apiKey.startsWith("sk-") && apiKey.length >= 40,
      keyFormatError:
        'Invalid API key format. OpenAI API keys start with "sk-" and are typically around 50-60 characters long.',
      modelDetails: {
        default: {
          name: "GPT-4o",
          description:
            "Flagship model with excellent reasoning. Best balance of quality and speed. Medium-high cost.",
        },
        advanced: {
          name: "GPT-4.1",
          description:
            "Latest GPT model with advanced reasoning. Best quality but higher cost. Good for complex problems.",
        },
        llama3: {
          name: "GPT-4.1 (High Precision)",
          description:
            "Premium configuration for maximum accuracy. Highest cost but best results for difficult problems.",
        },
        gemma: {
          name: "GPT-4.1-mini",
          description:
            "Efficient GPT-4.1 variant that is faster at lower cost. Good balance for most problems.",
        },
        mistral: {
          name: "GPT-4o-mini",
          description:
            "Fast and efficient model with lowest cost. Quick responses for simpler problems.",
        },
      },
    },
  },
  // Storage configuration
  storage: {
    LOCAL_STORAGE_KEY: "leetcode_ai_assistant_settings",
    SENSITIVE_DATA_KEY: "leetcode_ai_assistant_sensitive",
    BACKUP_KEY: "leetcode_ai_assistant_backup",
  },
};

// Global elements reference
let elements = {};

// Storage utility functions
const StorageManager = {
  // Save to localStorage with encryption option
  saveToLocal: function (data, isSecure = false) {
    try {
      const key = isSecure
        ? CONFIG.storage.SENSITIVE_DATA_KEY
        : CONFIG.storage.LOCAL_STORAGE_KEY;
      const dataToStore = isSecure
        ? this.encryptData(data)
        : JSON.stringify(data);
      localStorage.setItem(key, dataToStore);
      console.log(
        `Data saved to localStorage (${isSecure ? "encrypted" : "plain"})`
      );
      return true;
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
      return false;
    }
  },

  // Load from localStorage with decryption option
  loadFromLocal: function (isSecure = false) {
    try {
      const key = isSecure
        ? CONFIG.storage.SENSITIVE_DATA_KEY
        : CONFIG.storage.LOCAL_STORAGE_KEY;
      const data = localStorage.getItem(key);
      if (!data) return null;

      return isSecure ? this.decryptData(data) : JSON.parse(data);
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
      return null;
    }
  },

  // Simple encryption for API keys (base64 + simple cipher)
  encryptData: function (data) {
    try {
      const jsonString = JSON.stringify(data);
      // Simple Caesar cipher + base64 for basic obfuscation
      const shifted = jsonString
        .split("")
        .map((char) => String.fromCharCode(char.charCodeAt(0) + 3))
        .join("");
      return btoa(shifted);
    } catch (error) {
      console.error("Encryption failed:", error);
      return JSON.stringify(data);
    }
  },

  // Simple decryption
  decryptData: function (encryptedData) {
    try {
      const shifted = atob(encryptedData);
      const original = shifted
        .split("")
        .map((char) => String.fromCharCode(char.charCodeAt(0) - 3))
        .join("");
      return JSON.parse(original);
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  },

  // Create backup of all settings
  createBackup: function () {
    const timestamp = new Date().toISOString();
    const backup = {
      timestamp,
      settings: this.loadFromLocal(false),
      sensitiveData: this.loadFromLocal(true),
      version: "1.0",
    };

    localStorage.setItem(CONFIG.storage.BACKUP_KEY, JSON.stringify(backup));
    return backup;
  },

  // Clear all local storage
  clearAllLocal: function () {
    localStorage.removeItem(CONFIG.storage.LOCAL_STORAGE_KEY);
    localStorage.removeItem(CONFIG.storage.SENSITIVE_DATA_KEY);
    localStorage.removeItem(CONFIG.storage.BACKUP_KEY);
  },
};

document.addEventListener("DOMContentLoaded", function () {
  console.log("Options page DOM loaded");

  // Initialize all elements
  elements = {
    saveButton: document.getElementById("saveSettings"),
    resetButton: document.getElementById("resetSettings"),
    apiKeyInput: document.getElementById("apiKey"),
    apiProviderSelect: document.getElementById("apiProvider"),
    apiKeyHelp: document.getElementById("apiKeyHelp"),
    modelSelect: document.getElementById("model"),
    assistModeSelect: document.getElementById("assistMode"),
    temperatureInput: document.getElementById("temperature"),
    temperatureValue: document.getElementById("temperatureValue"),
    temperatureMin: document.getElementById("temperatureMin"),
    temperatureMax: document.getElementById("temperatureMax"),
    statusMessage: document.getElementById("statusMessage"),
    apiKeyStatus: document.getElementById("apiKeyStatus"),
    toggleApiKey: document.getElementById("toggleApiKey"),
    usageCount: document.getElementById("usageCount"),
    currentStreak: document.getElementById("currentStreak"),
    groqLink: document.getElementById("groqLink"),
    openaiLink: document.getElementById("openaiLink"),
  };

  // Check if all required elements exist
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Required element not found: ${key}`);
      return;
    }
  }

  // Initialize the page
  initializePage();
});

function initializePage() {
  // Set up initial model options
  updateModelOptions(elements.apiProviderSelect.value);

  // Load settings first (with fallback to local storage)
  loadSettings();

  // Set up event listeners
  setupEventListeners();

  // Initialize temperature display
  updateTemperatureDisplay();

  // Add data management buttons to footer
  addDataManagementButtons();

  console.log("Options page initialized successfully");
}

function addDataManagementButtons() {
  const footerActions = document.querySelector(".footer-actions");

  // Create data management container
  const dataManagementDiv = document.createElement("div");
  dataManagementDiv.className = "data-management";
  dataManagementDiv.innerHTML = `
    <div class="data-management-buttons" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
      <button id="viewStoredKeys" class="data-button" title="View your stored API keys">
        👁️ View Keys
      </button>
      <button id="localBackup" class="data-button" title="Create local backup">
        💾 Backup
      </button>
      <label for="storageMode" style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem;">
        <input type="checkbox" id="storageMode" title="Store API keys locally only (more secure)">
        Local Only
      </label>
    </div>
    
    <!-- API Keys Viewer Modal -->
    <div id="apiKeysModal" class="api-keys-modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>🔑 Stored API Keys</h3>
          <button id="closeModal" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="keys-container">
            <div class="key-info">
              <h4>Chrome Storage (Synced)</h4>
              <div id="syncedKeyInfo" class="key-display">
                <span class="key-label">API Key:</span>
                <span id="syncedKey" class="key-value">Not stored</span>
              </div>
            </div>
            <div class="key-info">
              <h4>Local Storage (Browser Only)</h4>
              <div id="localKeyInfo" class="key-display">
                <span class="key-label">API Key:</span>
                <span id="localKey" class="key-value">Not stored</span>
              </div>
              <div id="encryptedKeyInfo" class="key-display">
                <span class="key-label">Encrypted API Key:</span>
                <span id="encryptedKey" class="key-value">Not stored</span>
              </div>
            </div>
          </div>
          <div class="keys-actions">
            <button id="refreshKeys" class="secondary-button">🔄 Refresh</button>
            <button id="clearLocalKeys" class="danger-button">🗑️ Clear Local Keys</button>
            <button id="clearLocalUsage" class="danger-button">📊 Clear Usage Stats</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Insert before the main footer actions
  footerActions.parentNode.insertBefore(dataManagementDiv, footerActions);

  // Set up event listeners for data management
  setupDataManagementListeners();
}

function setupDataManagementListeners() {
  // View stored API keys
  document.getElementById("viewStoredKeys").addEventListener("click", () => {
    showApiKeysModal();
  });

  // Create local backup
  document.getElementById("localBackup").addEventListener("click", () => {
    try {
      const backup = StorageManager.createBackup();
      showStatusMessage(`Backup created: ${backup.timestamp}`, false);
    } catch (error) {
      showStatusMessage("Failed to create backup: " + error.message, true);
    }
  });

  // Storage mode toggle
  document
    .getElementById("storageMode")
    .addEventListener("change", function () {
      const isLocalOnly = this.checked;
      if (isLocalOnly) {
        showStatusMessage(
          "API keys will be stored locally only (more secure)",
          false
        );
      } else {
        showStatusMessage("API keys will sync across devices", false);
      }
    });

  // Modal event listeners
  document.getElementById("closeModal").addEventListener("click", () => {
    hideApiKeysModal();
  });

  document.getElementById("refreshKeys").addEventListener("click", () => {
    loadStoredApiKeys();
    showStatusMessage("API keys refreshed", false);
  });

  document.getElementById("clearLocalKeys").addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to clear all locally stored API keys? This action cannot be undone."
      )
    ) {
      clearLocalApiKeys();
      loadStoredApiKeys();
      showStatusMessage("Local API keys cleared", false);
    }
  });

  document.getElementById("clearLocalUsage").addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to clear all usage statistics? This action cannot be undone."
      )
    ) {
      clearLocalUsageStats();
      loadLocalUsageStatistics();
      showStatusMessage("Usage statistics cleared", false);
    }
  });

  // Close modal when clicking outside
  document.getElementById("apiKeysModal").addEventListener("click", (e) => {
    if (e.target.id === "apiKeysModal") {
      hideApiKeysModal();
    }
  });
}

function showApiKeysModal() {
  const modal = document.getElementById("apiKeysModal");
  modal.style.display = "flex";
  loadStoredApiKeys();

  // Add escape key listener
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      hideApiKeysModal();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

function hideApiKeysModal() {
  const modal = document.getElementById("apiKeysModal");
  modal.style.display = "none";
}

function loadStoredApiKeys() {
  // Load from Chrome Storage
  chrome.storage.sync.get(["apiKey", "apiProvider"], (syncedData) => {
    const syncedKeyElement = document.getElementById("syncedKey");
    if (syncedData.apiKey) {
      const provider = syncedData.apiProvider || "Unknown";
      const maskedKey = maskApiKey(syncedData.apiKey);
      syncedKeyElement.innerHTML = `
        <div class="key-details">
          <div><strong>Provider:</strong> ${provider}</div>
          <div><strong>Key:</strong> <code>${maskedKey}</code></div>
          <button class="show-key-btn" onclick="toggleKeyVisibility('syncedKey', '${syncedData.apiKey}')">Show Full Key</button>
        </div>
      `;
      syncedKeyElement.className = "key-value stored";
    } else {
      syncedKeyElement.textContent = "Not stored";
      syncedKeyElement.className = "key-value not-stored";
    }
  });

  // Load from Local Storage (plain)
  const localData = StorageManager.loadFromLocal(false);
  const localKeyElement = document.getElementById("localKey");
  if (localData && localData.apiKey) {
    const provider = localData.apiProvider || "Unknown";
    const maskedKey = maskApiKey(localData.apiKey);
    localKeyElement.innerHTML = `
      <div class="key-details">
        <div><strong>Provider:</strong> ${provider}</div>
        <div><strong>Key:</strong> <code>${maskedKey}</code></div>
        <button class="show-key-btn" onclick="toggleKeyVisibility('localKey', '${localData.apiKey}')">Show Full Key</button>
      </div>
    `;
    localKeyElement.className = "key-value stored";
  } else {
    localKeyElement.textContent = "Not stored";
    localKeyElement.className = "key-value not-stored";
  }

  // Load from Local Storage (encrypted)
  const encryptedData = StorageManager.loadFromLocal(true);
  const encryptedKeyElement = document.getElementById("encryptedKey");
  if (encryptedData && encryptedData.apiKey) {
    const maskedKey = maskApiKey(encryptedData.apiKey);
    encryptedKeyElement.innerHTML = `
      <div class="key-details">
        <div><strong>Key:</strong> <code>${maskedKey}</code></div>
        <button class="show-key-btn" onclick="toggleKeyVisibility('encryptedKey', '${encryptedData.apiKey}')">Show Full Key</button>
      </div>
    `;
    encryptedKeyElement.className = "key-value stored";
  } else {
    encryptedKeyElement.textContent = "Not stored";
    encryptedKeyElement.className = "key-value not-stored";
  }
}

function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return "Invalid key";
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = "*".repeat(Math.min(apiKey.length - 8, 20));
  return `${start}${middle}${end}`;
}

function toggleKeyVisibility(elementId, fullKey) {
  const element = document.getElementById(elementId);
  const button = element.querySelector(".show-key-btn");
  const keyDiv =
    element.querySelector(".key-details div:nth-child(2)") ||
    element.querySelector(".key-details div");

  if (button.textContent === "Show Full Key") {
    keyDiv.innerHTML = `<strong>Key:</strong> <code class="full-key">${fullKey}</code>`;
    button.textContent = "Hide Key";
  } else {
    const maskedKey = maskApiKey(fullKey);
    keyDiv.innerHTML = `<strong>Key:</strong> <code>${maskedKey}</code>`;
    button.textContent = "Show Full Key";
  }
}

function clearLocalApiKeys() {
  localStorage.removeItem(CONFIG.storage.LOCAL_STORAGE_KEY);
  localStorage.removeItem(CONFIG.storage.SENSITIVE_DATA_KEY);
}

// Function to load local usage statistics
function loadLocalUsageStatistics() {
  // Request usage data from background script
  chrome.runtime.sendMessage({ action: "getLocalUsage" }, function (usageData) {
    if (chrome.runtime.lastError) {
      console.error("Failed to load local usage:", chrome.runtime.lastError);
      elements.usageCount.textContent = "0";
      if (elements.currentStreak) {
        elements.currentStreak.textContent = "0";
      }
      return;
    }

    // Update usage count
    elements.usageCount.textContent = usageData.totalQueries || 0;

    // Calculate current streak (simplified - days since last use)
    if (elements.currentStreak) {
      if (usageData.lastUsed) {
        const lastUsedDate = new Date(usageData.lastUsed);
        const now = new Date();
        const daysDiff = Math.floor(
          (now - lastUsedDate) / (1000 * 60 * 60 * 24)
        );

        // Simple streak logic: if used within last 7 days, show days since
        if (daysDiff <= 7) {
          elements.currentStreak.textContent =
            daysDiff === 0 ? "Active today" : `${daysDiff} days ago`;
        } else {
          elements.currentStreak.textContent = "Inactive";
        }
      } else {
        elements.currentStreak.textContent = "Never used";
      }
    }

    console.log("Local usage statistics loaded:", usageData);
  });
}

// Function to clear local usage statistics
function clearLocalUsageStats() {
  // Request background script to clear usage data
  chrome.runtime.sendMessage(
    { action: "clearLocalUsage" },
    function (response) {
      if (chrome.runtime.lastError) {
        console.error("Failed to clear local usage:", chrome.runtime.lastError);
      } else {
        console.log("Local usage statistics cleared");
      }
    }
  );
}

function setupEventListeners() {
  // Save button
  elements.saveButton.addEventListener("click", function (e) {
    console.log("Save button clicked");
    e.preventDefault();
    saveSettings();
  });

  // Reset button
  elements.resetButton.addEventListener("click", function (e) {
    console.log("Reset button clicked");
    e.preventDefault();
    resetToDefaults();
  });

  // API key input and validation
  elements.apiKeyInput.addEventListener("input", validateApiKey);

  // API key visibility toggle
  elements.toggleApiKey.addEventListener("click", toggleApiKeyVisibility);

  // API provider change
  elements.apiProviderSelect.addEventListener("change", function () {
    const provider = this.value;
    const providerConfig = CONFIG.apiProviders[provider];

    // Update API key input placeholder and help text
    elements.apiKeyInput.placeholder = providerConfig.keyPlaceholder;
    elements.apiKeyHelp.textContent = providerConfig.keyHelp;

    // Show/hide appropriate API links
    if (provider === "groq") {
      elements.groqLink.style.display = "inline-block";
      elements.openaiLink.style.display = "none";
    } else {
      elements.groqLink.style.display = "none";
      elements.openaiLink.style.display = "inline-block";
    }

    // Update model options
    updateModelOptions(provider);

    validateApiKey();
    showStatusMessage(`API provider changed to ${provider}`, false);
  });

  // Model change
  elements.modelSelect.addEventListener("change", function (e) {
    const model = this.value;
    const tempConfig = CONFIG.modelTemperatures[model];

    // Check if this is a user-initiated change
    const isUserChange = e.isTrusted;

    if (isUserChange) {
      console.log("User changed model to:", model);
      updateTemperatureRange(tempConfig);
      showStatusMessage(
        `Temperature range adjusted for ${
          this.options[this.selectedIndex].text
        }`,
        false
      );
    }
  });

  // Temperature slider
  elements.temperatureInput.addEventListener("input", function () {
    elements.temperatureValue.textContent = this.value;
  });

  // Assist mode change
  elements.assistModeSelect.addEventListener("change", function () {
    showStatusMessage(`Assistance mode changed to ${this.value}`, false);
  });
}

function loadSettings() {
  console.log("Loading settings from storage...");

  // First try to load from Chrome storage
  chrome.storage.sync.get(
    [
      "apiKey",
      "apiProvider",
      "assistMode",
      "usageCount",
      "model",
      "temperature",
      "storageMode",
    ],
    function (settings) {
      if (chrome.runtime.lastError) {
        console.error("Error loading settings:", chrome.runtime.lastError);
        // Fallback to localStorage
        settings = StorageManager.loadFromLocal(false) || {};
        console.log("Loaded settings from localStorage fallback");
      }

      // Load sensitive data (API keys) from local storage if local-only mode
      const isLocalOnly = settings.storageMode || false;
      if (isLocalOnly) {
        const sensitiveData = StorageManager.loadFromLocal(true);
        if (sensitiveData && sensitiveData.apiKey) {
          settings.apiKey = sensitiveData.apiKey;
        }
      }

      console.log("Settings loaded:", {
        hasApiKey: !!settings.apiKey,
        apiKeyLength: settings.apiKey ? settings.apiKey.length : 0,
        apiProvider: settings.apiProvider,
        assistMode: settings.assistMode,
        model: settings.model,
        temperature: settings.temperature,
        usageCount: settings.usageCount,
        storageMode: settings.storageMode,
      });

      // Apply settings to form elements
      if (settings.apiProvider) {
        elements.apiProviderSelect.value = settings.apiProvider;
        // Trigger change event to update UI
        elements.apiProviderSelect.dispatchEvent(new Event("change"));
      }

      if (settings.model) {
        elements.modelSelect.value = settings.model;
        const tempConfig = CONFIG.modelTemperatures[settings.model];
        updateTemperatureRange(tempConfig);
      }

      if (settings.temperature) {
        elements.temperatureInput.value = settings.temperature;
        elements.temperatureValue.textContent = settings.temperature;
      }

      if (settings.apiKey) {
        elements.apiKeyInput.value = settings.apiKey;
      }

      if (settings.assistMode) {
        elements.assistModeSelect.value = settings.assistMode;
      }

      // Load usage statistics from local storage
      loadLocalUsageStatistics();

      // Set storage mode checkbox
      const storageModeCheckbox = document.getElementById("storageMode");
      if (storageModeCheckbox) {
        storageModeCheckbox.checked = isLocalOnly;
      }

      validateApiKey();
      showStatusMessage("Settings loaded successfully");
    }
  );
}

function updateModelOptions(provider) {
  const modelOptions = elements.modelSelect.options;
  const providerModelDetails = CONFIG.apiProviders[provider].modelDetails;

  for (let i = 0; i < modelOptions.length; i++) {
    const option = modelOptions[i];
    const modelKey = option.value;
    const modelDetail = providerModelDetails[modelKey];

    if (modelDetail) {
      option.text = modelDetail.name;
      option.title = modelDetail.description;

      // Add performance indicators
      let indicator = "";
      if (modelKey === "default") indicator = "⭐ ";
      else if (modelKey === "advanced") indicator = "🔍 ";
      else if (modelKey === "llama3") indicator = "🚀 ";
      else if (modelKey === "gemma") indicator = "⚖️ ";
      else if (modelKey === "mistral") indicator = "⚡ ";

      option.text = indicator + modelDetail.name;
    }
  }
}

function updateTemperatureRange(tempConfig) {
  elements.temperatureInput.min = tempConfig.min;
  elements.temperatureInput.max = tempConfig.max;
  elements.temperatureInput.step = tempConfig.step;
  elements.temperatureInput.value = tempConfig.default;
  elements.temperatureValue.textContent = tempConfig.default;

  elements.temperatureMin.textContent = tempConfig.min;
  elements.temperatureMax.textContent = tempConfig.max;
}

function updateTemperatureDisplay() {
  const currentValue = elements.temperatureInput.value;
  elements.temperatureValue.textContent = currentValue;
}

function validateApiKey() {
  const apiKey = elements.apiKeyInput.value;
  const apiProvider = elements.apiProviderSelect.value;

  if (!apiKey) {
    elements.apiKeyStatus.className = "api-key-status invalid";
    return;
  }

  // Send message to background script to validate API key
  chrome.runtime.sendMessage(
    {
      action: "checkApiKeyStatus",
      apiKey: apiKey,
      apiProvider: apiProvider,
    },
    function (response) {
      if (response && response.hasApiKey && response.isValid) {
        elements.apiKeyStatus.className = "api-key-status valid";
      } else {
        elements.apiKeyStatus.className = "api-key-status invalid";
      }
    }
  );
}

function toggleApiKeyVisibility() {
  const isPassword = elements.apiKeyInput.type === "password";
  const showIcon = elements.toggleApiKey.querySelector(".show-icon");
  const hideIcon = elements.toggleApiKey.querySelector(".hide-icon");

  if (isPassword) {
    elements.apiKeyInput.type = "text";
    showIcon.style.display = "none";
    hideIcon.style.display = "inline";
  } else {
    elements.apiKeyInput.type = "password";
    showIcon.style.display = "inline";
    hideIcon.style.display = "none";
  }
}

function saveSettings() {
  console.log("Saving settings...");

  const isLocalOnly = document.getElementById("storageMode")?.checked || false;

  const settings = {
    apiKey: elements.apiKeyInput.value.trim(),
    apiProvider: elements.apiProviderSelect.value,
    model: elements.modelSelect.value,
    temperature:
      parseFloat(elements.temperatureInput.value) || CONFIG.defaultTemperature,
    assistMode: elements.assistModeSelect.value || CONFIG.defaultMode,
    storageMode: isLocalOnly,
  };

  console.log("Settings to save:", {
    apiKeyLength: settings.apiKey.length,
    apiProvider: settings.apiProvider,
    model: settings.model,
    temperature: settings.temperature,
    assistMode: settings.assistMode,
    storageMode: settings.storageMode,
  });

  // Show loading state
  const originalText = elements.saveButton.textContent;
  elements.saveButton.textContent = "Saving...";
  elements.saveButton.disabled = true;
  elements.saveButton.classList.add("loading");

  // Validate API key format
  const validation = validateApiKeyFormat(
    settings.apiKey,
    settings.apiProvider
  );
  if (!validation.isValid) {
    showStatusMessage(validation.message, true);
    resetSaveButton(originalText);
    return;
  }

  // Separate sensitive data if local-only mode
  let settingsToSync = { ...settings };
  let sensitiveData = {};

  if (isLocalOnly) {
    sensitiveData.apiKey = settings.apiKey;
    // Store a placeholder in synced storage to indicate local-only mode
    settingsToSync.apiKey = "LOCAL_STORAGE_ONLY";

    // Save sensitive data locally with encryption
    StorageManager.saveToLocal(sensitiveData, true);
  }

  // Always save to localStorage as backup
  StorageManager.saveToLocal(settings, false);

  // Save to Chrome storage
  chrome.storage.sync.set(settingsToSync, function () {
    if (chrome.runtime.lastError) {
      console.error("Error saving settings:", chrome.runtime.lastError);
      showStatusMessage(
        "Failed to save settings: " + chrome.runtime.lastError.message,
        true
      );
    } else {
      console.log("Settings saved successfully");
      const message = isLocalOnly
        ? "Settings saved! API key stored locally only. Please refresh any open LeetCode pages."
        : "Settings saved successfully! Please refresh any open LeetCode pages.";
      showStatusMessage(message, false);
      elements.saveButton.textContent = "Saved!";

      // Send message to other extension parts to reload settings
      chrome.runtime.sendMessage(
        {
          action: "settingsUpdated",
          isLocalOnly: isLocalOnly,
          timestamp: new Date().toISOString(),
        },
        function (response) {
          console.log("Settings update notification sent");
        }
      );

      // Verify settings were saved
      setTimeout(() => {
        chrome.storage.sync.get(
          Object.keys(settingsToSync),
          function (savedSettings) {
            console.log("Verified saved settings:", savedSettings);
          }
        );
      }, 100);
    }

    setTimeout(() => resetSaveButton(originalText), 2000);
  });
}

function resetSaveButton(originalText) {
  elements.saveButton.textContent = originalText;
  elements.saveButton.disabled = false;
  elements.saveButton.classList.remove("loading");
}

function resetToDefaults() {
  if (
    !confirm(
      "Are you sure you want to reset all settings to their default values? This action cannot be undone."
    )
  ) {
    return;
  }

  const defaultSettings = {
    apiKey: "",
    apiProvider: "groq",
    model: "default",
    temperature: CONFIG.defaultTemperature,
    assistMode: CONFIG.defaultMode,
  };

  // Update UI elements
  elements.apiKeyInput.value = defaultSettings.apiKey;
  elements.apiProviderSelect.value = defaultSettings.apiProvider;
  elements.modelSelect.value = defaultSettings.model;
  elements.temperatureInput.value = defaultSettings.temperature;
  elements.temperatureValue.textContent = defaultSettings.temperature;
  elements.assistModeSelect.value = defaultSettings.assistMode;

  // Trigger change events to update UI properly
  elements.apiProviderSelect.dispatchEvent(new Event("change"));
  elements.modelSelect.dispatchEvent(new Event("change"));

  // Clear API key status
  elements.apiKeyStatus.className = "api-key-status invalid";

  showStatusMessage(
    'Settings reset to defaults. Click "Save Settings" to apply changes.',
    false
  );
}

function validateApiKeyFormat(apiKey, provider) {
  const providerConfig = CONFIG.apiProviders[provider];
  const isValidFormat = providerConfig.keyFormat(apiKey);

  return {
    isValid: isValidFormat,
    message: isValidFormat ? "" : providerConfig.keyFormatError,
  };
}

function showStatusMessage(message, isError = false) {
  const statusElement = elements.statusMessage;
  statusElement.textContent = message;
  statusElement.className = `status-message ${
    isError ? "error" : "success"
  } show`;

  setTimeout(() => {
    statusElement.classList.remove("show");
  }, 5000);
}

// Listen for keyboard shortcuts
document.addEventListener("keydown", function (e) {
  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveSettings();
  }

  // Ctrl/Cmd + R to reset (with confirmation)
  if ((e.ctrlKey || e.metaKey) && e.key === "r") {
    e.preventDefault();
    resetToDefaults();
  }
});

// Auto-save functionality (optional)
let autoSaveTimeout;
function scheduleAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    // Auto-save silently if API key is valid
    if (elements.apiKeyStatus.classList.contains("valid")) {
      console.log("Auto-saving settings...");
      saveSettings();
    }
  }, 5000); // Auto-save after 5 seconds of inactivity
}

// Add auto-save listeners to relevant inputs
["apiKey", "model", "temperature", "assistMode"].forEach((inputId) => {
  const element = elements[inputId];
  if (element) {
    element.addEventListener("change", scheduleAutoSave);
    if (inputId === "apiKey" || inputId === "temperature") {
      element.addEventListener("input", scheduleAutoSave);
    }
  }
});
