export enum MessageType {
  GROUP = 'group',
  DIRECT = 'direct'
}

export interface ChatMessage {
  id: string;
  type: MessageType;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  // For group messages (game chat)
  gameId?: string;
  // For direct messages
  recipientId?: string;
}

export interface SendMessageRequest {
  type: MessageType;
  content: string;
  // For group messages
  gameId?: string;
  // For direct messages
  recipientId?: string;
}

export interface ConversationPreview {
  userId: string;
  username: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
}
