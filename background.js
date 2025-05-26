// LeetCode AI Assistant Background Script
// This script runs in the extension background and handles API calls

// Configuration
const API_CONFIG = {
  // Groq API endpoint
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    models: {
      default: "meta-llama/llama-4-scout-17b-16e-instruct",
      advanced: "mixtral-8x7b-32768",
      llama3: "meta-llama/llama-3-70b-instruct",
      gemma: "google/gemma-7b-it",
      mistral: "mistralai/mistral-7b-instruct",
    },
  },

  // OpenAI API endpoint
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    models: {
      default: "gpt-4o",
      advanced: "gpt-4.1",
      llama3: "gpt-4.1",
      gemma: "gpt-4.1-mini",
      mistral: "gpt-4o-mini",
    },
  },

  // Fallback messages when no API key is set
  fallback: {
    "Small Hints": "Please set the API key at settings",
    "Medium Hints": "Please set the API key at settings",
    "Big Hints": "Please set the API key at settings",
    "Metaphorical Hints": "Please set the API key at settings",
  },
};

// Mode-specific prompts
const PROMPTS = {
  "Small Hints": `
You are an expert computer science data structures and algorithms tutor. 
Look at the given code, if any and provide small hints on how to solve the leetcode question.
The hint will be small and concise.`,

  "Medium Hints": `
You are an expert computer science data structures and algorithms tutor. 
Identify different ways to solve the problem and provide a semi-detailed explanation on how to solve the leetcode problem.
Refer how much code the user has written, if any, and guide them further.`,

  "Big Hints": `
You are an expert computer science data structures and algorithms tutor. 
Give detailed instructions on how to solve the leetcode problem. If the user has written code, refer to it and guide them further so that they can complete the code and does not require any more guidance.`,

  "Metaphorical Hints": `
You are a creative explainer who is an expert computer science data structures and algorithms tutor.
Your task is to give metaphircal hints using everyday concepts to solve the leetcode problem. Do not include any code or technical concepts.`,
};

// Helper function to send startup message to LeetCode tabs
function sendStartupMessage() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url && tab.url.includes("leetcode.com")) {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "backgroundScriptStarted",
            timestamp: new Date().toISOString(),
          })
          .catch(() => {
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
    assistMode: "Small Hints",
    apiKey: "",
    apiProvider: "groq",
    usageCount: 0,
    model: "default",
    temperature: 0.7,
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
  if (message.action === "checkApiKeyStatus") {
    chrome.storage.sync.get(
      ["apiKey", "apiProvider", "storageMode"],
      function (settings) {
        // Use provided API key from message, or load from storage
        let apiKey = message.apiKey;
        const apiProvider =
          message.apiProvider || settings.apiProvider || "groq";

        // If no API key provided in message, use the one from settings
        if (!apiKey) {
          apiKey = settings.apiKey;
        }

        // Load API key from appropriate storage location
        loadApiKeyFromStorage({ ...settings, apiKey })
          .then((finalSettings) => {
            const finalApiKey = finalSettings.apiKey;

            if (!finalApiKey) {
              sendResponse({ hasApiKey: false });
              return;
            }

            validateApiKey(finalApiKey, apiProvider)
              .then((isValid) => {
                sendResponse({
                  hasApiKey: true,
                  isValid: isValid,
                  apiKeyLength: finalApiKey.length,
                  apiKeyPrefix: finalApiKey.substring(0, 7),
                  apiKeySuffix: finalApiKey.substring(finalApiKey.length - 4),
                });
              })
              .catch(() => {
                sendResponse({ hasApiKey: false });
              });
          })
          .catch(() => {
            sendResponse({ hasApiKey: false });
          });
      }
    );
    return true;
  }

  if (message.action === "getAIAssistance") {
    // First get settings from Chrome storage
    chrome.storage.sync.get(
      [
        "apiKey",
        "model",
        "temperature",
        "apiProvider",
        "assistMode",
        "storageMode",
      ],
      (settings) => {
        // Check if we need to load API key from local storage (local-only mode)
        loadApiKeyFromStorage(settings)
          .then((finalSettings) => {
            if (!finalSettings.apiKey) {
              // Get the appropriate fallback message based on mode
              const mode =
                message.data.mode || finalSettings.assistMode || "Small Hints";
              const fallbackMsg =
                API_CONFIG.fallback[mode] || API_CONFIG.fallback["Small Hints"];
              sendResponse({ error: fallbackMsg, isApiKeyMissing: true });
              return;
            }

            validateApiKey(finalSettings.apiKey, finalSettings.apiProvider)
              .then((isValid) => {
                if (!isValid) {
                  sendResponse({
                    error:
                      "Invalid API key. Please check your API key in the extension settings.",
                    isApiKeyInvalid: true,
                  });
                  return;
                }

                getAIAssistance(message.data, finalSettings)
                  .then((response) => {
                    sendResponse({ answer: response });
                  })
                  .catch((error) => {
                    sendResponse({
                      error:
                        error.message ||
                        "Failed to get AI assistance. Please try again.",
                    });
                  });
              })
              .catch((error) => {
                sendResponse({
                  error: `API key validation failed: ${error.message}. Please check your API key in the extension settings.`,
                  isApiKeyInvalid: true,
                });
              });
          })
          .catch((error) => {
            sendResponse({
              error: "Failed to load API key from storage: " + error.message,
            });
          });
      }
    );
    return true;
  }

  if (message.action === "saveSettings") {
    saveSettings(message.settings, sendResponse);
    return true;
  }

  if (message.action === "getSettings") {
    getSettings(sendResponse);
    return true;
  }

  // Add a new listener for toggling debug mode
  if (message.action === "toggleDebugMode") {
    chrome.storage.sync.get(["debugMode"], function (settings) {
      const newDebugMode = !settings.debugMode;
      chrome.storage.sync.set({ debugMode: newDebugMode }, function () {
        console.log(`Debug mode ${newDebugMode ? "enabled" : "disabled"}`);
        sendResponse({ success: true, debugMode: newDebugMode });
      });
    });
    return true;
  }

  // Listen for settings updates from options page
  if (message.action === "settingsUpdated") {
    console.log("Settings updated notification received:", message);
    // Settings have been updated, any cached values should be invalidated
    sendResponse({ success: true });
    return true;
  }

  // Handle request for local usage statistics
  if (message.action === "getLocalUsage") {
    getLocalUsageCount()
      .then((usageData) => {
        sendResponse(usageData);
      })
      .catch((error) => {
        console.error("Failed to get local usage:", error);
        sendResponse({ totalQueries: 0, lastUsed: null });
      });
    return true;
  }

  // Handle request to clear local usage statistics
  if (message.action === "clearLocalUsage") {
    clearLocalUsageCount()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Failed to clear local usage:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// Get AI assistance based on problem, code, and mode
async function getAIAssistance(data, settings) {
  try {
    // Get mode from data or settings, with proper logging
    const mode = data.mode || settings.assistMode || "Small Hints";

    console.log("===== LeetCode AI Assistant Mode =====");
    console.log(`Requested mode: ${data.mode}`);
    console.log(`Settings mode: ${settings.assistMode}`);
    console.log(`Using mode: ${mode}`);

    // Verify that we have a prompt for this mode
    if (!PROMPTS[mode]) {
      console.warn(`Unknown mode: ${mode}, falling back to Small Hints`);
    }

    const prompt = getPromptForMode(mode, data.problem, data.code);
    const response = await fetchAIResponse(prompt, settings);

    // Increment usage count in localStorage
    incrementLocalUsageCount();

    return response;
  } catch (error) {
    let errorMessage = "Error getting AI assistance: ";

    if (error.message.includes("API key")) {
      errorMessage =
        "Invalid API key. Please check your API key in the extension settings.";
    } else if (error.message.includes("rate limit")) {
      errorMessage =
        "You've hit the API rate limit. Please try again later or check your account usage.";
    } else if (error.message.includes("quota")) {
      errorMessage =
        "Your API usage quota has been exceeded. Please check your billing information or use a different API key.";
    } else if (error.message.includes("network")) {
      errorMessage =
        "Network error. Please check your internet connection and try again.";
    } else {
      errorMessage += error.message;
    }

    throw new Error(errorMessage);
  }
}

// Get the appropriate prompt based on mode
function getPromptForMode(mode, problem, code) {
  const basePrompt = PROMPTS[mode] || PROMPTS["Small Hints"];

  const fullPrompt = `${basePrompt}

PROBLEM:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
URL: ${problem.url || "Not provided"}

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
    const apiProvider = settings.apiProvider || "groq";
    const modelKey = settings.model || "default";
    const model = API_CONFIG[apiProvider].models[modelKey];
    const endpoint = API_CONFIG[apiProvider].endpoint;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "system", content: prompt }],
        max_tokens: 1000,
        temperature: settings.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message ||
          `API request failed with status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid API response format");
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    if (error.message.includes("API key")) {
      throw new Error(
        "Invalid API key. Please check your API key in the extension settings."
      );
    } else if (error.message.includes("rate limit")) {
      throw new Error(
        "You've hit the API rate limit. Please try again later or check your account usage."
      );
    } else if (error.message.includes("quota")) {
      throw new Error(
        "Your API usage quota has been exceeded. Please check your billing information or use a different API key."
      );
    } else if (error.message.includes("network")) {
      throw new Error(
        "Network error. Please check your internet connection and try again."
      );
    }

    throw error;
  }
}

// Save user settings
function saveSettings(settings, sendResponse) {
  console.log("Saving settings:", settings);

  chrome.storage.sync.set(settings, function () {
    // If assist mode changed, notify all open tabs
    if (settings.assistMode) {
      console.log("Assist mode changed to:", settings.assistMode);

      chrome.tabs.query({}, function (tabs) {
        tabs.forEach((tab) => {
          // Only send to LeetCode tabs
          if (tab.url && tab.url.includes("leetcode.com")) {
            chrome.tabs.sendMessage(tab.id, {
              action: "modeChanged",
              mode: settings.assistMode,
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
  chrome.storage.sync.get(
    [
      "apiKey",
      "apiProvider",
      "assistMode",
      "usageCount",
      "model",
      "temperature",
    ],
    function (settings) {
      sendResponse(settings);
    }
  );
}

// Helper function to strip HTML from problem description
function stripHtml(html) {
  if (!html) return "";

  const temp = document.createElement("div");
  temp.innerHTML = html;

  const pres = temp.querySelectorAll("pre");
  pres.forEach((pre) => {
    pre.textContent = "\n```\n" + pre.textContent.trim() + "\n```\n";
  });

  const codes = temp.querySelectorAll("code:not(pre code)");
  codes.forEach((code) => {
    code.textContent = "`" + code.textContent + "`";
  });

  return temp.textContent || "";
}

// Helper function to load API key from appropriate storage
async function loadApiKeyFromStorage(settings) {
  return new Promise((resolve, reject) => {
    // Check if API key is stored locally (indicated by placeholder)
    if (settings.apiKey === "LOCAL_STORAGE_ONLY" || settings.storageMode) {
      console.log(
        "Local-only storage mode detected, loading API key from localStorage"
      );

      // Get API key from localStorage via content script
      getApiKeyFromLocalStorage()
        .then((localApiKey) => {
          if (localApiKey) {
            settings.apiKey = localApiKey;
            console.log("Successfully loaded API key from localStorage");
          } else {
            console.log("No API key found in localStorage");
            settings.apiKey = null;
          }
          resolve(settings);
        })
        .catch((error) => {
          console.error("Failed to load API key from localStorage:", error);
          settings.apiKey = null;
          resolve(settings);
        });
    } else {
      // Use the API key from Chrome storage (default behavior)
      resolve(settings);
    }
  });
}

// Helper function to get API key from localStorage
async function getApiKeyFromLocalStorage() {
  return new Promise((resolve, reject) => {
    // Try to find a LeetCode tab to execute the localStorage access
    chrome.tabs.query({ url: "*://*.leetcode.com/*" }, function (tabs) {
      if (tabs.length > 0) {
        // Execute script in LeetCode tab to access localStorage
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: () => {
              try {
                // Try encrypted storage first
                const encryptedData = localStorage.getItem(
                  "leetcode_ai_assistant_sensitive"
                );
                if (encryptedData) {
                  try {
                    const shifted = atob(encryptedData);
                    const original = shifted
                      .split("")
                      .map((char) =>
                        String.fromCharCode(char.charCodeAt(0) - 3)
                      )
                      .join("");
                    const sensitiveData = JSON.parse(original);
                    if (sensitiveData.apiKey) {
                      return sensitiveData.apiKey;
                    }
                  } catch (e) {
                    console.warn("Failed to decrypt API key:", e);
                  }
                }

                // Fallback to plain localStorage
                const localSettings = localStorage.getItem(
                  "leetcode_ai_assistant_settings"
                );
                if (localSettings) {
                  const parsedSettings = JSON.parse(localSettings);
                  return parsedSettings.apiKey || null;
                }

                return null;
              } catch (error) {
                console.error("Error accessing localStorage:", error);
                return null;
              }
            },
          },
          function (results) {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (results && results[0] && results[0].result) {
              resolve(results[0].result);
            } else {
              resolve(null);
            }
          }
        );
      } else {
        // No LeetCode tab found, cannot access localStorage
        resolve(null);
      }
    });
  });
}

// Helper function to increment local usage count
async function incrementLocalUsageCount() {
  try {
    // Find a LeetCode tab to execute localStorage operations
    chrome.tabs.query({ url: "*://*.leetcode.com/*" }, function (tabs) {
      if (tabs.length > 0) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            try {
              const USAGE_KEY = "leetcode_ai_assistant_usage";
              const currentUsage = localStorage.getItem(USAGE_KEY);
              const usageData = currentUsage
                ? JSON.parse(currentUsage)
                : { totalQueries: 0, lastUsed: null };

              usageData.totalQueries = (usageData.totalQueries || 0) + 1;
              usageData.lastUsed = new Date().toISOString();

              localStorage.setItem(USAGE_KEY, JSON.stringify(usageData));
              console.log(
                `Usage count incremented to: ${usageData.totalQueries}`
              );
            } catch (error) {
              console.error("Failed to increment usage count:", error);
            }
          },
        });
      }
    });
  } catch (error) {
    console.error("Failed to increment local usage count:", error);
  }
}

// Helper function to get local usage count
async function getLocalUsageCount() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: "*://*.leetcode.com/*" }, function (tabs) {
      if (tabs.length > 0) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: () => {
              try {
                const USAGE_KEY = "leetcode_ai_assistant_usage";
                const currentUsage = localStorage.getItem(USAGE_KEY);
                return currentUsage
                  ? JSON.parse(currentUsage)
                  : { totalQueries: 0, lastUsed: null };
              } catch (error) {
                console.error("Error getting usage count:", error);
                return { totalQueries: 0, lastUsed: null };
              }
            },
          },
          function (results) {
            if (chrome.runtime.lastError || !results || !results[0]) {
              resolve({ totalQueries: 0, lastUsed: null });
            } else {
              resolve(results[0].result || { totalQueries: 0, lastUsed: null });
            }
          }
        );
      } else {
        resolve({ totalQueries: 0, lastUsed: null });
      }
    });
  });
}

// Helper function to clear local usage count
async function clearLocalUsageCount() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ url: "*://*.leetcode.com/*" }, function (tabs) {
      if (tabs.length > 0) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: () => {
              try {
                const USAGE_KEY = "leetcode_ai_assistant_usage";
                localStorage.removeItem(USAGE_KEY);
                console.log("Local usage statistics cleared");
                return true;
              } catch (error) {
                console.error("Failed to clear usage statistics:", error);
                return false;
              }
            },
          },
          function (results) {
            if (
              chrome.runtime.lastError ||
              !results ||
              !results[0] ||
              !results[0].result
            ) {
              reject(new Error("Failed to clear local usage statistics"));
            } else {
              resolve(true);
            }
          }
        );
      } else {
        reject(new Error("No LeetCode tab found to clear usage statistics"));
      }
    });
  });
}

// Helper function to validate API key
async function validateApiKey(apiKey, apiProvider) {
  try {
    const provider = apiProvider || "groq";
    const endpoint = API_CONFIG[provider].endpoint;
    const model = API_CONFIG[provider].models.default;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        max_tokens: 1,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API key validation failed: ${
          errorData.error?.message || `HTTP ${response.status}`
        }`
      );
    }

    return true;
  } catch (error) {
    throw error;
  }
}
