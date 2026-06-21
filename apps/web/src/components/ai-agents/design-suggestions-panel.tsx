'use client';

import { useState, useCallback } from 'react';
import { getClientApi } from '@/lib/client-api';
import type { AiDesignSuggestionsResult } from '@custom-merch/shared';

interface DesignSuggestionsPanelProps {
  prompt?: string;
  onSelectSuggestion?: (suggestion: any) => void;
}

export function DesignSuggestionsPanel({
  prompt,
  onSelectSuggestion,
}: DesignSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AiDesignSuggestionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const handleGetSuggestions = useCallback(async () => {
    if (!prompt?.trim()) return;

    setLoading(true);
    try {
      const api = getClientApi();
      const result = await api.ai.designSuggestions({
        scene: prompt,
      });
      setSuggestions(result);
      setShowPanel(true);
    } catch (err) {
      console.error('Failed to get design suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  if (!prompt) return null;

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <span className="text-sm font-medium text-gray-700">💡 Design Suggestions</span>
        <span className="text-gray-400">{showPanel ? '▼' : '▶'}</span>
      </button>

      {showPanel && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {!suggestions && !loading && (
            <button
              onClick={handleGetSuggestions}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors"
            >
              Get Design Suggestions
            </button>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600">Generating suggestions...</span>
            </div>
          )}

          {suggestions && (
            <div className="space-y-3">
              {suggestions.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 cursor-pointer transition-colors"
                  onClick={() => onSelectSuggestion?.(suggestion)}
                >
                  <h4 className="font-semibold text-sm text-gray-900">{suggestion.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{suggestion.slogan}</p>
                  <div className="flex gap-1 mt-2">
                    {suggestion.colors.map((color) => (
                      <div
                        key={color}
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{suggestion.layout}</p>
                </div>
              ))}
              <p className="text-xs text-gray-500 text-center">
                Source: {suggestions.source}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
