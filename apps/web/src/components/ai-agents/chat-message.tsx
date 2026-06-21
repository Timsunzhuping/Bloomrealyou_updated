'use client';

import { type ConversationMessage } from '@custom-merch/shared';

interface ChatMessageProps {
  message: ConversationMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex-1 max-w-md px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 text-xs opacity-75">
            <p className="font-semibold">Using tools:</p>
            {message.toolCalls.map((tool) => (
              <div key={tool.id} className="ml-2 mt-1">
                <code>{tool.name}</code>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
