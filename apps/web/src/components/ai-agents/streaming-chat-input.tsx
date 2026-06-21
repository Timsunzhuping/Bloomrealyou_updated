'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getClientApi } from '@/lib/client-api';
import type { SendMessageInput } from '@custom-merch/shared';

interface StreamingChatInputProps {
  conversationId: string;
  onMessageComplete: (content: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export function StreamingChatInput({
  conversationId,
  onMessageComplete,
  loading,
  disabled = false,
}: StreamingChatInputProps) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStreamMessage = useCallback(async () => {
    if (!input.trim() || disabled) return;

    const message = input.trim();
    setInput('');
    setStreaming(true);
    setStreamingContent('');

    try {
      const api = getClientApi();
      await api.agents.sendMessageStream(
        conversationId,
        { message } as SendMessageInput,
        (event) => {
          if (event.type === 'assistant_message' && event.message?.content) {
            setStreamingContent(event.message.content);
          } else if (event.type === 'token' && event.token) {
            setStreamingContent((prev) => prev + event.token);
          } else if (event.type === 'complete') {
            onMessageComplete(streamingContent);
            setStreamingContent('');
          } else if (event.type === 'error') {
            console.error('Stream error:', event);
          }
        },
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, conversationId, disabled, onMessageComplete, streamingContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStreamMessage();
    }
  };

  return (
    <div className="flex gap-3 p-6 border-t border-gray-200 bg-white">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={streaming ? 'Streaming...' : 'Type your message...'}
        disabled={streaming || disabled}
        autoFocus
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
      />
      <button
        onClick={handleStreamMessage}
        disabled={streaming || disabled || !input.trim()}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors whitespace-nowrap"
      >
        {streaming ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Streaming
          </span>
        ) : (
          'Send'
        )}
      </button>
    </div>
  );
}
