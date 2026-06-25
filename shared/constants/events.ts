/**
 * @file events.ts
 * @layer Shared
 * @responsibility All Socket.IO event names as single source of truth
 */

export const SOCKET_EVENTS = {
  CLIENT: {
    JOIN_CONVERSATION: 'conversation:join',
    LEAVE_CONVERSATION: 'conversation:leave',
    SEND_MESSAGE: 'message:send',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    MARK_READ: 'message:markRead',
  },
  SERVER: {
    MESSAGE_NEW: 'message:new',
    MESSAGE_UPDATED: 'message:updated',
    MESSAGE_DELETED: 'message:deleted',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    USER_ONLINE: 'user:online',
    USER_OFFLINE: 'user:offline',
    UNREAD_COUNT: 'message:unreadCount',
    ERROR: 'socket:error',
  },
} as const

export type ClientSocketEvent = (typeof SOCKET_EVENTS.CLIENT)[keyof typeof SOCKET_EVENTS.CLIENT]
export type ServerSocketEvent = (typeof SOCKET_EVENTS.SERVER)[keyof typeof SOCKET_EVENTS.SERVER]
