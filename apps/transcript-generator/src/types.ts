export interface TranscriptOptions {
  start: Date;
  end: Date;
  format: 'markdown' | 'html';
  output: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
