# LeetCode AI Assistant Chrome Extension

A Chrome extension that provides AI-powered assistance for solving LeetCode problems.

## Features

- 🤖 Integrated AI assistance for LeetCode problems
- 🔍 Get hints without full solutions
- 🧠 Critical thinking analysis mode
- 📚 Step-by-step problem-solving guidance
- ⚙️ Customize assistance mode based on your needs

## Installation

### Development Mode
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your browser toolbar

### From Chrome Web Store
*Coming soon*

## Usage

1. Navigate to any LeetCode problem page
2. Write some code in the editor
3. Click the "AI Assist" button that appears in the LeetCode interface
4. Receive AI guidance based on your selected assistance mode

## Configuration

Click the extension icon in your browser toolbar to:
- Change the assistance mode (Hints, Critical Thinking, Problem Solving)
- Set your API key
- View usage statistics

## Development

### File Structure

- `manifest.json`: Extension configuration file
- `content.js`: Runs on the LeetCode website
- `background.js`: Handles API calls and settings
- `popup.html/js`: Extension popup interface
- `styles.css`: Styling for all extension components

### API Requirements

This extension requires an API key from OpenAI or another compatible AI service. Enter your API key in the extension settings.

## License

MIT 