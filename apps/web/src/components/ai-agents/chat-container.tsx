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
      <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Initializing conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 border-b border-blue-700">
        <h2 className="text-lg font-semibold mb-1">Sales Assistant</h2>
        <p className="text-sm opacity-90 flex gap-4">
          <span>Tokens used: {conversation.tokenCount}</span>
          <span>Cost: ${conversation.totalCost.toFixed(4)}</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 text-lg mb-2">Welcome to Sales Assistant</p>
              <p className="text-gray-500">Start by telling me what you're looking for</p>
            </div>
          </div>
        ) : (
          conversation.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        {loading && (
          <div className="flex items-center gap-3 text-gray-600 my-4 ml-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-sm">Assistant is thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className={`px-6 py-4 border-t-2 ${isRateLimited ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-sm font-medium ${isRateLimited ? 'text-red-800' : 'text-amber-800'}`}>
                {isRateLimited ? '⚠️ Usage Limit Reached' : '⚠️ Error'}
              </p>
              <p className={`text-sm mt-1 ${isRateLimited ? 'text-red-700' : 'text-amber-700'}`}>
                {isRateLimited
                  ? 'You have exceeded your daily usage limit. Please try again tomorrow.'
                  : error}
              </p>
            </div>
            <button
              onClick={onClearError}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss error"
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
