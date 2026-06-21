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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-600">Online & Ready</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sales Assistant</h1>
          <p className="text-lg text-gray-600">
            Discover products, get personalized recommendations, and place orders with AI assistance
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-1">Search</h3>
            <p className="text-sm text-gray-600">Browse our catalog</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">💡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Recommendations</h3>
            <p className="text-sm text-gray-600">Get AI suggestions</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">🛒</div>
            <h3 className="font-semibold text-gray-900 mb-1">Order</h3>
            <p className="text-sm text-gray-600">Place orders instantly</p>
          </div>
        </div>

        {/* Chat Container */}
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
