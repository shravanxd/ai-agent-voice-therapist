# ElevenLabs Self-Improving Voice Agent

A hackathon starter for building voice AI agents that learn and improve from every conversation using ElevenLabs Conversational AI.

## Quick Start

### 1. ElevenLabs Setup

#### Create Account & Get API Key
1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Go to your [Profile Settings](https://elevenlabs.io/app/settings/api-keys)
3. Generate an API key and copy it

#### Create Conversational AI Agent
1. Navigate to [Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Create a new agent
3. Copy the Agent ID from the URL or agent details
4. **Important**: Go to your agent → **Security tab**
5. **Enable "System prompt" overrides** (required for self-improvement)

### 2. Clone and Install
```bash
git clone https://github.com/deiglerharding/voice-ai-hackathon-6-26.git
cd elevenlabs-hackathon-starter
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your ElevenLabs credentials:
```env
ELEVENLABS_API_KEY=your-api-key-here
ELEVENLABS_AGENT_ID=your-agent-id-here
```

### 4. Run
```bash
npm run dev
```

This starts both:
- Frontend: http://localhost:5173  
- Backend: http://localhost:3001

## How It Works

1. **User has voice conversation** with ElevenLabs agent
2. **Conversation ends** → triggers feedback loop
3. **System analyzes conversation** and generates improved system prompt
4. **Frontend stores evolved prompt** in memory
5. **Next conversation** uses the evolved prompt via ElevenLabs overrides

### Technical Flow

```
First Conversation:  Default Agent → User talks → Analysis → Evolved Prompt
Second Conversation: Evolved Prompt (via override) → User talks → Analysis → New Evolved Prompt
Third Conversation:  New Evolved Prompt (via override) → User talks → Analysis → ...
```

## Customize the Feedback Loop

Edit `backend/feedback-loop.js` - the `generateImprovedPrompt()` function:

```javascript
function generateImprovedPrompt(currentPrompt, transcript, conversationData) {
    // HACKERS: Add your feedback logic here!
    
    // You have access to:
    // - currentPrompt: Current system prompt string
    // - transcript: Array of {role: 'user/agent', message: '...'}
    // - conversationData: Full ElevenLabs data (duration, metadata, etc.)
    
    let newPrompt = currentPrompt.replace(/\[Version \d+.*?\]/g, '').trim();
    
    // Add your improvements here
    // Examples:
    // - Analyze sentiment and adjust tone
    // - Add domain knowledge based on topics discussed
    // - Integrate with external LLMs (OpenAI, Claude, etc.)
    // - Modify questioning strategy based on user responses
    // - Add personality traits based on conversation patterns
    
    newPrompt += `\n\n[Version ${versionCounter + 1}] - Improved based on conversation analysis`;
    return newPrompt;
}
```

## Architecture

### Frontend (Browser)
- Clean voice interface with real-time status
- Manages evolved prompt in memory
- Passes prompt overrides to ElevenLabs

### Backend (Node.js)  
- Polls ElevenLabs for conversation data
- Analyzes conversations and generates improvements
- Returns evolved prompts to frontend
- **Does not store state** - frontend holds the memory

### ElevenLabs Integration
- Handles voice conversations
- Accepts prompt overrides per conversation
- Provides conversation transcripts and metadata

## File Structure

```
├── frontend/           # Voice UI (Vite + ElevenLabs client)
│   ├── index.html     # Main interface
│   ├── script.js      # Conversation handling + prompt management
│   └── style.css      # Styling
├── backend/           # Feedback loop server
│   ├── server.js      # Express API
│   ├── feedback-loop.js    # 🎯 CUSTOMIZE THIS
│   └── elevenlabs-client.js # ElevenLabs API wrapper
└── package.json
```

## What You Get

- ✅ Working voice conversation interface
- ✅ Automatic conversation data retrieval  
- ✅ Prompt evolution system using ElevenLabs overrides
- ✅ Session-based agent memory
- ✅ Version tracking with conversation analytics
- ✅ Error handling and polling
- ✅ Debug tools (check browser console)

## Example Ideas

- **Sentiment-Adaptive Agent**: Adjust tone based on user emotion analysis
- **Domain Expert**: Add specialized knowledge based on conversation topics  
- **Learning Assistant**: Track user progress and adapt teaching difficulty
- **Interview Coach**: Improve questioning strategy based on candidate responses
- **Therapy Bot**: Develop empathy and techniques based on user needs
- **Customer Service**: Learn company-specific solutions from interactions

## Debug Tools

Open browser console and try:
- `debugAgent.showEvolvedPrompt()` - View current evolved prompt
- `debugAgent.getPromptStats()` - See evolution statistics  
- `debugAgent.clearEvolvedPrompt()` - Reset to base agent

## Requirements

- Node.js 16+
- ElevenLabs account with Conversational AI access
- ElevenLabs API key and agent ID
- **Agent must have "System prompt" overrides enabled**

## Troubleshooting

**"No conversation found"**: Wait a few seconds after ending conversation - ElevenLabs needs time to process.

**CORS errors**: Make sure backend is running on port 3001.

**Agent not updating**: 
- Check your ElevenLabs API key and agent ID in `.env`
- Ensure "System prompt" overrides are enabled in agent → Security tab

**500 errors on conversation start**: Verify your agent has override permissions enabled.

**Prompt not evolving**: Check browser console for `debugAgent.showEvolvedPrompt()` to see if prompt is being stored.

## Important Notes

- **Session-based memory**: Evolved prompts persist only during browser session
- **Override system**: Uses ElevenLabs overrides, not permanent agent changes
- **First conversation**: Uses agent's default prompt, then evolves from there
- **Stateless backend**: Frontend manages prompt evolution state

---

**Ready to build self-improving voice AI? Start customizing `generateImprovedPrompt()`!** 🎯