'use client';

import { useEffect } from 'react';
import { useAgentChat } from '@/hooks/use-agents';
import { ChatContainer } from './chat-container';

export function SalesCopilotPage() {
  const {
    conversation,
    loading,
    error,
    isRateLimited,
    createConversation,
    sendMessage,
    clearError,
  } = useAgentChat();

  useEffect(() => {
    createConversation('sales_copilot');
  }, [createConversation]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Sales Copilot</h1>
          <p className="text-gray-600 mt-2">
            Get personalized product recommendations and place orders with AI assistance
          </p>
        </div>

        <div className="h-[600px]">
          <ChatContainer
            conversation={conversation}
            loading={loading}
            error={error}
            isRateLimited={isRateLimited}
            onSendMessage={sendMessage}
            onClearError={clearError}
          />
        </div>
      </div>
    </div>
  );
}
