export declare const API_VERSION = "v1";
export declare const API_PREFIX = "/api/v1";
export declare const JWT_ACCESS_EXPIRY_SECONDS = 900;
export declare const JWT_REFRESH_EXPIRY_DAYS = 30;
export declare const BCRYPT_ROUNDS = 12;
export declare const PASSWORD_RESET_TOKEN_EXPIRY_SECONDS = 3600;
export declare const EMAIL_VERIFY_TOKEN_EXPIRY_SECONDS = 86400;
export declare const ORG_INVITATION_TOKEN_EXPIRY_SECONDS = 86400;
export declare const STORAGE_CONTAINERS: {
    readonly RECORDINGS: "zonvo-recordings-private";
    readonly RESOURCES: "zonvo-resources-private";
    readonly ASSETS: "zonvo-assets-public";
    readonly EXPORTS: "zonvo-exports-private";
    readonly THUMBNAILS: "zonvo-thumbnails-private";
};
export declare const SIGNED_URL_TTL: {
    readonly MEDIA: 14400;
    readonly DOWNLOAD: 900;
    readonly THUMBNAIL: 14400;
    readonly EXPORT: 3600;
    readonly AVATAR: 86400;
};
export declare const UPLOAD_ALLOWED_MIME_TYPES: string[];
export declare const UPLOAD_CHUNK_SIZE_MIN: number;
export declare const UPLOAD_CHUNK_SIZE_MAX: number;
export declare const UPLOAD_MAX_FILE_SIZE_BYTES: number;
export declare const PAGINATION_DEFAULT_PAGE = 1;
export declare const PAGINATION_DEFAULT_LIMIT = 20;
export declare const PAGINATION_MAX_LIMIT = 100;
export declare const RATE_LIMIT: {
    readonly AUTH_LOGIN: {
        readonly ttl: 60000;
        readonly limit: 10;
    };
    readonly AUTH_REGISTER: {
        readonly ttl: 60000;
        readonly limit: 5;
    };
    readonly AUTH_FORGOT_PASSWORD: {
        readonly ttl: 60000;
        readonly limit: 3;
    };
    readonly REGISTRATION: {
        readonly ttl: 60000;
        readonly limit: 30;
    };
    readonly COUPON_VALIDATE: {
        readonly ttl: 60000;
        readonly limit: 20;
    };
    readonly AUTHENTICATED: {
        readonly ttl: 60000;
        readonly limit: 300;
    };
    readonly UPLOAD_CHUNK: {
        readonly ttl: 60000;
        readonly limit: 20;
    };
    readonly WS_MESSAGES: {
        readonly ttl: 60000;
        readonly limit: 60;
    };
    readonly WS_CHAT: {
        readonly ttl: 60000;
        readonly limit: 10;
    };
};
export declare const QUEUE_NAMES: {
    readonly RECORDING_PROCESSING: "recording-processing";
    readonly NOTIFICATIONS: "notifications";
    readonly REMINDERS: "reminders";
    readonly WEBHOOKS: "webhooks";
    readonly ANALYTICS: "analytics";
    readonly EXPORTS: "exports";
    readonly REPLAY: "replay";
    readonly SESSION_MANAGEMENT: "session-management";
};
export declare const QUEUE_DLQ_SUFFIX = "-dlq";
export declare const JOB_NAMES: {
    readonly PROCESS_RECORDING: "process_recording";
    readonly SEND_EMAIL: "send_email";
    readonly SEND_WHATSAPP: "send_whatsapp";
    readonly SEND_IN_APP: "send_in_app";
    readonly DISPATCH_REMINDER_BATCH: "dispatch_reminder_batch";
    readonly DELIVER_WEBHOOK: "deliver_webhook";
    readonly AGGREGATE_ANALYTICS: "aggregate_analytics";
    readonly GENERATE_EXPORT: "generate_export";
    readonly GENERATE_REPLAY: "generate_replay";
    readonly AUTO_START_SESSION: "auto_start_session";
    readonly HOST_DISCONNECT_RECOVERY: "host_disconnect_recovery";
};
export declare const REDIS_KEYS: {
    readonly PASSWORD_RESET_TOKEN: (token: string) => string;
    readonly EMAIL_VERIFY_TOKEN: (token: string) => string;
    readonly ORG_INVITE_TOKEN: (token: string) => string;
    readonly PERMISSIONS_CACHE: (roleId: string) => string;
    readonly SESSION_PRESENCE: (sessionId: string) => string;
    readonly HOST_DISCONNECT: (sessionId: string) => string;
    readonly REMINDER_DISPATCHED: (webinarId: string, trigger: string) => string;
    readonly IDEMPOTENCY: (key: string) => string;
    readonly RATE_LIMIT: (identifier: string, endpoint: string) => string;
};
export declare const WS_EVENTS: {
    readonly JOIN_SESSION: "join_session";
    readonly LEAVE_SESSION: "leave_session";
    readonly SEND_CHAT: "send_chat";
    readonly SUBMIT_REACTION: "submit_reaction";
    readonly SUBMIT_POLL_RESPONSE: "submit_poll_response";
    readonly SUBMIT_QUESTION: "submit_question";
    readonly UPVOTE_QUESTION: "upvote_question";
    readonly HOST_GO_LIVE: "host_go_live";
    readonly HOST_RETURN_TO_RECORDING: "host_return_to_recording";
    readonly HOST_END_WEBINAR: "host_end_webinar";
    readonly MODERATOR_KICK: "moderator_kick";
    readonly MODERATOR_MUTE: "moderator_mute";
    readonly PING: "ping";
    readonly PONG: "pong";
    readonly SESSION_STARTED: "session_started";
    readonly SESSION_STATE: "session_state";
    readonly PLAYBACK_SYNC: "playback_sync";
    readonly GO_LIVE: "go_live";
    readonly RETURN_TO_RECORDING: "return_to_recording";
    readonly SESSION_ENDED: "session_ended";
    readonly CHAT_MESSAGE: "chat_message";
    readonly CHAT_DELETED: "chat_deleted";
    readonly CHAT_PINNED: "chat_pinned";
    readonly REACTION: "reaction";
    readonly POLL_OPENED: "poll_opened";
    readonly POLL_CLOSED: "poll_closed";
    readonly POLL_RESULTS_UPDATED: "poll_results_updated";
    readonly QUESTION_STATUS_CHANGED: "question_status_changed";
    readonly TIMELINE_EVENT_TRIGGERED: "timeline_event_triggered";
    readonly OFFER_SHOWN: "offer_shown";
    readonly ATTENDEE_COUNT: "attendee_count";
    readonly ATTENDEE_JOINED: "attendee_joined";
    readonly ATTENDEE_LEFT: "attendee_left";
    readonly NOTIFICATION: "notification";
    readonly RECORDING_PROCESSING_DONE: "recording_processing_done";
    readonly HOST_DISCONNECTED: "host_disconnected";
    readonly HOST_RECONNECTED: "host_reconnected";
    readonly KICKED: "kicked";
    readonly ERROR: "error";
};
export declare const HYBRID_LIVE: {
    readonly HOST_RECONNECT_WINDOW_SECONDS: 30;
    readonly PLAYBACK_SYNC_INTERVAL_LIVE_MS: 5000;
    readonly PLAYBACK_SYNC_INTERVAL_RECORDING_MS: 30000;
    readonly PLAYBACK_DRIFT_TOLERANCE_SECONDS: 3;
    readonly MAX_DRIFT_BEFORE_SNAP_SECONDS: 3;
    readonly ATTENDEE_COUNT_BROADCAST_INTERVAL_MS: 5000;
};
export declare const NOTIFICATION_TEMPLATES: {
    readonly REGISTRATION_CONFIRMED: "registration.confirmed";
    readonly REGISTRATION_REMINDER_24H: "registration.reminder_24h";
    readonly REGISTRATION_REMINDER_1H: "registration.reminder_1h";
    readonly REGISTRATION_REMINDER_15MIN: "registration.reminder_15min";
    readonly WEBINAR_STARTED: "webinar.started";
    readonly WEBINAR_ENDED: "webinar.ended";
    readonly REPLAY_READY: "replay.ready";
    readonly REPLAY_EXPIRING: "replay.expiring";
    readonly RECORDING_READY: "recording.ready";
    readonly RECORDING_FAILED: "recording.failed";
    readonly PAYMENT_CONFIRMED: "payment.confirmed";
    readonly PAYMENT_FAILED: "payment.failed";
    readonly MEMBER_INVITED: "member.invited";
    readonly HOST_DISCONNECTED: "host.disconnected";
    readonly EXPORT_READY: "export.ready";
    readonly VERIFY_EMAIL: "auth.verify_email";
    readonly RESET_PASSWORD: "auth.reset_password";
};
export declare const WEBHOOK_EVENTS: {
    readonly WEBINAR_CREATED: "webinar.created";
    readonly WEBINAR_PUBLISHED: "webinar.published";
    readonly WEBINAR_STARTED: "webinar.started";
    readonly WEBINAR_ENDED: "webinar.ended";
    readonly REGISTRATION_COMPLETED: "registration.completed";
    readonly REGISTRATION_CANCELLED: "registration.cancelled";
    readonly PAYMENT_SUCCESS: "payment.success";
    readonly PAYMENT_FAILED: "payment.failed";
    readonly REPLAY_PUBLISHED: "replay.published";
};
export declare const AUDIT_ACTIONS: {
    readonly USER_REGISTERED: "user.registered";
    readonly USER_LOGIN: "user.login";
    readonly USER_LOGOUT: "user.logout";
    readonly USER_LOGIN_FAILED: "user.login_failed";
    readonly USER_PASSWORD_CHANGED: "user.password_changed";
    readonly USER_PASSWORD_RESET: "user.password_reset";
    readonly USER_EMAIL_VERIFIED: "user.email_verified";
    readonly USER_DEVICE_REVOKED: "user.device_revoked";
    readonly USER_ALL_SESSIONS_REVOKED: "user.all_sessions_revoked";
    readonly USER_STATUS_CHANGED: "user.status_changed";
    readonly ORG_CREATED: "org.created";
    readonly ORG_UPDATED: "org.updated";
    readonly ORG_DELETED: "org.deleted";
    readonly ORG_MEMBER_INVITED: "org.member_invited";
    readonly ORG_MEMBER_JOINED: "org.member_joined";
    readonly ORG_MEMBER_ROLE_CHANGED: "org.member_role_changed";
    readonly ORG_MEMBER_REMOVED: "org.member_removed";
    readonly WEBINAR_CREATED: "webinar.created";
    readonly WEBINAR_UPDATED: "webinar.updated";
    readonly WEBINAR_PUBLISHED: "webinar.published";
    readonly WEBINAR_CANCELLED: "webinar.cancelled";
    readonly WEBINAR_DELETED: "webinar.deleted";
    readonly SESSION_STARTED: "session.started";
    readonly SESSION_GO_LIVE: "session.go_live";
    readonly SESSION_RETURN_TO_RECORDING: "session.return_to_recording";
    readonly SESSION_ENDED: "session.ended";
    readonly SESSION_AUTO_RECOVERED: "session.auto_recovered";
    readonly ATTENDEE_KICKED: "attendee.kicked";
    readonly RECORDING_UPLOADED: "recording.uploaded";
    readonly RECORDING_DELETED: "recording.deleted";
    readonly GDPR_ERASURE_REQUESTED: "gdpr.erasure_requested";
    readonly WEBHOOK_CREATED: "webhook.created";
    readonly WEBHOOK_DELETED: "webhook.deleted";
};
export declare const HTTP_HEADERS: {
    readonly ORGANIZATION_ID: "x-organization-id";
    readonly IDEMPOTENCY_KEY: "idempotency-key";
    readonly REQUEST_ID: "x-request-id";
    readonly ZONVO_SIGNATURE: "x-zonvo-signature";
};
export declare const REACTION_TYPES: readonly ["like", "love", "laugh", "wow", "sad", "angry"];
export type ReactionType = (typeof REACTION_TYPES)[number];
export declare const FFMPEG: {
    readonly HLS_SEGMENT_DURATION: 6;
    readonly THUMBNAIL_POSITIONS: readonly [5, 0.5, 0.75];
    readonly VIDEO_RENDITIONS: readonly [{
        readonly label: "360p";
        readonly width: 640;
        readonly height: 360;
        readonly bitrate: "800k";
        readonly maxrate: "856k";
        readonly bufsize: "1200k";
    }, {
        readonly label: "720p";
        readonly width: 1280;
        readonly height: 720;
        readonly bitrate: "1500k";
        readonly maxrate: "1605k";
        readonly bufsize: "2250k";
    }, {
        readonly label: "1080p";
        readonly width: 1920;
        readonly height: 1080;
        readonly bitrate: "3000k";
        readonly maxrate: "3210k";
        readonly bufsize: "4500k";
    }];
    readonly AUDIO_BITRATE: "128k";
    readonly AUDIO_CHANNELS: 2;
    readonly AUDIO_SAMPLE_RATE: 44100;
    readonly MAX_RETRIES: 3;
};
export declare const SESSION_ROLES: {
    readonly HOST: "host";
    readonly CO_HOST: "co_host";
    readonly MODERATOR: "moderator";
    readonly PRODUCER: "producer";
    readonly ATTENDEE: "attendee";
};
//# sourceMappingURL=index.d.ts.map