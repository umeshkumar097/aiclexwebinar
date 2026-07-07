"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_ROLES = exports.FFMPEG = exports.REACTION_TYPES = exports.HTTP_HEADERS = exports.AUDIT_ACTIONS = exports.WEBHOOK_EVENTS = exports.NOTIFICATION_TEMPLATES = exports.HYBRID_LIVE = exports.WS_EVENTS = exports.REDIS_KEYS = exports.JOB_NAMES = exports.QUEUE_DLQ_SUFFIX = exports.QUEUE_NAMES = exports.RATE_LIMIT = exports.PAGINATION_MAX_LIMIT = exports.PAGINATION_DEFAULT_LIMIT = exports.PAGINATION_DEFAULT_PAGE = exports.UPLOAD_MAX_FILE_SIZE_BYTES = exports.UPLOAD_CHUNK_SIZE_MAX = exports.UPLOAD_CHUNK_SIZE_MIN = exports.UPLOAD_ALLOWED_MIME_TYPES = exports.SIGNED_URL_TTL = exports.STORAGE_CONTAINERS = exports.ORG_INVITATION_TOKEN_EXPIRY_SECONDS = exports.EMAIL_VERIFY_TOKEN_EXPIRY_SECONDS = exports.PASSWORD_RESET_TOKEN_EXPIRY_SECONDS = exports.BCRYPT_ROUNDS = exports.JWT_REFRESH_EXPIRY_DAYS = exports.JWT_ACCESS_EXPIRY_SECONDS = exports.API_PREFIX = exports.API_VERSION = void 0;
// ─── API ──────────────────────────────────────────────────────────────────────
exports.API_VERSION = 'v1';
exports.API_PREFIX = `/api/${exports.API_VERSION}`;
// ─── Auth ─────────────────────────────────────────────────────────────────────
exports.JWT_ACCESS_EXPIRY_SECONDS = 900; // 15 minutes
exports.JWT_REFRESH_EXPIRY_DAYS = 30;
exports.BCRYPT_ROUNDS = 12;
exports.PASSWORD_RESET_TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
exports.EMAIL_VERIFY_TOKEN_EXPIRY_SECONDS = 86400; // 24 hours
exports.ORG_INVITATION_TOKEN_EXPIRY_SECONDS = 86400; // 24 hours
// ─── Storage ─────────────────────────────────────────────────────────────────
exports.STORAGE_CONTAINERS = {
    RECORDINGS: 'zonvo-recordings-private',
    RESOURCES: 'zonvo-resources-private',
    ASSETS: 'zonvo-assets-public',
    EXPORTS: 'zonvo-exports-private',
    THUMBNAILS: 'zonvo-thumbnails-private',
};
exports.SIGNED_URL_TTL = {
    MEDIA: 14400, // 4 hours (HLS manifests, recordings)
    DOWNLOAD: 900, // 15 minutes (resource downloads)
    THUMBNAIL: 14400, // 4 hours
    EXPORT: 3600, // 1 hour
    AVATAR: 86400, // 24 hours (public assets, long TTL)
};
// ─── Upload ───────────────────────────────────────────────────────────────────
exports.UPLOAD_ALLOWED_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
exports.UPLOAD_CHUNK_SIZE_MIN = 5 * 1024 * 1024; // 5MB
exports.UPLOAD_CHUNK_SIZE_MAX = 100 * 1024 * 1024; // 100MB
exports.UPLOAD_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10GB (Enterprise)
// ─── Pagination ───────────────────────────────────────────────────────────────
exports.PAGINATION_DEFAULT_PAGE = 1;
exports.PAGINATION_DEFAULT_LIMIT = 20;
exports.PAGINATION_MAX_LIMIT = 100;
// ─── Rate Limiting ────────────────────────────────────────────────────────────
exports.RATE_LIMIT = {
    AUTH_LOGIN: { ttl: 60000, limit: 10 },
    AUTH_REGISTER: { ttl: 60000, limit: 5 },
    AUTH_FORGOT_PASSWORD: { ttl: 60000, limit: 3 },
    REGISTRATION: { ttl: 60000, limit: 30 },
    COUPON_VALIDATE: { ttl: 60000, limit: 20 },
    AUTHENTICATED: { ttl: 60000, limit: 300 },
    UPLOAD_CHUNK: { ttl: 60000, limit: 20 },
    WS_MESSAGES: { ttl: 60000, limit: 60 },
    WS_CHAT: { ttl: 60000, limit: 10 },
};
// ─── BullMQ Queues ────────────────────────────────────────────────────────────
exports.QUEUE_NAMES = {
    RECORDING_PROCESSING: 'recording-processing',
    NOTIFICATIONS: 'notifications',
    REMINDERS: 'reminders',
    WEBHOOKS: 'webhooks',
    ANALYTICS: 'analytics',
    EXPORTS: 'exports',
    REPLAY: 'replay',
    SESSION_MANAGEMENT: 'session-management',
};
exports.QUEUE_DLQ_SUFFIX = '-dlq';
// ─── BullMQ Job Names ─────────────────────────────────────────────────────────
exports.JOB_NAMES = {
    PROCESS_RECORDING: 'process_recording',
    SEND_EMAIL: 'send_email',
    SEND_WHATSAPP: 'send_whatsapp',
    SEND_IN_APP: 'send_in_app',
    DISPATCH_REMINDER_BATCH: 'dispatch_reminder_batch',
    DELIVER_WEBHOOK: 'deliver_webhook',
    AGGREGATE_ANALYTICS: 'aggregate_analytics',
    GENERATE_EXPORT: 'generate_export',
    GENERATE_REPLAY: 'generate_replay',
    AUTO_START_SESSION: 'auto_start_session',
    HOST_DISCONNECT_RECOVERY: 'host_disconnect_recovery',
};
// ─── Redis Keys ───────────────────────────────────────────────────────────────
exports.REDIS_KEYS = {
    PASSWORD_RESET_TOKEN: (token) => `zonvo:auth:reset:${token}`,
    EMAIL_VERIFY_TOKEN: (token) => `zonvo:auth:verify:${token}`,
    ORG_INVITE_TOKEN: (token) => `zonvo:org:invite:${token}`,
    PERMISSIONS_CACHE: (roleId) => `zonvo:perms:role:${roleId}`,
    SESSION_PRESENCE: (sessionId) => `zonvo:presence:session:${sessionId}`,
    HOST_DISCONNECT: (sessionId) => `zonvo:session:host_disconnected:${sessionId}`,
    REMINDER_DISPATCHED: (webinarId, trigger) => `zonvo:reminder:dispatched:${webinarId}:${trigger}`,
    IDEMPOTENCY: (key) => `zonvo:idempotency:${key}`,
    RATE_LIMIT: (identifier, endpoint) => `zonvo:ratelimit:${endpoint}:${identifier}`,
};
// ─── WebSocket Events ─────────────────────────────────────────────────────────
exports.WS_EVENTS = {
    // Client → Server
    JOIN_SESSION: 'join_session',
    LEAVE_SESSION: 'leave_session',
    SEND_CHAT: 'send_chat',
    SUBMIT_REACTION: 'submit_reaction',
    SUBMIT_POLL_RESPONSE: 'submit_poll_response',
    SUBMIT_QUESTION: 'submit_question',
    UPVOTE_QUESTION: 'upvote_question',
    HOST_GO_LIVE: 'host_go_live',
    HOST_RETURN_TO_RECORDING: 'host_return_to_recording',
    HOST_END_WEBINAR: 'host_end_webinar',
    MODERATOR_KICK: 'moderator_kick',
    MODERATOR_MUTE: 'moderator_mute',
    PING: 'ping',
    // Server → Client
    PONG: 'pong',
    SESSION_STARTED: 'session_started',
    SESSION_STATE: 'session_state',
    PLAYBACK_SYNC: 'playback_sync',
    GO_LIVE: 'go_live',
    RETURN_TO_RECORDING: 'return_to_recording',
    SESSION_ENDED: 'session_ended',
    CHAT_MESSAGE: 'chat_message',
    CHAT_DELETED: 'chat_deleted',
    CHAT_PINNED: 'chat_pinned',
    REACTION: 'reaction',
    POLL_OPENED: 'poll_opened',
    POLL_CLOSED: 'poll_closed',
    POLL_RESULTS_UPDATED: 'poll_results_updated',
    QUESTION_STATUS_CHANGED: 'question_status_changed',
    TIMELINE_EVENT_TRIGGERED: 'timeline_event_triggered',
    OFFER_SHOWN: 'offer_shown',
    ATTENDEE_COUNT: 'attendee_count',
    ATTENDEE_JOINED: 'attendee_joined',
    ATTENDEE_LEFT: 'attendee_left',
    NOTIFICATION: 'notification',
    RECORDING_PROCESSING_DONE: 'recording_processing_done',
    HOST_DISCONNECTED: 'host_disconnected',
    HOST_RECONNECTED: 'host_reconnected',
    KICKED: 'kicked',
    ERROR: 'error',
};
// ─── Hybrid Live ──────────────────────────────────────────────────────────────
exports.HYBRID_LIVE = {
    HOST_RECONNECT_WINDOW_SECONDS: 30,
    PLAYBACK_SYNC_INTERVAL_LIVE_MS: 5000,
    PLAYBACK_SYNC_INTERVAL_RECORDING_MS: 30000,
    PLAYBACK_DRIFT_TOLERANCE_SECONDS: 3,
    MAX_DRIFT_BEFORE_SNAP_SECONDS: 3,
    ATTENDEE_COUNT_BROADCAST_INTERVAL_MS: 5000,
};
// ─── Notification Templates ───────────────────────────────────────────────────
exports.NOTIFICATION_TEMPLATES = {
    REGISTRATION_CONFIRMED: 'registration.confirmed',
    REGISTRATION_REMINDER_24H: 'registration.reminder_24h',
    REGISTRATION_REMINDER_1H: 'registration.reminder_1h',
    REGISTRATION_REMINDER_15MIN: 'registration.reminder_15min',
    WEBINAR_STARTED: 'webinar.started',
    WEBINAR_ENDED: 'webinar.ended',
    REPLAY_READY: 'replay.ready',
    REPLAY_EXPIRING: 'replay.expiring',
    RECORDING_READY: 'recording.ready',
    RECORDING_FAILED: 'recording.failed',
    PAYMENT_CONFIRMED: 'payment.confirmed',
    PAYMENT_FAILED: 'payment.failed',
    MEMBER_INVITED: 'member.invited',
    HOST_DISCONNECTED: 'host.disconnected',
    EXPORT_READY: 'export.ready',
    VERIFY_EMAIL: 'auth.verify_email',
    RESET_PASSWORD: 'auth.reset_password',
};
// ─── Webhook Events ───────────────────────────────────────────────────────────
exports.WEBHOOK_EVENTS = {
    WEBINAR_CREATED: 'webinar.created',
    WEBINAR_PUBLISHED: 'webinar.published',
    WEBINAR_STARTED: 'webinar.started',
    WEBINAR_ENDED: 'webinar.ended',
    REGISTRATION_COMPLETED: 'registration.completed',
    REGISTRATION_CANCELLED: 'registration.cancelled',
    PAYMENT_SUCCESS: 'payment.success',
    PAYMENT_FAILED: 'payment.failed',
    REPLAY_PUBLISHED: 'replay.published',
};
// ─── Audit Actions ────────────────────────────────────────────────────────────
exports.AUDIT_ACTIONS = {
    USER_REGISTERED: 'user.registered',
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_LOGIN_FAILED: 'user.login_failed',
    USER_PASSWORD_CHANGED: 'user.password_changed',
    USER_PASSWORD_RESET: 'user.password_reset',
    USER_EMAIL_VERIFIED: 'user.email_verified',
    USER_DEVICE_REVOKED: 'user.device_revoked',
    USER_ALL_SESSIONS_REVOKED: 'user.all_sessions_revoked',
    USER_STATUS_CHANGED: 'user.status_changed',
    ORG_CREATED: 'org.created',
    ORG_UPDATED: 'org.updated',
    ORG_DELETED: 'org.deleted',
    ORG_MEMBER_INVITED: 'org.member_invited',
    ORG_MEMBER_JOINED: 'org.member_joined',
    ORG_MEMBER_ROLE_CHANGED: 'org.member_role_changed',
    ORG_MEMBER_REMOVED: 'org.member_removed',
    WEBINAR_CREATED: 'webinar.created',
    WEBINAR_UPDATED: 'webinar.updated',
    WEBINAR_PUBLISHED: 'webinar.published',
    WEBINAR_CANCELLED: 'webinar.cancelled',
    WEBINAR_DELETED: 'webinar.deleted',
    SESSION_STARTED: 'session.started',
    SESSION_GO_LIVE: 'session.go_live',
    SESSION_RETURN_TO_RECORDING: 'session.return_to_recording',
    SESSION_ENDED: 'session.ended',
    SESSION_AUTO_RECOVERED: 'session.auto_recovered',
    ATTENDEE_KICKED: 'attendee.kicked',
    RECORDING_UPLOADED: 'recording.uploaded',
    RECORDING_DELETED: 'recording.deleted',
    GDPR_ERASURE_REQUESTED: 'gdpr.erasure_requested',
    WEBHOOK_CREATED: 'webhook.created',
    WEBHOOK_DELETED: 'webhook.deleted',
};
// ─── HTTP Headers ─────────────────────────────────────────────────────────────
exports.HTTP_HEADERS = {
    ORGANIZATION_ID: 'x-organization-id',
    IDEMPOTENCY_KEY: 'idempotency-key',
    REQUEST_ID: 'x-request-id',
    ZONVO_SIGNATURE: 'x-zonvo-signature',
};
// ─── Reaction Types ───────────────────────────────────────────────────────────
exports.REACTION_TYPES = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
// ─── FFmpeg ───────────────────────────────────────────────────────────────────
exports.FFMPEG = {
    HLS_SEGMENT_DURATION: 6,
    THUMBNAIL_POSITIONS: [5, 0.5, 0.75], // seconds or fraction of duration
    VIDEO_RENDITIONS: [
        { label: '360p', width: 640, height: 360, bitrate: '800k', maxrate: '856k', bufsize: '1200k' },
        { label: '720p', width: 1280, height: 720, bitrate: '1500k', maxrate: '1605k', bufsize: '2250k' },
        { label: '1080p', width: 1920, height: 1080, bitrate: '3000k', maxrate: '3210k', bufsize: '4500k' },
    ],
    AUDIO_BITRATE: '128k',
    AUDIO_CHANNELS: 2,
    AUDIO_SAMPLE_RATE: 44100,
    MAX_RETRIES: 3,
};
// ─── Session Roles ────────────────────────────────────────────────────────────
exports.SESSION_ROLES = {
    HOST: 'host',
    CO_HOST: 'co_host',
    MODERATOR: 'moderator',
    PRODUCER: 'producer',
    ATTENDEE: 'attendee',
};
//# sourceMappingURL=index.js.map