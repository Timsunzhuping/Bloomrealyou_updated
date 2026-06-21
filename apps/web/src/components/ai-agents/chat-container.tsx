'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import type { Conversation } from '@custom-merch/shared';

interface ChatContainerProps {
  conversation: Conversation | null;
  loading: boolean;
  error: string | null;
  isRateLimited: boolean;
  onSendMessage: (content: string) => void;
  onClearError: () => void;
}

export function ChatContainer({
  conversation,
  loading,
  error,
  isRateLimited,
  onSendMessage,
  onClearError,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Start a conversation to begin</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <p className="text-sm opacity-90">
          Tokens: {conversation.tokenCount} | Cost: ${conversation.totalCost.toFixed(4)}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          conversation.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 my-4">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <p>Assistant is thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className={`px-4 py-3 border-t border-l-4 ${isRateLimited ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'}`}>
          <div className="flex items-start justify-between">
            <p className={`text-sm ${isRateLimited ? 'text-red-700' : 'text-yellow-700'}`}>
              {isRateLimited
                ? '⚠️ You have exceeded your daily usage limit'
                : error}
            </p>
            <button
              onClick={onClearError}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={onSendMessage}
        loading={loading}
        disabled={isRateLimited}
        placeholder={isRateLimited ? 'Rate limit exceeded' : 'Type your message...'}
      />
    </div>
  );
}
