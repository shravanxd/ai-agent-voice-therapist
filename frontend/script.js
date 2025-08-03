import { Conversation } from '@elevenlabs/client';

// DOM elements
const conversationButton = document.getElementById('conversationButton');
const connectionStatus = document.getElementById('connectionStatus');
const agentStatus = document.getElementById('agentStatus');
const versionDetails = document.getElementById('versionDetails');
const conversationCount = document.getElementById('conversationCount');

// State
let conversation = null;
let currentState = 'ready'; // ready, connecting, connected, processing
let completedConversations = 0;
let evolvedPrompt = null; // Store the evolved system prompt

// Update UI based on current state
function updateUI() {
    switch(currentState) {
        case 'ready':
            conversationButton.innerHTML = 'Start Conversation';
            conversationButton.disabled = false;
            connectionStatus.className = 'status-value status-disconnected';
            connectionStatus.textContent = 'Disconnected';
            agentStatus.className = 'status-value status-listening';
            agentStatus.textContent = 'Ready';
            break;
            
        case 'connecting':
            conversationButton.innerHTML = '<span class="loading"></span>Connecting...';
            conversationButton.disabled = true;
            connectionStatus.className = 'status-value status-processing';
            connectionStatus.textContent = 'Connecting...';
            break;
            
        case 'connected':
            conversationButton.innerHTML = 'End Conversation';
            conversationButton.disabled = false;
            connectionStatus.className = 'status-value status-connected';
            connectionStatus.textContent = 'Connected';
            break;
            
        case 'processing':
            conversationButton.innerHTML = '<span class="loading"></span>Improving Agent...';
            conversationButton.disabled = true;
            connectionStatus.className = 'status-value status-processing';
            connectionStatus.textContent = 'Processing';
            agentStatus.className = 'status-value status-processing';
            agentStatus.textContent = 'Learning...';
            break;
    }
}

// Get signed URL from backend
async function getSignedUrl() {
    try {
        // Always use GET - overrides are passed when starting conversation, not when getting signed URL
        console.log('🔧 Requesting signed URL from backend');
        const response = await fetch('http://localhost:3001/api/get-signed-url');
        
        if (!response.ok) {
            throw new Error(`Failed to get signed URL: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.signedUrl;
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw error;
    }
}

// Start conversation
async function startConversation() {
    try {
        currentState = 'connecting';
        updateUI();

        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Get signed URL (always the same, overrides come later)
        const signedUrl = await getSignedUrl();

        // Prepare conversation config with overrides if we have evolved prompt
        const conversationConfig = {
            signedUrl,
            onConnect: () => {
                currentState = 'connected';
                updateUI();
            },
            onDisconnect: () => {
                handleConversationEnd();
            },
            onError: (error) => {
                console.error('Conversation error:', error);
                currentState = 'ready';
                updateUI();
            },
            onModeChange: (mode) => {
                if (currentState === 'connected') {
                    agentStatus.className = mode.mode === 'speaking' ? 'status-value status-speaking' : 'status-value status-listening';
                    agentStatus.textContent = mode.mode === 'speaking' ? 'Speaking' : 'Listening';
                }
            }
        };

        // Add overrides if we have an evolved prompt
        if (evolvedPrompt) {
            console.log(`🔧 Using evolved prompt for conversation (${evolvedPrompt.length} characters)`);
            conversationConfig.overrides = {
                agent: {
                    prompt: {
                        prompt: evolvedPrompt 
                    }
                }
                };
        } else {
            console.log('🔧 Using default agent prompt for first conversation');
        }

        // Start conversation
        conversation = await Conversation.startSession(conversationConfig);
    } catch (error) {
        console.error('Failed to start conversation:', error);
        currentState = 'ready';
        updateUI();
        alert('Failed to start conversation. Please check your microphone permissions and try again.');
    }
}

// End conversation
async function endConversation() {
    if (conversation) {
        await conversation.endSession();
        conversation = null;
    }
}

// Handle conversation end and trigger feedback loop
async function handleConversationEnd() {
    currentState = 'processing';
    updateUI();

    try {
        // Notify backend that conversation ended and pass current prompt
        const requestBody = {};
        if (evolvedPrompt) {
            requestBody.currentPrompt = evolvedPrompt;
        }
        
        console.log(`📞 Conversation ended, starting analysis${evolvedPrompt ? ' with current prompt' : ' (first conversation)'}`);
        
        const response = await fetch('http://localhost:3001/api/conversation-ended', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Failed to notify backend of conversation end');
        }

        // Poll for agent status and new prompt
        await pollForAgentReady();
        
    } catch (error) {
        console.error('Error in feedback loop:', error);
        currentState = 'ready';
        updateUI();
    }
}

// Poll backend until agent is ready
async function pollForAgentReady() {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/agent-status');
            const data = await response.json();

            if (data.status === 'ready') {
                // Agent is ready with new version and evolved prompt
                completedConversations++;
                conversationCount.textContent = ` ${completedConversations}`;
                versionDetails.textContent = `Version ${data.version} - ${data.description}`;
                
                // Store the evolved prompt for next conversation
                if (data.fullPrompt) {
                    evolvedPrompt = data.fullPrompt;
                    console.log(`📝 Received evolved prompt (${evolvedPrompt.length} characters)`);
                    console.log('📋 Prompt preview:', evolvedPrompt.substring(0, 200) + '...');
                } else {
                    console.log('⚠️ No evolved prompt received');
                }
                
                currentState = 'ready';
                updateUI();
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(poll, 1000); // Poll every second
            } else {
                throw new Error('Timeout waiting for agent to be ready');
            }
        } catch (error) {
            console.error('Error polling agent status:', error);
            currentState = 'ready';
            updateUI();
        }
    };

    poll();
}

// Button click handler
conversationButton.addEventListener('click', async () => {
    if (currentState === 'ready') {
        await startConversation();
    } else if (currentState === 'connected') {
        await endConversation();
    }
});

// Initialize UI
updateUI();

// Load initial agent status
async function loadInitialStatus() {
    try {
        const response = await fetch('http://localhost:3001/api/agent-status');
        const data = await response.json();
        versionDetails.textContent = `Version ${data.version} - ${data.description}`;
        
        // Check if we have an evolved prompt from a previous session
        if (data.fullPrompt) {
            evolvedPrompt = data.fullPrompt;
            console.log(`🔄 Restored evolved prompt from previous session (${evolvedPrompt.length} characters)`);
        }
    } catch (error) {
        console.error('Failed to load initial agent status:', error);
    }
}

loadInitialStatus();

// Debug functions (can be called from browser console)
window.debugAgent = {
    showEvolvedPrompt: () => {
        if (evolvedPrompt) {
            console.log('Current evolved prompt:');
            console.log(evolvedPrompt);
            return evolvedPrompt;
        } else {
            console.log('No evolved prompt available yet');
            return null;
        }
    },
    clearEvolvedPrompt: () => {
        evolvedPrompt = null;
        console.log('Evolved prompt cleared');
    },
    getPromptStats: () => {
        return {
            hasEvolvedPrompt: !!evolvedPrompt,
            promptLength: evolvedPrompt ? evolvedPrompt.length : 0,
            conversationsCompleted: completedConversations
        };
    }
};

