'use client';

import { useEffect, useState } from 'react';
import { useAgentChat } from '@/hooks/use-agents';
import { ChatContainer } from './chat-container';
import { ConversationSidebar } from './conversation-sidebar';
import { ConversationHeader } from './conversation-header';

export function SalesCopilotPage() {
  const {
    conversation,
    loading,
    error,
    isRateLimited,
    createConversation,
    loadConversation,
    sendMessage,
    clearError,
  } = useAgentChat();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    createConversation('sales_copilot');
  }, [createConversation]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setSidebarOpen(window.innerWidth >= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSelectConversation = async (id: string) => {
    await loadConversation(id);
    if (isMobile) setSidebarOpen(false);
  };

  const handleNewConversation = () => {
    createConversation('sales_copilot');
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="hidden md:flex md:w-64">
          <ConversationSidebar
            currentConversationId={conversation?.id || null}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && isMobile && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 z-50 md:hidden">
            <ConversationSidebar
              currentConversationId={conversation?.id || null}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
            />
          </div>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <ConversationHeader
          conversation={conversation}
          onToggleSidebar={toggleSidebar}
        />

        {/* Desktop Introduction (shown only on first load without mobile) */}
        {!conversation && !isMobile && (
          <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8 flex items-center justify-center">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Sales Assistant</h1>
              <p className="text-lg text-gray-600 mb-8">
                Discover products, get personalized recommendations, and place orders with AI assistance
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="text-3xl mb-2">🔍</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Search</h3>
                  <p className="text-sm text-gray-600">Browse our catalog</p>
                </div>
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="text-3xl mb-2">💡</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Recommendations</h3>
                  <p className="text-sm text-gray-600">Get AI suggestions</p>
                </div>
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="text-3xl mb-2">🛒</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Order</h3>
                  <p className="text-sm text-gray-600">Place orders instantly</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Container */}
        {conversation && (
          <div className="flex-1 overflow-hidden p-4 md:p-6">
            <ChatContainer
              conversation={conversation}
              loading={loading}
              error={error}
              isRateLimited={isRateLimited}
              onSendMessage={sendMessage}
              onClearError={clearError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
