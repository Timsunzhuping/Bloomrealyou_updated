'use client';

import { useState, useCallback } from 'react';
import { getClientApi } from '@/lib/client-api';
import type { Conversation } from '@custom-merch/shared';

export interface UseAgentChatState {
  conversation: Conversation | null;
  loading: boolean;
  error: string | null;
  isRateLimited: boolean;
}

export interface UseAgentChat extends UseAgentChatState {
  createConversation: (agentType: 'sales_copilot' | 'support_agent') => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
}

export function useAgentChat(): UseAgentChat {
  const [state, setState] = useState<UseAgentChatState>({
    conversation: null,
    loading: false,
    error: null,
    isRateLimited: false,
  });

  const createConversation = useCallback(
    async (agentType: 'sales_copilot' | 'support_agent') => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const api = getClientApi();
        const result = await api.agents.createConversation({ agentType });
        setState((prev) => ({
          ...prev,
          conversation: result.conversation,
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create conversation';
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    },
    [],
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const api = getClientApi();
        const result = await api.agents.getConversation(conversationId);
        setState((prev) => ({
          ...prev,
          conversation: result.conversation,
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load conversation';
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!state.conversation || !content.trim()) return;

      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const api = getClientApi();
        const result = await api.agents.sendMessage(state.conversation.id, { message: content });
        setState((prev) => ({
          ...prev,
          conversation: result.conversation,
          loading: false,
          isRateLimited: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        const isRateLimited = message.includes('rate limit') || message.includes('429');
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
          isRateLimited,
        }));
      }
    },
    [state.conversation],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createConversation,
    loadConversation,
    sendMessage,
    clearError,
  };
}
