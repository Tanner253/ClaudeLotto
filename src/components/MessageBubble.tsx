import type { Message } from '@/types';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] px-5 py-4 ${
          isUser ? 'message-user' : 'message-assistant'
        }`}
      >
        {/* Role indicator */}
        <div className={`text-xs font-semibold mb-2 uppercase tracking-wide ${
          isUser ? 'text-white/70' : 'text-[var(--text-muted)]'
        }`}>
          {isUser ? 'You' : 'Claude'}
        </div>

        {/* Message content */}
        <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser ? 'text-white' : 'text-[var(--text-primary)]'
        }`}>
          {message.content}
        </p>
      </div>
    </div>
  );
}
