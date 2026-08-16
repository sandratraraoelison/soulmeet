import type { GuidanceSuggestion } from '../types/guidance.types';

export const GUIDANCE_SUGGESTIONS: GuidanceSuggestion[] = [
  { id: 'write-message', mode: 'MESSAGE_HELP', title: 'Write a message', description: 'Find the right words for your situation.', starter: 'I’d like your help writing a message.', icon: '✉' },
  { id: 'analyze-conversation', mode: 'CONVERSATION_ANALYSIS', title: 'Analyze a conversation', description: 'Understand the tone, signals, and possible meaning.', starter: 'I’d like you to help me analyze a conversation.', icon: '⌕' },
  { id: 'before-conversation', mode: 'BEFORE_CONVERSATION', title: 'Prepare for a conversation', description: 'Get ready with ideas and natural opening lines.', starter: 'Help me prepare for an upcoming conversation.', icon: '✦' },
  { id: 'after-conversation', mode: 'AFTER_CONVERSATION', title: 'Reflect after a conversation', description: 'Talk through what happened and how you feel.', starter: 'I’d like to talk through a conversation I just had.', icon: '↶' },
  { id: 'prepare-date', mode: 'DATE_PREPARATION', title: 'Prepare for a date', description: 'Feel more relaxed, confident, and natural.', starter: 'Help me prepare for an upcoming date.', icon: '♡' },
  { id: 'relationship-advice', mode: 'RELATIONSHIP_ADVICE', title: 'Relationship advice', description: 'Think through a relationship situation.', starter: 'I need advice about a relationship situation.', icon: '♥' },
  { id: 'emotional-support', mode: 'EMOTIONAL_SUPPORT', title: 'I need to talk', description: 'Share what you are feeling without judgment.', starter: 'I need to talk about how I’m feeling.', icon: '◡' },
];
