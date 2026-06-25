/**
 * @file events.ts
 * @layer Shared
 * @responsibility All Socket.IO event names as single source of truth
 */
export declare const SOCKET_EVENTS: {
    readonly CLIENT: {
        readonly JOIN_CONVERSATION: "conversation:join";
        readonly LEAVE_CONVERSATION: "conversation:leave";
        readonly SEND_MESSAGE: "message:send";
        readonly TYPING_START: "typing:start";
        readonly TYPING_STOP: "typing:stop";
        readonly MARK_READ: "message:markRead";
    };
    readonly SERVER: {
        readonly MESSAGE_NEW: "message:new";
        readonly MESSAGE_UPDATED: "message:updated";
        readonly MESSAGE_DELETED: "message:deleted";
        readonly TYPING_START: "typing:start";
        readonly TYPING_STOP: "typing:stop";
        readonly USER_ONLINE: "user:online";
        readonly USER_OFFLINE: "user:offline";
        readonly UNREAD_COUNT: "message:unreadCount";
        readonly ERROR: "socket:error";
    };
};
export type ClientSocketEvent = (typeof SOCKET_EVENTS.CLIENT)[keyof typeof SOCKET_EVENTS.CLIENT];
export type ServerSocketEvent = (typeof SOCKET_EVENTS.SERVER)[keyof typeof SOCKET_EVENTS.SERVER];
//# sourceMappingURL=events.d.ts.map