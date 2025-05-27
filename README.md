# LeetCode AI Assistant Chrome Extension

A Chrome browser extension designed to provide intelligent, contextual hints and guidance for LeetCode problems. It integrates with multiple AI providers to offer different levels of assistance while preserving the learning experience and encouraging independent problem-solving.

## 🚀 Project Overview

The LeetCode AI Assistant Extension operates entirely client-side, ensuring user privacy while providing intelligent assistance that adapts to individual learning needs and coding progress. It features real-time problem detection, context-aware guidance, and flexible AI model selection.

## ✨ Key Features

### 🤖 Multiple AI Provider Support

- **Groq API** (default): Llama 4 Scout, Mixtral 8x7B, Llama 3 70B, Gemma 7B, Mistral 7B
- **OpenAI API**: GPT-4o, GPT-4.1, GPT-4o-mini models
- Configurable model selection and temperature settings
- Automatic fallback handling for API issues

### 🎯 Four Assistance Modes

- **Small Hints**: Concise, minimal guidance to nudge users in the right direction
- **Medium Hints**: Semi-detailed explanations with multiple solution approaches
- **Big Hints**: Comprehensive step-by-step instructions for problem completion
- **Metaphorical Hints**: Creative explanations using everyday concepts without technical jargon

### 🧠 Smart Integration

- Real-time problem detection on LeetCode pages
- Context-aware assistance based on current code and problem description
- Automatic HTML parsing and content extraction from problem statements
- User code analysis and personalized guidance
- Seamless integration with LeetCode interface

### 🔒 Privacy & Storage Options

- **Flexible API Key Storage**: Chrome sync storage or local-only mode
- **Encrypted Local Storage**: Sensitive data protection with base64 encoding and character shifting
- **Usage Tracking**: Local statistics without external data transmission
- **No External Data Sharing**: Only AI API calls are made, no user data stored externally

### ⚙️ Advanced Configuration

- **Temperature Control**: Adjust AI response creativity (0.1 - 1.0)
- **Model Selection**: Choose from multiple AI models per provider
- **Real-time Mode Switching**: Change assistance levels without page refresh
- **Debug Mode**: Comprehensive error handling and troubleshooting
- **Usage Statistics**: Track queries and monitor API usage

## 📦 Installation

### Development Mode

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/leetcode-ai-assistant.git
   cd leetcode-ai-assistant
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your browser toolbar

### From Chrome Web Store

_Coming soon_

## 🛠️ Getting Started

### 1. Get Your API Key

#### For Groq (Recommended - Free Tier Available)

1. Visit [Groq Console](https://console.groq.com/home)
2. Create an account or log in
3. Navigate to the API Keys section
4. Generate a new API key
5. Copy your API key

#### For OpenAI

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or log in
3. Generate a new API key
4. Copy your API key

### 2. Configure the Extension

1. Click the extension icon in your browser toolbar
2. Navigate to the Settings tab
3. **Select API Provider**: Choose between Groq or OpenAI
4. **Paste your API key** in the designated field
5. **Choose Storage Mode**:
   - **Sync Storage**: API key synced across Chrome browsers
   - **Local Only**: API key stored only on current device (more secure)
6. **Select AI Model**: Choose from available models for your provider
7. **Set Temperature**: Adjust response creativity (0.7 recommended)
8. **Choose Assistance Mode**:
   - Small Hints
   - Medium Hints
   - Big Hints
   - Metaphorical Hints
9. Save your settings

### 3. Using the Assistant

1. Go to any LeetCode problem page (e.g., https://leetcode.com/problems/two-sum/)
2. Start coding in the editor
3. The AI Assistant will automatically appear when you begin coding
4. The assistant provides guidance based on:
   - Current problem description
   - Your written code
   - Selected assistance mode
5. Switch between models and modes anytime through the extension popup

## 🎛️ Available Models

### Groq Models

- **Llama 4 Scout 17B** (default) - Fast and efficient
- **Mixtral 8x7B** - Advanced reasoning capabilities
- **Llama 3 70B** - Large context understanding
- **Gemma 7B** - Google's efficient model
- **Mistral 7B** - Balanced performance

### OpenAI Models

- **GPT-4o** (default) - Latest and most capable
- **GPT-4.1** - Advanced reasoning
- **GPT-4o-mini** - Fast and cost-effective

## 💡 Usage Tips

### Best Practices

- Start with **Small Hints** to maintain learning challenge
- Use **Metaphorical Hints** for creative problem understanding
- Switch to **Big Hints** only when completely stuck
- Try different models for varied perspectives on the same problem

### API Usage

- Groq offers generous free tier limits
- OpenAI charges per token - monitor usage in settings
- Local usage statistics help track your query patterns
- API key validation ensures proper configuration

### Privacy Features

- Use **Local-Only** storage mode for maximum security
- All data processing happens client-side
- No user code or solutions stored on external servers
- Encrypted local storage protects sensitive information

## 🔧 Development

### File Structure

- `manifest.json`: Extension configuration file
- `content.js`: Runs on the LeetCode website
- `background.js`: Handles API calls and settings
- `popup.html/js`: Extension popup interface
- `styles.css`: Styling for all extension components

## License

MIT
