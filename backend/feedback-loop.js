const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const { 
    waitForLatestConversation, 
    getConversationDetails, 
    getCurrentAgentInfo 
} = require('./elevenlabs-client');

// Simple version counter (in production, you'd use a database)
let versionCounter = 1;

/**
 * Generate improved system prompt based on conversation
 * HACKERS: CUSTOMIZE THIS FUNCTION FOR YOUR HACKATHON PROJECT
 * @param {string} currentPrompt - Current system prompt
 * @param {Array} transcript - Conversation transcript array
 * @param {Object} conversationData - Full conversation data from ElevenLabs
 * @returns {string} Improved system prompt
 */
// function generateImprovedPrompt(currentPrompt, transcript, conversationData) {
//     // HACKERS: This is where you implement your feedback logic!
//     // 
//     // You have access to:
//     // - currentPrompt: The current system prompt
//     // - transcript: Array of conversation messages [{role: 'user/agent', message: '...'}]
//     // - conversationData: Full conversation data (duration, metadata, etc.)
//     //
//     // Examples of what you could build:
//     // - Analyze conversation sentiment and adjust tone
//     // - Add domain-specific knowledge based on topics discussed
//     // - Modify questioning strategy based on user responses
//     // - Integrate with external LLMs (OpenAI, Claude, etc.) for prompt improvement
//     // - Add personality traits based on conversation patterns


//     // Remove any existing version tracking
//     let newPrompt = currentPrompt.replace(/\[Version \d+.*?\]/g, '').trim();
    
//     // Simple example: Add version tracking and basic conversation insights
//     const userMessages = transcript.filter(msg => msg.role === 'user');
//     const agentMessages = transcript.filter(msg => msg.role === 'agent');
//     const duration = conversationData.metadata?.call_duration_secs || 0;
    
//     // Add version and basic analytics
//     newPrompt += `\n\n[Version ${versionCount] - Improved based on conversation analysis:
// - Conversation duration: ${duration} seconds
// - User messages: ${userMessages.length}
// - Agent messages: ${agentMessages.length}
// - Last conversation ID: ${conversationData.conversation_id}`;
    
//     // You could add more sophisticated improvements here:
//     // - Sentiment analysis
//     // - Topic detection
//     // - Response quality assessment
//     // - User satisfaction indicators
    
//     return newPrompt;
// }

// async function generateImprovedPrompt(currentPrompt, transcript, convoData) {
//    // 1. strip version tag
//    let nextPrompt = currentPrompt.replace(/\[Version \d+.*?]/g, "").trim();
//    // 2. Build a plain‑text transcript the LLM can grok
//    const convoText = transcript
//      .map(m => `${m.role === "user" ? "User" : "Mira"}: ${m.message}`)
//      .join("\n");

//    // 3. Ask GPT for a concise therapy‑centric summary
//        let mainTheme      = "unspecified";
//        let dominantEmotion = "neutral";
//        let nextStep        = "none";
//    try {
//      const res = await openai.chat.completions.create({
//        model: "gpt-3.5-turbo",
//        temperature: 0.4,
//        max_tokens: 120,
//        messages: [
//          {
//            role: "system",
//            content: [
//               "You are a therapy‑session summarizer.",
//               "Extract exactly three items in JSON:",
//               "{",
//               '"theme": "<≤7 words>",',
//               '"emotion": "<one word>",',
//               '"next_step": "<one sentence action>"',
//               "}"
//             ].join(" ")
//          },
//          { role: "user", content: convoText }
//        ]
//      });
//     //  summary = res.choices[0].message.content.trim();
//     const json = JSON.parse(res.choices[0].message.content);
//       mainTheme       = json.theme;
//       dominantEmotion = json.emotion;
//       nextStep        = json.next_step;
//    } catch (err) {
//      console.error("⚠️  Summary gen failed:", err.message);
//    }

//    // 4. Compose new add‑on
//    versionCounter += 1;
//    const userQuotes = transcript
//         .filter(m => m.role === "user")
//         .slice(0, 2)
//         .map(m => `• “${m.message.slice(0, 120)}”`)
//         .join("\n");
        
//     nextPrompt +=
//       `\n\n[Version ${versionCounter}]   Improved from latest session\n` +
//       `### Session Snapshot\n` +
//       `**Main theme:** ${mainTheme}\n` +
//       `**Dominant emotion:** ${dominantEmotion}\n` +
//       `**Therapeutic next step:** ${nextStep}\n` +
//       `\n### Key user quotes\n${userQuotes || "• (no quotes captured)"}\n` +
//       `\n### Mira’s suggested follow‑up\n` +
//       `Ask how often the user practised the next step and what felt most/least helpful.\n` +
//       `\n### Metadata (dev‑only)\n` +
//       `Duration ${convoData.call_duration_secs}s · ` +
//       `${convoData.user_message_count} user msgs / ` +
//       `${convoData.agent_message_count} agent msgs · ` +
//       `ID ${convoData.conversation_id}`;


//     if (nextPrompt.length > 7500) {
//   // drop oldest Dynamic Add‑Ons before appending new one
//     nextPrompt = nextPrompt.replace(/### Session Snapshot[\s\S]*?(?=\n###|$)/, "")
//                          .trim();
// }
//    return nextPrompt;
// }

async function generateImprovedPrompt(currentPrompt, transcript, convoData) {
  // ─── 1. strip previous version tag ──────────────────────────────────────────
  let nextPrompt = currentPrompt.replace(/\[Version \d+.*?]/g, '').trim();

  // ─── 2. Collapse transcript into plain text for GPT 3.5‑turbo ──────────────
  const convoText = transcript
    .map(m => `${m.role === 'user' ? 'User' : 'Mira'}: ${m.message}`)
    .join('\n');

  // ─── 3. Get theme ♦ emotion ♦ next‑step via LLM (or fallback) ──────────────
  let theme = 'general wellbeing',
      emotion = 'neutral',
      nextStep = 'none';

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.4,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: [
            'Return ONE line of valid JSON with exactly these keys:',
            '{"theme":"<≤7 words>","emotion":"<one word>","next_step":"<1 sentence>"}',
            'No markdown, no extra keys, keep it on one line.'
          ].join(' ')
        },
        { role: 'user', content: convoText }
      ]
    });
    const parsed = JSON.parse(res.choices[0].message.content);
    theme    = parsed.theme;
    emotion  = parsed.emotion;
    nextStep = parsed.next_step;
  } catch (e) {
    console.warn('⚠️  GPT summary failed, using defaults:', e.message);
  }

  // ─── 4. Pull two *meaningful* user quotes ──────────────────────────────────
  function pickTopQuotes(messages, n = 2) {
   // Rank by length ×  sentiment weight (quick heuristic)
   return messages
     .map(m => m.message.trim())
     .filter(t => t.length > 12)                // skip “ok” / “yeah”
     .sort((a, b) => b.length - a.length)       // longest ≈ richer content
     .slice(0, n)
     .map((q, idx) => {
       // Capitalise first letter, strip trailing punctuation duplication
       q = q.charAt(0).toUpperCase() + q.slice(1).replace(/\.$/, '');
       return (idx === 0 ? "**Top concern:** " : "**Second:** ") + `“${q}.”`;
     })
     .join('\n');
 }

 const userQuotes = pickTopQuotes(
   transcript.filter(m => m.role === 'user')
 ) || '**No salient quotes captured.**';

  // ─── 5. Build the Dynamic Add‑Ons block ────────────────────────────────────
  versionCounter += 1;

  nextPrompt +=
    `\n\n[Version ${versionCounter}] - Improved from latest session\n` +
    `### Session Snapshot\n` +
    `-> Main theme: ${theme}\n` +
    `-> Dominant emotion: ${emotion}\n` +
    `-> Therapeutic next step: ${nextStep}\n` +
    `\n=> Key user quotes\n${userQuotes}\n` +
    `\n=> Mira’s follow‑up cue\n` +
    `Ask how often the user practised the next step and what felt helpful.\n` +
    `\n=> Metadata (dev‑only)\n` +
    `Duration ${convoData.call_duration_secs}s · ` +
    `${convoData.user_message_count} user msgs / ` +
    `${convoData.agent_message_count} agent msgs · ` +
    `ID ${convoData.conversation_id}`;

  // ─── 6. Trim if we blow past ~7 500 chars (≈ 5.5 k tokens) ────────────────
  const MAX = 10000;
  if (nextPrompt.length > MAX) {
    nextPrompt = nextPrompt.replace(
      /### Session Snapshot[\s\S]*?(?=\n###|$)/, ''
    ).trim();
  }
  return nextPrompt;
}


/**
 * Main feedback loop processing function
 * This is called when a conversation ends
 * @param {string|null} currentPrompt - The current prompt to improve (if any)
 * @returns {Promise<Object>} Result with new version info and full prompt
 */
async function processConversationFeedback(currentPrompt = null) {
    try {
        console.log('🔄 Starting feedback loop processing...');
        
        // Step 1: Wait for and get the latest conversation
        const conversation = await waitForLatestConversation();
        if (!conversation) {
            throw new Error('No conversation found to analyze');
        }
        
        console.log(`📞 Found conversation: ${conversation.conversation_id}`);
        
        // Step 2: Get detailed conversation data
        const conversationDetails = await getConversationDetails(conversation.conversation_id);
        
        // Step 3: Get current agent prompt if not provided
        if (!currentPrompt) {
            const currentAgent = await getCurrentAgentInfo();
            currentPrompt = currentAgent.conversation_config?.agent?.prompt?.prompt || "You are a helpful assistant.";
        }
        
        // Step 4: Extract conversation transcript
        const transcript = conversationDetails.transcript || [];
        const userMessages = transcript.filter(msg => msg.role === 'user');
        const agentMessages = transcript.filter(msg => msg.role === 'agent');
        
        console.log(`🔧 Conversation analyzed - ${transcript.length} messages, ${userMessages.length} user, ${agentMessages.length} agent`);
        
        // Step 5: Generate improved prompt (THIS IS WHERE HACKERS CUSTOMIZE)
        // const improvedPrompt = await generateImprovedPrompt(currentPrompt, transcript, conversationDetails);

        const userMsgs  = transcript.filter(m => m.role === "user").length;
        const agentMsgs = transcript.filter(m => m.role === "agent").length;

        const improvedPrompt = await generateImprovedPrompt(
        currentPrompt,
        transcript,
        {
            call_duration_secs : conversationDetails.metadata?.call_duration_secs || 0,
            user_message_count: userMsgs,
            agent_message_count: agentMsgs,
            conversation_id:    conversation.conversation_id
        }
        );
        
        // Step 6: Return the new prompt info (versionCounter was already bumped inside generateImprovedPrompt)
        const result = {
        version: `v${versionCounter}`,
        description: "Enhanced based on conversation analysis",
        conversationAnalyzed: conversation.conversation_id,
        timestamp: new Date().toISOString(),
        fullPrompt: improvedPrompt
        };
    
        
        console.log('✅ Feedback loop completed successfully');
        console.log(`📞 Analyzed conversation: ${conversation.conversation_id}`);
        console.log(`🔄 Generated new prompt version ${result.version}`);
        console.log(`📝 New prompt length: ${improvedPrompt.length} characters`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Feedback loop failed:', error);
        throw error;
    }
}

module.exports = {
    processConversationFeedback,
    generateImprovedPrompt
};