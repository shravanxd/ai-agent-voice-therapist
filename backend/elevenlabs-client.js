const fetch = require('node-fetch');

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

// Validation
if (!API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required');
}
if (!AGENT_ID) {
    throw new Error('ELEVENLABS_AGENT_ID environment variable is required');
}

/**
 * Get a signed URL for starting a conversation with the agent
 * @returns {Promise<string>} The signed URL
 */
async function getSignedUrl() {
    try {
        const response = await fetch(
            `${ELEVENLABS_API_BASE}/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`ElevenLabs API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        return data.signed_url;
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw new Error(`Failed to get signed URL: ${error.message}`);
    }
}

/**
 * Get the latest conversation for the agent
 * @returns {Promise<Object|null>} The latest conversation data or null if none found
 */
async function getLatestConversation() {
    try {
        const response = await fetch(
            `${ELEVENLABS_API_BASE}/convai/conversations`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`📡 ElevenLabs response status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.text();
            console.error('❌ ElevenLabs API error response:', errorData);
            throw new Error(`ElevenLabs API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        
        // Filter conversations for our agent and get the most recent one
        const agentConversations = data.conversations?.filter(conv => conv.agent_id === AGENT_ID) || [];
        
        console.log(`🎯 Found ${agentConversations.length} conversations for agent ${AGENT_ID}`);
        
        if (agentConversations.length === 0) {
            console.log('⏳ No conversations found yet, will retry...');
            return null;
        }

        // Sort by creation time and get the most recent
        const latestConversation = agentConversations.sort((a, b) => 
            new Date(b.start_time_unix_secs || b.created_at) - new Date(a.start_time_unix_secs || a.created_at)
        )[0];

        // Check if conversation is actually complete
        if (!isConversationReady(latestConversation)) {
            console.log('⏳ Conversation found but not ready yet, will retry...');
            return null;
        }

        return latestConversation;
    } catch (error) {
        console.error('❌ Error getting latest conversation:', error);
        throw new Error(`Failed to get latest conversation: ${error.message}`);
    }
}

/**
 * Get detailed conversation data including transcript
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Object>} The detailed conversation data
 */
async function getConversationDetails(conversationId) {
    try {
        console.log(`📋 Fetching conversation details for: ${conversationId}`);
        const response = await fetch(
            `${ELEVENLABS_API_BASE}/convai/conversations/${conversationId}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('❌ ElevenLabs conversation details error:', errorData);
            throw new Error(`ElevenLabs API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        
        if (data.transcript) {
            console.log(`📋 Retrieved conversation with ${data.transcript.length} messages, ${data.metadata?.call_duration_secs || 'unknown'} seconds`);
        }

        return data;
    } catch (error) {
        console.error('❌ Error getting conversation details:', error);
        throw new Error(`Failed to get conversation details: ${error.message}`);
    }
}

/**
 * Get current agent information
 * @returns {Promise<Object>} The agent data
 */
async function getCurrentAgentInfo() {
    try {
        const response = await fetch(
            `${ELEVENLABS_API_BASE}/convai/agents/${AGENT_ID}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`ElevenLabs API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting agent info:', error);
        throw new Error(`Failed to get agent info: ${error.message}`);
    }
}

/**
 * Wait for conversation to be available (with polling)
 * ElevenLabs may take a moment to process and make the conversation available
 * @param {number} maxAttempts - Maximum number of polling attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<Object|null>} The conversation data or null if not found
 */
async function waitForLatestConversation(maxAttempts = 15, delayMs = 3000) {
    console.log(`⏳ Waiting for conversation to be available...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`🔄 Polling attempt ${attempt}/${maxAttempts}...`);
            const conversation = await getLatestConversation();
            
            if (conversation) {
                console.log(`🎉 Found conversation after ${attempt} attempts!`);
                return conversation;
            }
            
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error.message);
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    
    console.log(`⚠️ No conversation found after ${maxAttempts} attempts`);
    return null;
}

/**
 * Check if a conversation is ready for analysis
 * @param {Object} conversation - The conversation object
 * @returns {boolean} True if ready, false if still processing
 */
function isConversationReady(conversation) {
    // Check status field
    if (conversation.status && conversation.status !== 'done') {
        console.log(`❌ Conversation status is "${conversation.status}", not "done"`);
        return false;
    }

    // Check call success indicator
    if (conversation.call_successful && conversation.call_successful === 'failure') {
        console.log('❌ Conversation failed, skipping analysis');
        return false;
    }

    // Check if it has reasonable duration (avoid 0-second calls)
    const duration = conversation.call_duration_secs || 0;
    if (duration < 1) {
        console.log(`❌ Conversation too short (${duration}s), likely incomplete`);
        return false;
    }

    // Check message count (should have at least some interaction)
    const messageCount = conversation.message_count || 0;
    // 1 agent line + 1 user line is enough for a prototype
    if (messageCount < 1) {
        console.log(`❌ Too few messages (${messageCount}), likely incomplete`);
        return false;
    }

    return true;
}

module.exports = {
    getSignedUrl,
    getLatestConversation,
    getConversationDetails,
    getCurrentAgentInfo,
    waitForLatestConversation,
    isConversationReady
};