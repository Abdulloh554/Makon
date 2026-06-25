/**
 * @file message.types.ts
 * @layer Shared
 * @responsibility Message and conversation-related types
 */

export interface Message {
  id: string
  conversationId: string
  fromUserId: string
  toUserId: string
  propertyId: string
  text: string
  read: boolean
  readAt?: string
  edited: boolean
  editedAt?: string
  createdAt: string
  updatedAt: string
}

export interface MessageWithTempId extends Message {
  tempId?: string
  status: 'sending' | 'sent' | 'failed'
}

export interface Conversation {
  id: string
  participantId: string
  participantName: string
  participantAvatar: string
  propertyId?: string
  propertyTitle?: string
  lastMessage: string
  lastMessageAt: string
  lastMessageFromMe: boolean
  unread: number
}

export interface SendMessageRequest {
  conversationId?: string
  toUserId: string
  propertyId: string
  text: string
  tempId: string
}

export interface SendMessageResponse {
  message: Message
  tempId: string
}

export interface MarkReadRequest {
  conversationId: string
  messageIds: string[]
}
