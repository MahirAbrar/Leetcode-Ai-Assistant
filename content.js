console.log('LeetCode AI Assistant content script loaded!');

// LeetCode AI Assistant Content Script
// This script runs directly on the LeetCode website

// Configuration
const CONFIG = {
  buttonId: 'leetcode-ai-assistant-btn',
  responseContainerId: 'leetcode-ai-assistant-response',
  loadingClass: 'leetcode-ai-loading',
  panelClass: 'leetcode-ai-panel'
};

// Variable to store the current mode
let currentMode = 'hint'; // Default mode: hint, critical-thinking, or problem-solving
let isInitialized = false; // Track if we've already initialized

// Check if current page is a problem page
function isProblemPage() {
  // Only initialize on the main problem page, not the description page
  const isProblem = location.href.includes('/problems/') && 
                   !location.href.includes('/problemset/') && 
                   !location.href.includes('/description/');
  console.log('Is problem page?', isProblem, 'URL:', location.href);
  return isProblem;
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  if (isProblemPage() && !isInitialized) {
    console.log('Initializing on problem page');
    initialize();
  }
});

// Additionally, listen for URL changes (LeetCode is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    console.log('URL changed from', lastUrl, 'to', url);
    lastUrl = url;
    
    // Reset initialization state when URL changes
    isInitialized = false;
    
    if (isProblemPage()) {
      console.log('URL changed to problem page, initializing');
      setTimeout(initialize, 1000); // Wait for page to fully render
    }
  }
}).observe(document, {subtree: true, childList: true});

// Initialize the extension
function initialize() {
  console.log('Starting initialization...');
  
  // Prevent multiple initializations
  if (isInitialized) {
    console.log('Already initialized, skipping');
    return;
  }
  
  // Only run on problem pages
  if (!isProblemPage()) {
    console.log('Not a problem page, skipping initialization');
    return;
  }
  
  // Get saved mode from storage
  chrome.storage.sync.get(['assistMode'], function(result) {
    console.log('Retrieved mode from storage:', result);
    if (result.assistMode) {
      currentMode = result.assistMode;
    }
    
    // Wait for LeetCode editor to load
    waitForEditor().then(() => {
      console.log('Editor loaded, injecting button');
      injectAssistantButton();
      setupCodeChangeListener();
      
      // Check if our panel already exists, if not, create an empty one
      if (!document.getElementById(CONFIG.responseContainerId)) {
        console.log('Creating assistant panel');
        createAssistantPanel();
      }
      
      // Mark as initialized
      isInitialized = true;
    });
  });
}

// Wait for LeetCode's code editor to be loaded
function waitForEditor() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const editor = document.querySelector('.monaco-editor') || 
                    document.querySelector('.CodeMirror');
      if (editor) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
  });
}

// Create the initial AI assistant panel (empty)
function createAssistantPanel() {
  const panel = document.createElement('div');
  panel.id = CONFIG.responseContainerId;
  panel.className = CONFIG.panelClass;
  panel.style.display = 'none'; // Initially hidden
  
  // Panel header
  const header = document.createElement('div');
  header.className = 'ai-response-header';
  header.innerHTML = `
    <span>AI Assistant (${currentMode} mode)</span>
    <button class="ai-close-btn">×</button>
  `;
  panel.appendChild(header);
  
  // Close button functionality
  const closeBtn = header.querySelector('.ai-close-btn');
  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none';
    // Reset button state when panel is closed
    const button = document.getElementById(CONFIG.buttonId);
    if (button) {
      button.classList.remove(CONFIG.loadingClass);
      button.disabled = false;
      button.innerText = 'AI Assist';
    }
  });
  
  // Panel content
  const content = document.createElement('div');
  content.className = 'ai-response-content';
  
  // Add action buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'ai-action-buttons';
  
  const buttons = [
    { id: 'explain-code', text: 'Explain the Code', icon: '💡' },
    { id: 'why-not-working', text: 'Why is it not working?', icon: '❓' },
    { id: 'optimize-code', text: 'Optimize Code', icon: '⚡' },
    { id: 'suggest-approach', text: 'Suggest Approach', icon: '🧠' }
  ];
  
  buttons.forEach(button => {
    const btn = document.createElement('button');
    btn.className = 'ai-action-button';
    btn.id = button.id;
    btn.innerHTML = `${button.icon} ${button.text}`;
    btn.addEventListener('click', () => {
      // Add loading state only when action button is clicked
      toggleLoadingState(true);
      handleActionButtonClick(button.id);
    });
    buttonContainer.appendChild(btn);
  });
  
  content.appendChild(buttonContainer);
  
  // Add chat container
  const chatContainer = document.createElement('div');
  chatContainer.className = 'ai-chat-container';
  content.appendChild(chatContainer);
  
  panel.appendChild(content);
  
  // Find a good place to insert the panel
  insertPanelIntoPage(panel);
  
  return panel;
}

// Insert panel into the best location on the page
function insertPanelIntoPage(panel) {
  // Find the test cases tab content area
  const testCasesTab = document.querySelector('[data-layout-path="/c1/ts1/tabstrip"]');
  if (testCasesTab) {
    // Find the tab content area
    const tabContent = testCasesTab.closest('.flexlayout__tabset').querySelector('.flexlayout__tabset_content');
    if (tabContent) {
      // Insert the panel at the top of the test cases content
      tabContent.insertBefore(panel, tabContent.firstChild);
      return;
    }
  }
  
  // Fallback: Add to the body
  document.body.appendChild(panel);
}

// Inject the AI assistant button into the LeetCode interface
function injectAssistantButton() {
  console.log('Attempting to inject AI assistant button...');
  
  // Find the specific toolbar div the user wants to place the button in
  const toolbarDiv = document.querySelector('.flex.h-8.items-center.justify-between.border-b.p-1');
  console.log('Found toolbar div:', toolbarDiv);
  
  // If we can't find the toolbar, try the previous selectors as fallbacks
  const actionBar = toolbarDiv || 
                   document.querySelector('.action-wrapper') || 
                   document.querySelector('.question-fast-picker-wrapper');
  console.log('Found action bar:', actionBar);
  
  if (!actionBar) {
    console.log('No action bar found! Available elements:', document.body.innerHTML);
    return;
  }
  
  // Check if our button already exists
  if (document.getElementById(CONFIG.buttonId)) {
    console.log('Button already exists');
    return;
  }
  
  // Create button
  const button = document.createElement('button');
  button.id = CONFIG.buttonId;
  button.className = 'ai-assist-button';
  button.innerHTML = 'AI Assist';
  button.title = `Get ${currentMode} from AI`;
  
  // If we found the specific toolbar div, we need to style our button to match the other buttons
  if (toolbarDiv) {
    console.log('Found modern UI toolbar, adding specific styles');
    // Additional styling to match the other buttons in the toolbar
    button.classList.add('relative', 'inline-flex', 'gap-2', 'items-center', 'justify-center', 
                         'font-medium', 'cursor-pointer', 'transition-colors', 'bg-transparent',
                         'enabled:hover:bg-fill-secondary', 'text-caption', 'rounded', 
                         'text-text-primary', 'group', 'ml-auto', 'p-1');
  }
  
  // Add click handler
  button.addEventListener('click', function(e) {
    console.log('AI Assist button clicked');
    e.preventDefault();
    e.stopPropagation();
    handleAssistantRequest();
  });
  
  // Add to page - if it's the toolbar, add it to the buttons div on the right
  if (toolbarDiv) {
    const buttonGroup = toolbarDiv.querySelector('.flex.items-center.gap-1');
    console.log('Found button group:', buttonGroup);
    
    if (buttonGroup) {
      // Insert as the first button in the group
      buttonGroup.insertBefore(button, buttonGroup.firstChild);
      console.log('Button inserted into button group');
    } else {
      // Fallback
      actionBar.appendChild(button);
      console.log('Button added to action bar (fallback)');
    }
  } else {
    // Fallback for other layouts
    actionBar.appendChild(button);
    console.log('Button added to action bar (other layout)');
  }
  
  // Log the final state
  console.log('Button injection complete. Current button state:', button);
}

// Set up listener for code changes
function setupCodeChangeListener() {
  // We'll use a MutationObserver to detect changes to the editor
  // This is a placeholder for actual implementation
  console.log('Code change listener setup');
}

// Handle when user clicks the AI assist button
function handleAssistantRequest() {
  console.log('handleAssistantRequest called');
  
  // Get problem statement and code
  const problemData = extractProblemData();
  const userCode = extractUserCode();
  
  console.log('Problem data:', problemData);
  console.log('User code:', userCode);
  
  // Check if editor is empty
  if (!userCode.trim()) {
    console.log('Editor is empty');
    displayResponse("Please write some code first before asking for assistance.", true);
    return;
  }
  
  // Show the panel with a welcome message
  displayResponse("Click one of the buttons above to get assistance.");
}

// Extract problem statement and details
function extractProblemData() {
  // Get problem title - different selectors to handle various LeetCode UI versions
  const titleElement = document.querySelector('[data-cy="question-title"]') || 
                      document.querySelector('.css-v3d350') || 
                      document.querySelector('title');
  const title = titleElement ? titleElement.textContent : '';
  
  // Get problem description
  const descriptionElement = document.querySelector('[data-cy="question-content"]') || 
                            document.querySelector('.question-content');
  const description = descriptionElement ? descriptionElement.innerHTML : '';
  
  // Get problem difficulty
  const difficultyElement = document.querySelector('.css-10o4wqw') || 
                           document.querySelector('.difficulty-label');
  const difficulty = difficultyElement ? difficultyElement.textContent : '';
  
  // Get the problem URL
  const problemUrl = window.location.href;
  
  return {
    title,
    description,
    difficulty,
    url: problemUrl
  };
}

// Extract user's code from the editor
function extractUserCode() {
  console.log('Attempting to extract user code...');
  
  // Try multiple approaches to get the code
  
  // Approach 1: Try Monaco editor (new LeetCode UI)
  const monacoEditor = document.querySelector('.monaco-editor');
  if (monacoEditor) {
    console.log('Found Monaco editor');
    // Monaco editor stores code in a model
    if (window.monaco && window.monaco.editor) {
      const models = window.monaco.editor.getModels();
      if (models && models.length > 0) {
        const code = models[0].getValue();
        console.log('Extracted code from Monaco model:', code);
        return code;
      }
    }
    
    // Alternative approach for Monaco: look for the textarea
    const textarea = monacoEditor.querySelector('textarea.inputarea');
    if (textarea && textarea.value) {
      console.log('Extracted code from Monaco textarea:', textarea.value);
      return textarea.value;
    }
  }
  
  // Approach 2: Try CodeMirror editor (older LeetCode UI)
  const codeMirror = document.querySelector('.CodeMirror');
  if (codeMirror) {
    console.log('Found CodeMirror editor');
    if (window.CodeMirror) {
      const cm = codeMirror.CodeMirror;
      if (cm && typeof cm.getValue === 'function') {
        const code = cm.getValue();
        console.log('Extracted code from CodeMirror:', code);
        return code;
      }
    }
    
    // Alternative approach for CodeMirror: look for the textarea
    const textarea = codeMirror.querySelector('textarea');
    if (textarea && textarea.value) {
      console.log('Extracted code from CodeMirror textarea:', textarea.value);
      return textarea.value;
    }
  }
  
  // Approach 3: Try to find the code in visible elements
  const editorLines = document.querySelectorAll('.view-lines, .CodeMirror-lines');
  if (editorLines.length > 0) {
    console.log('Found editor lines');
    let code = '';
    editorLines.forEach(line => {
      code += line.textContent + '\n';
    });
    console.log('Extracted code from visible lines:', code);
    return code.trim();
  }
  
  // Approach 4: Try to find the code in pre elements
  const preElements = document.querySelectorAll('pre.CodeMirror-line, .view-line');
  if (preElements.length > 0) {
    console.log('Found pre elements');
    let code = '';
    preElements.forEach(pre => {
      code += pre.textContent + '\n';
    });
    console.log('Extracted code from pre elements:', code);
    return code.trim();
  }
  
  // Approach 5: Try to find the code in the ace editor
  const aceEditor = document.querySelector('.ace_editor');
  if (aceEditor && window.ace) {
    console.log('Found Ace editor');
    const editor = window.ace.edit(aceEditor);
    if (editor) {
      const code = editor.getValue();
      console.log('Extracted code from Ace editor:', code);
      return code;
    }
  }
  
  // Last resort: Try to find any textarea that might contain code
  const textareas = document.querySelectorAll('textarea');
  for (const textarea of textareas) {
    if (textarea.value && textarea.value.includes('function') || textarea.value.includes('class')) {
      console.log('Extracted code from generic textarea:', textarea.value);
      return textarea.value;
    }
  }
  
  console.log('Could not find code in editor');
  return '';
}

// Display AI response in the UI
function displayResponse(responseText, isError = false) {
  // Check if response container exists, create if not
  let responseContainer = document.getElementById(CONFIG.responseContainerId);
  
  if (!responseContainer) {
    responseContainer = createAssistantPanel();
  }
  
  // Get the chat container
  const chatContainer = responseContainer.querySelector('.ai-chat-container');
  if (!chatContainer) return;
  
  // Create message container
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-chat-message ${isError ? 'error' : 'assistant'}`;
  
  // Add error icon if it's an error
  if (isError) {
    const errorIcon = document.createElement('span');
    errorIcon.className = 'error-icon';
    errorIcon.innerHTML = '⚠️';
    messageDiv.appendChild(errorIcon);
  }
  
  // Add the message text
  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.textContent = responseText;
  messageDiv.appendChild(messageText);
  
  // Add to chat container
  chatContainer.appendChild(messageDiv);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Make sure the header shows the current mode
  const headerText = responseContainer.querySelector('.ai-response-header span');
  if (headerText) {
    headerText.textContent = `AI Assistant (${currentMode} mode)`;
  }
  
  // Make sure it's visible
  responseContainer.style.display = 'block';
}

// Toggle loading state
function toggleLoadingState(isLoading) {
  const button = document.getElementById(CONFIG.buttonId);
  if (!button) return;
  
  if (isLoading) {
    button.classList.add(CONFIG.loadingClass);
    button.disabled = true;
    button.innerText = 'Loading...';
  } else {
    button.classList.remove(CONFIG.loadingClass);
    button.disabled = false;
    button.innerText = 'AI Assist';
  }
}

// Function to check API key status
function checkApiKeyStatus() {
  console.log('Checking API key status...');
  chrome.runtime.sendMessage({ action: 'checkApiKeyStatus' }, function(response) {
    console.log('API Key Status Response:', response);
    
    // Create or update status display
    let statusDiv = document.getElementById('api-key-status');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'api-key-status';
      statusDiv.style.position = 'fixed';
      statusDiv.style.top = '10px';
      statusDiv.style.right = '10px';
      statusDiv.style.padding = '10px';
      statusDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
      statusDiv.style.color = 'white';
      statusDiv.style.borderRadius = '5px';
      statusDiv.style.zIndex = '10000';
      document.body.appendChild(statusDiv);
    }
    
    if (response.hasApiKey) {
      statusDiv.innerHTML = `
        <div>API Key Status: <span style="color: lightgreen">✓ Present</span></div>
        <div>Length: ${response.apiKeyLength} characters</div>
        <div>Prefix: ${response.apiKeyPrefix}...</div>
        <div>Suffix: ...${response.apiKeySuffix}</div>
      `;
    } else {
      statusDiv.innerHTML = `
        <div>API Key Status: <span style="color: red">✗ Missing</span></div>
        <div>Please set your API key in the extension settings</div>
      `;
    }
  });
}

// Call checkApiKeyStatus when the script loads
checkApiKeyStatus();

// Also check when the settings button is clicked
function highlightSettingsButton() {
  checkApiKeyStatus();
  // Get the extension icon
  const extensionIcon = document.querySelector('img[src*="extension-icon"]');
  if (extensionIcon) {
    // Add animation class
    extensionIcon.classList.add('highlight-settings');
    
    // Remove animation class after 3 seconds
    setTimeout(() => {
      extensionIcon.classList.remove('highlight-settings');
    }, 3000);
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'backgroundScriptStarted') {
    console.log('Background script started at:', request.timestamp);
    return true;
  }
  
  if (request.action === 'modeChanged') {
    currentMode = request.mode;
    const button = document.getElementById(CONFIG.buttonId);
    if (button) {
      button.title = `Get ${currentMode} from AI`;
    }
    
    // Update the panel header if it exists
    const headerText = document.querySelector(`#${CONFIG.responseContainerId} .ai-response-header span`);
    if (headerText) {
      headerText.textContent = `AI Assistant (${currentMode} mode)`;
    }
  }
  
  // Always return true for asynchronous response
  return true;
});

// Handle action button clicks
function handleActionButtonClick(actionId) {
  console.log('Action button clicked:', actionId);
  
  // Get problem data and code
  const problemData = extractProblemData();
  const userCode = extractUserCode();
  
  // Show loading state
  toggleLoadingState(true);
  
  // Get appropriate prompt based on action
  let prompt = '';
  switch(actionId) {
    case 'explain-code':
      prompt = 'Please explain the current code, focusing on the logic and approach.';
      break;
    case 'why-not-working':
      prompt = 'Analyze why the current code might not be working and suggest potential issues.';
      break;
    case 'optimize-code':
      prompt = 'Suggest optimizations for the current code, focusing on time and space complexity.';
      break;
    case 'suggest-approach':
      prompt = 'Suggest a different approach to solve this problem, explaining the reasoning.';
      break;
  }
  
  console.log('Sending message to background script:', {
    action: 'getAIAssistance',
    data: {
      problem: problemData,
      code: userCode,
      mode: currentMode,
      prompt: prompt
    }
  });
  
  // Send to background script
  try {
    console.log('Attempting to send message to background script...');
    chrome.runtime.sendMessage({
      action: 'getAIAssistance',
      data: {
        problem: problemData,
        code: userCode,
        mode: currentMode,
        prompt: prompt
      }
    }, function(response) {
      console.log('Received response from background script:', response);
      if (!response) {
        console.error('No response received from background script');
        displayResponse('Failed to get response from AI assistant. Please try again.', true);
        toggleLoadingState(false);
        return;
      }
      
      if (response.error) {
        console.error('Error from background script:', response.error);
        displayResponse(response.error, true);
        if (response.isApiKeyMissing || response.isApiKeyInvalid) {
          highlightSettingsButton();
        }
      } else if (response.answer) {
        displayResponse(response.answer);
      } else {
        console.error('Unexpected response format:', response);
        displayResponse('Failed to get response from AI assistant. Please try again.', true);
      }
      toggleLoadingState(false);
    });
  } catch (error) {
    console.error('Error sending message to background script:', error);
    displayResponse('Failed to communicate with AI assistant. Please try again.', true);
    toggleLoadingState(false);
  }
} 