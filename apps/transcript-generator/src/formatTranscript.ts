// Path: apps/transcript-generator/src/formatTranscript.ts

import { ProcessedConversation } from './processConversation';

export type FormatType = 'markdown' | 'html';

export function formatTranscript(conversation: ProcessedConversation, format: FormatType): string {
  const { messages, startTime, endTime } = conversation;

  const header = `Conversation from ${startTime.toLocaleString()} to ${endTime.toLocaleString()}`;

  const formattedMessages = messages.map(message => {
    const timestamp = message.timestamp.toLocaleString();
    const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
    const content = message.content;

    if (format === 'markdown') {
      return `**${role}** (${timestamp}):\n${content}\n`;
    } else {
      return `<p><strong>${role}</strong> (${timestamp}):<br>${content.replace(/\n/g, '<br>')}</p>`;
    }
  });

  if (format === 'markdown') {
    return `# ${header}\n\n${formattedMessages.join('\n')}`;
  } else {
    return `<h1>${header}</h1>${formattedMessages.join('')}`;
  }
}
