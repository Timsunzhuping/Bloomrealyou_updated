'use client';

import { useState, useCallback } from 'react';
import { getClientApi } from '@/lib/client-api';
import type { Conversation, AgentType } from '@custom-merch/shared';

interface ConversationSearchProps {
  onResultsChange: (conversations: Conversation[]) => void;
}

export function ConversationSearch({ onResultsChange }: ConversationSearchProps) {
  const [query, setQuery] = useState('');
  const [agentType, setAgentType] = useState<AgentType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    setSearching(true);
    try {
      const api = getClientApi();
      const result = await api.agents.searchConversations(
        query || undefined,
        agentType || undefined,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      if ('conversations' in result) {
        onResultsChange(result.conversations as Conversation[]);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, [query, agentType, startDate, endDate, onResultsChange]);

  const handleReset = () => {
    setQuery('');
    setAgentType('');
    setStartDate('');
    setEndDate('');
    onResultsChange([]);
  };

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Search Conversations</h3>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search by keyword..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={agentType}
          onChange={(e) => setAgentType(e.target.value as AgentType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Agent Types</option>
          <option value="sales_copilot">Sales Copilot</option>
          <option value="support_agent">Support Agent</option>
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={searching}
          className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 text-sm font-medium transition-colors"
        >
          {searching ? '🔍 Searching...' : '🔍 Search'}
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
