'use client';

import { useState } from 'react';
import { getClientApi } from '@/lib/client-api';
import type { Conversation } from '@custom-merch/shared';

interface ConversationHeaderProps {
  conversation: Conversation | null;
  onToggleSidebar: () => void;
}

export function ConversationHeader({ conversation, onToggleSidebar }: ConversationHeaderProps) {
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    if (!conversation) return;

    setExporting(true);
    try {
      const api = getClientApi();
      const blob = await api.agents.exportConversation(conversation.id);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation-${conversation.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = () => {
    if (!conversation) return;

    const url = `${window.location.origin}${window.location.pathname}?conv=${conversation.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = async () => {
    if (!conversation) return;

    setExporting(true);
    try {
      const api = getClientApi();
      const blob = await api.agents.exportConversationPdf(conversation.id);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation-${conversation.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 border-b border-blue-700 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-blue-400 rounded-lg transition-colors"
          title="Toggle sidebar"
        >
          ☰
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Sales Assistant</h2>
          {conversation && (
            <p className="text-sm opacity-90">
              Tokens: {conversation.tokenCount} | Cost: ${conversation.totalCost.toFixed(4)}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {conversation && (
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-2 bg-blue-400 hover:bg-blue-300 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            title="Download conversation as text"
          >
            {exporting ? '⏳' : '📄'} Text
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-3 py-2 bg-blue-400 hover:bg-blue-300 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            title="Download conversation as PDF"
          >
            {exporting ? '⏳' : '📕'} PDF
          </button>
          <button
            onClick={handleShare}
            className="px-3 py-2 bg-blue-400 hover:bg-blue-300 text-white rounded-lg text-sm transition-colors"
            title="Copy share link"
          >
            {copied ? '✓' : '🔗'} {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      )}
    </div>
  );
}
