import { Memento } from '@memento-ai/types';
import { ConversationTurn } from './types';

export function processConversation(mementos: Memento[]): ConversationTurn[] {
  return mementos.map(memento => ({
    role: memento.kind === 'conv' ? memento.role : 'system',
    content: memento.content,
    timestamp: memento.created_at
  }));
}
