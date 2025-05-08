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
let currentMode = 'Small Hints'; // Default mode: Small Hints, Medium Hints, or Big Hints
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
  
  // Set panel style for draggability and better usability
  panel.style.display = 'none';
  panel.style.flexDirection = 'column';
  panel.style.height = '400px';
  panel.style.width = '350px';
  panel.style.maxHeight = '80vh';
  panel.style.position = 'fixed';
  panel.style.zIndex = '9999';
  panel.style.top = '100px';  // Set initial top position instead of bottom
  panel.style.right = '20px';
  panel.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  panel.style.border = '1px solid #d0d0d0';
  panel.style.borderRadius = '6px';
  panel.style.backgroundColor = '#ffffff';
  panel.style.overflow = 'hidden';
  panel.style.resize = 'both';
  panel.style.color = '#333333';
  panel.style.fontFamily = 'Arial, sans-serif';
  
  // Panel header
  const header = document.createElement('div');
  header.className = 'ai-response-header';
  header.style.padding = '10px 12px';
  header.style.borderBottom = '1px solid #d0d0d0';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.cursor = 'move'; // Show move cursor on header
  header.style.backgroundColor = '#4a90e2';
  header.style.color = 'white';
  header.style.fontWeight = 'bold';
  header.style.userSelect = 'none'; // Prevent text selection during drag
  
  header.innerHTML = `
    <span>AI Assistant (${currentMode})</span>
    <button class="ai-close-btn" style="border:none; background:none; font-size:18px; cursor:pointer; color:white;">×</button>
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
  
  // Make header draggable
  makeDraggable(panel, header);
  
  // Panel content
  const content = document.createElement('div');
  content.className = 'ai-response-content';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.height = 'calc(100% - 40px)';
  content.style.overflow = 'hidden';
  content.style.backgroundColor = '#ffffff';
  
  // Add action buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'ai-action-buttons';
  buttonContainer.style.padding = '10px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexWrap = 'wrap';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.borderBottom = '1px solid #e0e0e0';
  buttonContainer.style.backgroundColor = '#f7f7f7';
  
  // Define standard buttons
  const standardButtons = [
    { id: 'approach-hints', text: 'Approach Hints', icon: '💡' },
    { id: 'debugging-hints', text: 'Debugging Hints', icon: '🔍' },
    { id: 'solution-steps', text: 'Solution Steps', icon: '📝' },
  ];
  
  // Define metaphorical mode button
  const storyButton = { id: 'story-analogy', text: 'Tell Me a Story', icon: '📚' };
  
  // Add the buttons visually
  const buttonsToAdd = currentMode === 'Metaphorical Hints' ? 
                      [...standardButtons, storyButton] : 
                      standardButtons;
  
  buttonsToAdd.forEach(button => {
    const btn = document.createElement('button');
    btn.className = 'ai-action-button';
    btn.id = button.id;
    btn.style.padding = '8px 10px';
    btn.style.border = '1px solid #d0d0d0';
    btn.style.borderRadius = '4px';
    btn.style.backgroundColor = '#ffffff';
    btn.style.color = '#333333';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '13px';
    btn.style.fontWeight = '500';
    btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    btn.innerHTML = `${button.icon} ${button.text}`;
    
    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#4a90e2';
      btn.style.color = 'white';
      btn.style.borderColor = '#3a80d2';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#ffffff';
      btn.style.color = '#333333';
      btn.style.borderColor = '#d0d0d0';
    });
    
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
  chatContainer.style.flex = '1';
  chatContainer.style.overflowY = 'auto';
  chatContainer.style.padding = '12px';
  chatContainer.style.scrollBehavior = 'smooth';
  chatContainer.style.backgroundColor = '#f9f9f9';
  content.appendChild(chatContainer);
  
  panel.appendChild(content);
  
  // Append panel directly to the body for better drag positioning
  document.body.appendChild(panel);
  
  return panel;
}

// Function to make an element draggable
function makeDraggable(element, handle) {
  let isDragging = false;
  let initialX, initialY, initialLeft, initialTop;
  
  handle.addEventListener('mousedown', startDrag);
  
  function startDrag(e) {
    // Prevent default behavior and text selection
    e.preventDefault();
    
    // Get initial mouse position
    initialX = e.clientX;
    initialY = e.clientY;
    
    // Get initial element position
    const rect = element.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // Set up move and stop listeners
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    isDragging = true;
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    // Calculate the distance moved
    const dx = e.clientX - initialX;
    const dy = e.clientY - initialY;
    
    // Calculate new position
    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;
    
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;
    
    // Ensure the panel stays within the visible area
    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft + elementWidth > windowWidth) newLeft = windowWidth - elementWidth;
    if (newTop + elementHeight > windowHeight) newTop = windowHeight - elementHeight;
    
    // Update position - use CSS transform for smoother movement
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  }
  
  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
  }
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
  button.title = `Get ${currentMode}`;
  
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
  messageDiv.style.marginBottom = '12px';
  messageDiv.style.padding = '12px 15px';
  messageDiv.style.borderRadius = '8px';
  messageDiv.style.backgroundColor = isError ? '#ffebee' : '#e3f2fd';
  messageDiv.style.color = isError ? '#d32f2f' : '#0d47a1';
  messageDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  messageDiv.style.maxWidth = '100%';
  messageDiv.style.wordWrap = 'break-word';
  messageDiv.style.border = isError ? '1px solid #ffcdd2' : '1px solid #bbdefb';
  
  // Add error icon if it's an error
  if (isError) {
    const errorIcon = document.createElement('span');
    errorIcon.className = 'error-icon';
    errorIcon.innerHTML = '⚠️';
    errorIcon.style.marginRight = '8px';
    messageDiv.appendChild(errorIcon);
  }
  
  // Add the message text
  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.style.lineHeight = '1.5';
  messageText.style.fontSize = '14px';
  messageText.style.fontWeight = isError ? '500' : '400';
  messageText.style.color = isError ? '#d32f2f' : '#333333';
  
  // Format response text with markdown-like processing
  let formattedText = responseText;
  
  // Convert plain text to HTML with basic formatting
  // Replace newlines with <br>
  formattedText = formattedText.replace(/\n/g, '<br>');
  
  // Bold text between **
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic text between *
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code blocks
  formattedText = formattedText.replace(/`([^`]+)`/g, '<code style="background-color:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace;color:#e53935;">$1</code>');
  
  messageText.innerHTML = formattedText;
  messageDiv.appendChild(messageText);
  
  // Add to chat container
  chatContainer.appendChild(messageDiv);
  
  // Ensure proper scrolling - use setTimeout to scroll after render
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 10);
  
  // Make sure the header shows the current mode
  const headerText = responseContainer.querySelector('.ai-response-header span');
  if (headerText) {
    headerText.textContent = `AI Assistant (${currentMode})`;
  }
  
  // Make sure it's visible and has the right display type
  responseContainer.style.display = 'flex';
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
      button.title = `Get ${currentMode}`;
    }
    
    // Update the panel header if it exists
    const headerText = document.querySelector(`#${CONFIG.responseContainerId} .ai-response-header span`);
    if (headerText) {
      headerText.textContent = `AI Assistant (${currentMode})`;
    }
    
    // Update action buttons when mode changes
    updateActionButtons();
  }
  
  // Always return true for asynchronous response
  return true;
});

// Function to update action buttons based on current mode
function updateActionButtons() {
  const panel = document.getElementById(CONFIG.responseContainerId);
  if (!panel) return;
  
  const buttonContainer = panel.querySelector('.ai-action-buttons');
  if (!buttonContainer) return;
  
  // Clear existing buttons
  buttonContainer.innerHTML = '';
  
  // Define standard buttons
  const standardButtons = [
    { id: 'approach-hints', text: 'Approach Hints', icon: '💡' },
    { id: 'debugging-hints', text: 'Debugging Hints', icon: '🔍' },
    { id: 'solution-steps', text: 'Solution Steps', icon: '📝' },
  ];
  
  // Define metaphorical mode button
  const storyButton = { id: 'story-analogy', text: 'Tell Me a Story', icon: '📚' };
  
  // Determine which buttons to add
  const buttonsToAdd = currentMode === 'Metaphorical Hints' ? 
                      [...standardButtons, storyButton] : 
                      standardButtons;
  
  // Add the buttons
  buttonsToAdd.forEach(button => {
    const btn = document.createElement('button');
    btn.className = 'ai-action-button';
    btn.id = button.id;
    btn.innerHTML = `${button.icon} ${button.text}`;
    btn.addEventListener('click', () => {
      toggleLoadingState(true);
      handleActionButtonClick(button.id);
    });
    buttonContainer.appendChild(btn);
  });
}

// Function to handle action button clicks
function handleActionButtonClick(actionId) {
  console.log('Action button clicked:', actionId);
  
  // Get problem data and code
  const problemData = extractProblemData();
  const userCode = extractUserCode();
  
  // Show loading state
  toggleLoadingState(true);
  
  // Get appropriate prompt based on action
  let prompt = '';
  
  // Handle special "Tell Me a Story" button for metaphorical mode
  if (actionId === 'story-analogy') {
    prompt = `Create a creative story or extended metaphor that explains how to solve this problem.
Choose an engaging scenario like a journey, a natural process, or everyday activity.
Translate the key algorithmic concepts into story elements.
Make the story fun and relatable while ensuring it conveys the essential problem-solving approach.
DO NOT use any programming terms or code - stick entirely to the metaphorical realm.`;
  }
  else {
    switch(actionId) {
      case 'approach-hints':
        prompt = 'Suggest approaches to solve this problem. Focus on algorithms and data structures that could be used, with a brief explanation of why they are appropriate.';
        break;
      case 'debugging-hints':
        prompt = 'Help identify potential issues in the code without giving the full solution. Analyze edge cases, logical errors, or inefficiencies that might exist.';
        break;
      case 'solution-steps':
        prompt = 'Provide a step-by-step breakdown of how to approach this problem. Start with the high-level approach and then break it down into logical steps.';
        break;
    }
    
    // Special handling for Metaphorical Hints mode
    if (currentMode === 'Metaphorical Hints') {
      // For Metaphorical Hints, we override the regular prompts with special metaphorical instructions
      switch(actionId) {
        case 'approach-hints':
          prompt = 'Create a metaphor or analogy that explains different ways to approach this problem. For example, compare sorting algorithms to different ways of organizing a bookshelf or heap data structure to a company hierarchy.';
          break;
        case 'debugging-hints':
          prompt = 'Explain potential issues in the code using a story or metaphor. For example, compare debugging to detective work or finding leaks in a plumbing system.';
          break;
        case 'solution-steps':
          prompt = 'Create an extended metaphor that walks through solving this problem. For example, describe the solution as a journey, a cooking recipe, or a natural process like water flowing through a river system.';
          break;
      }
    }
    else {
      // Level of detail based on selected mode
      let detailLevel = '';
      switch(currentMode) {
        case 'Small Hints':
          detailLevel = 'Provide very minimal guidance. Just point them in the right direction without revealing too much.';
          break;
        case 'Medium Hints':
          detailLevel = 'Provide moderate guidance with some specific suggestions but leave them to figure out the implementation details.';
          break;
        case 'Big Hints':
          detailLevel = 'Provide detailed guidance with specific approaches and strategies. You can include pseudo-code if appropriate.';
          break;
      }
      
      // Combine the action-specific prompt with the detail level
      prompt = `${prompt}\n\n${detailLevel}`;
    }
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
  
  // Send the actual request directly
  sendActualRequest(prompt, problemData, userCode);
}

// Function to actually send the request to the background script
function sendActualRequest(prompt, problemData, userCode) {
  // Send to background script
  try {
    console.log('Attempting to send message to background script...');
    console.log('Current mode:', currentMode);  // Log the current mode
    
    chrome.runtime.sendMessage({
      action: 'getAIAssistance',
      data: {
        problem: problemData,
        code: userCode,
        mode: currentMode,  // Ensure the current mode is passed
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