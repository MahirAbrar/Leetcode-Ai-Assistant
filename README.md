# LeetCode AI Assistant Chrome Extension

A Chrome extension that provides AI-powered assistance for solving LeetCode problems using Groq's fast inference models.

## Features

- 🤖 Integrated AI assistance for LeetCode problems
- 🔍 Get hints without full solutions
- 🧠 Critical thinking analysis mode
- 📚 Step-by-step problem-solving guidance
- ⚙️ Customize assistance mode based on your needs
- 🚀 Powered by Groq's high-speed inference models
- 🔄 Switch between different AI models
- ⏱️ 30 free requests per hour

## Installation

### Development Mode
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your browser toolbar

### From Chrome Web Store
*Coming soon*

## Getting Started

### 1. Get Your API Key
1. Visit [Groq Console](https://console.groq.com/home)
2. Create an account or log in
3. Navigate to the API Keys section
4. Generate a new API key
5. Copy your API key

### 2. Configure the Extension
1. Click the extension icon in your browser toolbar
2. Navigate to the Settings tab
3. Paste your Groq API key in the designated field
4. Select your preferred AI model from the dropdown
5. Choose your assistance mode:
   - Hints: Get subtle hints without full solutions
   - Critical Thinking: Analyze your approach
   - Problem Solving: Step-by-step guidance
6. Save your settings

### 3. Using the Assistant
1. Go to any LeetCode problem page (e.g., https://leetcode.com/problems/two-sum/)
2. Start coding in the editor
3. The AI Assistant will automatically appear when you begin coding
4. The assistant will provide real-time guidance based on your selected mode
5. You can switch between models and modes at any time through the extension popup

## Available Models
- Llama 4
- Llama 3.3 70B
- Qwen QwQ
- DeepSeek R1 Distill Llama
- And more (models are regularly updated)

## Usage Tips
- You get 30 free requests per hour for most models
- Different models may be better suited for different types of problems
- The assistant appears automatically when you start coding
- You can customize the level of assistance based on your needs
- Switch between models to find the one that works best for you

## Development

### File Structure

- `manifest.json`: Extension configuration file
- `content.js`: Runs on the LeetCode website
- `background.js`: Handles API calls and settings
- `popup.html/js`: Extension popup interface
- `styles.css`: Styling for all extension components

## License

MIT 