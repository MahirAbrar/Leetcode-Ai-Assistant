// LeetCode AI Assistant Popup Script
// Simple interface to open settings and show status

document.addEventListener("DOMContentLoaded", function () {
  console.log("Popup DOM loaded");

  // Initialize elements
  const elements = {
    openFullSettingsButton: document.getElementById("openFullSettings"),
    statusMessage: document.getElementById("statusMessage"),
    apiKeyStatus: document.getElementById("apiKeyStatus"),
    apiStatusText: document.getElementById("apiStatusText"),
    usageCount: document.getElementById("usageCount"),
  };

  // Check if all required elements exist
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Required element not found: ${key}`);
      return;
    }
  }

  // Add click listener to settings button
  elements.openFullSettingsButton.addEventListener("click", function (e) {
    console.log("Settings button clicked");
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Load and display status
  loadStatus();
});

// Function to check API key status and display info
function loadStatus() {
  console.log("Loading status...");

  chrome.storage.sync.get(["apiKey", "apiProvider"], function (settings) {
    // Load usage count from local storage via background script
    chrome.runtime.sendMessage(
      { action: "getLocalUsage" },
      function (usageData) {
        if (usageData && usageData.totalQueries) {
          elements.usageCount.textContent = usageData.totalQueries;
        } else {
          elements.usageCount.textContent = "0";
        }
      }
    );

    // Check API key status
    const apiKey = settings.apiKey;
    const apiProvider = settings.apiProvider || "groq";

    if (!apiKey || apiKey === "LOCAL_STORAGE_ONLY") {
      elements.apiKeyStatus.className = "api-key-status invalid";
      elements.apiStatusText.textContent =
        "⚠️ API key not configured - Click Settings";
      showStatusMessage("Please configure your API key in Settings", false);
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
          elements.apiStatusText.textContent = `✅ ${apiProvider.toUpperCase()} API connected`;
          showStatusMessage("AI Assistant is ready to use!", false);
        } else {
          elements.apiKeyStatus.className = "api-key-status invalid";
          elements.apiStatusText.textContent =
            "❌ API key invalid - Check Settings";
          showStatusMessage("Please check your API key in Settings", false);
        }
      }
    );
  });
}

// Show status message
function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById("statusMessage");
  statusElement.textContent = message;
  statusElement.className = `status-message ${isError ? "error" : "success"}`;

  setTimeout(() => {
    statusElement.className = "status-message";
  }, 4000);
}
