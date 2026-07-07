"use strict";
// ─── User & Auth ──────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = exports.PERMISSIONS = void 0;
// ─── Permissions ─────────────────────────────────────────────────────────────
exports.PERMISSIONS = {
    ORG_CREATE: 'org:create',
    ORG_MANAGE: 'org:manage',
    ORG_DELETE: 'org:delete',
    LICENSE_MANAGE: 'license:manage',
    USER_MANAGE_PLATFORM: 'user:manage_platform',
    USER_MANAGE_ORG: 'user:manage_org',
    WEBINAR_CREATE: 'webinar:create',
    WEBINAR_EDIT_OWN: 'webinar:edit_own',
    WEBINAR_EDIT_ANY: 'webinar:edit_any',
    WEBINAR_DELETE_OWN: 'webinar:delete_own',
    WEBINAR_DELETE_ANY: 'webinar:delete_any',
    WEBINAR_PUBLISH: 'webinar:publish',
    WEBINAR_GO_LIVE: 'webinar:go_live',
    WEBINAR_MODERATE: 'webinar:moderate',
    RECORDING_UPLOAD: 'recording:upload',
    RECORDING_DELETE: 'recording:delete',
    REGISTRATION_VIEW: 'registration:view',
    REGISTRATION_EXPORT: 'registration:export',
    ATTENDEE_JOIN_WEBINAR: 'attendee:join_webinar',
    CHAT_SEND: 'chat:send',
    CHAT_DELETE_ANY: 'chat:delete_any',
    POLL_CREATE: 'poll:create',
    POLL_RESPOND: 'poll:respond',
    OFFER_CREATE: 'offer:create',
    COUPON_CREATE: 'coupon:create',
    ANALYTICS_VIEW_OWN: 'analytics:view_own',
    ANALYTICS_VIEW_ALL: 'analytics:view_all',
    AUDIT_LOG_VIEW: 'audit_log:view',
    PAYMENT_MANAGE: 'payment:manage',
    WEBHOOK_MANAGE: 'webhook:manage',
    ADMIN_ACCESS: 'admin:access',
    // User management
    USER_LIST: 'user:list',
    USER_READ: 'user:read',
    USER_UPDATE_STATUS: 'user:update_status',
    USER_DELETE: 'user:delete',
};
// ─── Roles ────────────────────────────────────────────────────────────────────
exports.ROLES = {
    SUPER_ADMIN: 'super_admin',
    PLATFORM_ADMIN: 'platform_admin',
    SUPPORT: 'support',
    SALES: 'sales',
    ORG_ADMIN: 'org_admin',
    HOST: 'host',
    MODERATOR: 'moderator',
    REGISTERED_USER: 'registered_user',
    GUEST: 'guest',
};
//# sourceMappingURL=index.js.map