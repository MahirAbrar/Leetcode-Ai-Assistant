# LeetCode AI Assistant - Architecture Documentation

## Overview
This document provides a comprehensive overview of the LeetCode AI Assistant Chrome extension's architecture and file structure. The extension helps users get AI assistance while solving LeetCode problems.

## File Structure

### Core Configuration
#### `manifest.json`
- Extension's configuration file
- Defines permissions, scripts, and resources
- Specifies which files to load and when
- Declares extension name, version, and icons

### Frontend Integration
#### `content.js`
- Runs directly on LeetCode problem pages
- Main responsibilities:
  - Injects "AI Assist" button into LeetCode interface
  - Extracts problem data and user code
  - Handles button clicks and user interactions
  - Displays AI responses and error messages
  - Manages UI state (loading, success, error)
  - Communicates with background script

### Backend Processing
#### `background.js`
- Runs in extension's background context
- Main responsibilities:
  - Handles API calls to OpenAI
  - Manages API key validation
  - Processes AI assistance requests
  - Stores and retrieves settings
  - Handles communication between popup and content scripts
  - Manages error handling for API calls

### User Interface
#### `popup.js`
- Controls extension's popup interface
- Main responsibilities:
  - Manages settings form
  - Handles API key input and validation
  - Saves settings to Chrome storage
  - Shows success/error messages
  - Updates assistance mode
  - Communicates with background script

#### `popup.html`
- Defines popup's user interface
- Contains:
  - Settings form
  - API key input field
  - Mode selection radio buttons
  - Model selection dropdown
  - Save button
  - Error/success message areas

#### `styles.css`
- Contains all extension styling
- Styles for:
  - Popup interface
  - AI Assist button
  - Response panel
  - Loading states
  - Error and success messages
  - Animations and transitions
  - Dark mode support
  - Mobile responsiveness

### Documentation
#### `README.md`
- Documentation file
- Contains:
  - Installation instructions
  - Usage guide
  - Configuration steps
  - Feature descriptions
  - Troubleshooting tips

### Version Control
#### `.gitignore`
- Specifies files to ignore in version control
- Excludes:
  - Environment files
  - API keys
  - Build artifacts
  - Node modules
  - IDE files

## Architecture Overview
The extension follows a typical Chrome extension architecture:
- `content.js` handles LeetCode page integration
- `background.js` manages core functionality
- `popup.js` and `popup.html` provide user interface
- `styles.css` ensures consistent styling
- `manifest.json` ties everything together

## Communication Flow
1. User interacts with LeetCode page → `content.js`
2. User opens popup → `popup.html` + `popup.js`
3. Settings saved → `background.js` stores them
4. AI Assist clicked → `content.js` → `background.js` → OpenAI API
5. Response received → `background.js` → `content.js` → Display to user

## Error Handling
- API key validation in `popup.js` and `background.js`
- Error messages displayed through `content.js`
- Styling for error states in `styles.css`
- Error logging in console for debugging

## UI Components
- Settings popup (`popup.html` + `popup.js`)
- AI Assist button (`content.js`)
- Response panel (`content.js`)
- Loading states (`styles.css`)
- Success/error messages (`styles.css`)

## Development Guidelines
1. Always validate API keys before making requests
2. Use Chrome storage for persistent settings
3. Handle errors gracefully with user feedback
4. Maintain consistent styling across components
5. Follow Chrome extension best practices
6. Test on different LeetCode UI versions

## Security Considerations
- API keys are stored in Chrome storage
- No sensitive data is logged
- All API calls are made over HTTPS
- Input validation on all user inputs
- Error messages don't expose sensitive information

## Future Improvements
- Add more assistance modes
- Support for multiple AI providers
- Enhanced error recovery
- Better mobile support
- Additional customization options 