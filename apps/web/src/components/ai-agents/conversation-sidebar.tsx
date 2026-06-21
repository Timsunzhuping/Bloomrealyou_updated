'use client';

import { useState, useEffect } from 'react';
import { getClientApi } from '@/lib/client-api';
import { ConversationSearch } from './conversation-search';
import type { Conversation } from '@custom-merch/shared';

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const api = getClientApi();
        const result = await api.agents.listConversations();
        if ('conversations' in result) {
          const convs = result.conversations as Conversation[];
          setConversations(convs);
          setFilteredConversations(convs);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load conversations';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  const handleSearchResults = (results: Conversation[]) => {
    setFilteredConversations(results.length > 0 ? results : conversations);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64 border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 space-y-2">
        <button
          onClick={onNewConversation}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors text-sm"
        >
          + New Chat
        </button>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors text-sm"
        >
          🔍 {showSearch ? 'Hide' : 'Search'}
        </button>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="bg-gray-800 border-b border-gray-700">
          <ConversationSearch onResultsChange={handleSearchResults} />
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-gray-400 text-sm p-2">Loading...</div>
        ) : error ? (
          <div className="text-red-400 text-sm p-2">{error}</div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-gray-400 text-sm p-2">No conversations yet</div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm truncate ${
                currentConversationId === conv.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
              title={conv.messages[0]?.content || 'Conversation'}
            >
              <div className="truncate">
                {conv.messages[0]?.content.slice(0, 30) || 'Empty'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(conv.createdAt).toLocaleDateString()}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-400">
        <p>Showing {filteredConversations.length} of {conversations.length}</p>
      </div>
    </div>
  );
}
