import { ConversationTurn } from './types';

export function formatTranscript(conversation: ConversationTurn[], format: 'markdown' | 'html'): string {
  if (format === 'markdown') {
    return formatMarkdown(conversation);
  } else {
    return formatHtml(conversation);
  }
}

function formatMarkdown(conversation: ConversationTurn[]): string {
  return conversation.map(turn => {
    const timestamp = new Date(turn.timestamp).toISOString();
    return `## ${turn.role.toUpperCase()} (${timestamp})\n\n${turn.content}\n`;
  }).join('\n');
}

function formatHtml(conversation: ConversationTurn[]): string {
  const turns = conversation.map(turn => {
    const timestamp = new Date(turn.timestamp).toISOString();
    return `
      <div class="turn ${turn.role}">
        <h2>${turn.role.toUpperCase()} <span class="timestamp">${timestamp}</span></h2>
        <p>${turn.content}</p>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Conversation Transcript</title>
      <style>
        .turn { margin-bottom: 20px; }
        .user { background-color: #f0f0f0; }
        .assistant { background-color: #e0e0ff; }
        .system { background-color: #ffe0e0; }
        .timestamp { font-size: 0.8em; color: #666; }
      </style>
    </head>
    <body>
      <h1>Conversation Transcript</h1>
      ${turns}
    </body>
    </html>
  `;
}
