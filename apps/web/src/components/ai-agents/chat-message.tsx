'use client';

import { type ConversationMessage } from '@custom-merch/shared';

interface ChatMessageProps {
  message: ConversationMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
          A
        </div>
      )}
      <div
        className={`flex-1 max-w-2xl px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white rounded-tr-none'
            : 'bg-gray-100 text-gray-900 rounded-tl-none border border-gray-200'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300 text-xs opacity-75">
            <p className="font-semibold mb-2">Using tools:</p>
            <div className="flex flex-wrap gap-2">
              {message.toolCalls.map((tool) => (
                <span key={tool.id} className="bg-gray-200 px-2 py-1 rounded">
                  {tool.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold">
          U
        </div>
      )}
    </div>
  );
}
