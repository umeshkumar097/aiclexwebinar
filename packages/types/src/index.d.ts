export type UserStatus = 'pending' | 'active' | 'suspended' | 'deleted';
export type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'unknown';
export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    timezone: string;
    locale: string;
    status: UserStatus;
    emailVerifiedAt: string | null;
    createdAt: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface AuthUser extends UserProfile {
    roles: string[];
    permissions: string[];
    activeOrgId: string | null;
}
export interface DeviceSession {
    id: string;
    deviceName: string | null;
    deviceType: DeviceType;
    browser: string | null;
    os: string | null;
    ipAddress: string | null;
    lastActiveAt: string;
    createdAt: string;
    isCurrent: boolean;
}
export type OrgStatus = 'active' | 'suspended' | 'cancelled';
export type OrgMemberRole = 'admin' | 'host' | 'moderator';
export interface Organization {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    status: OrgStatus;
    licenseId: string;
    ownerId: string;
    createdAt: string;
}
export interface OrganizationBranding {
    primaryColor: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    customDomain: string | null;
    emailSenderName: string | null;
    emailSenderAddress: string | null;
}
export interface OrganizationMember {
    id: string;
    userId: string;
    orgId: string;
    role: OrgMemberRole;
    user: Pick<UserProfile, 'id' | 'email' | 'firstName' | 'lastName' | 'avatarUrl'>;
    joinedAt: string;
}
export interface License {
    id: string;
    name: string;
    slug: string;
    maxWebinars: number | null;
    maxAttendeesPerWebinar: number | null;
    maxHosts: number | null;
    maxStorageGb: number | null;
    features: string[];
    priceMonthly: number | null;
    priceAnnual: number | null;
    currency: string;
}
export type WebinarStatus = 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';
export type WebinarMode = 'semi_live' | 'fully_live';
export type ChatModerationMode = 'off' | 'post' | 'pre';
export interface Webinar {
    id: string;
    orgId: string;
    hostId: string;
    title: string;
    slug: string;
    description: string | null;
    category: string | null;
    language: string;
    status: WebinarStatus;
    mode: WebinarMode;
    recordingId: string | null;
    scheduledAt: string | null;
    hostTimezone: string;
    durationEstimateMins: number | null;
    maxAttendees: number | null;
    registrationRequired: boolean;
    registrationLimit: number | null;
    registrationDeadline: string | null;
    isPrivate: boolean;
    replayEnabled: boolean;
    replayExpiresAt: string | null;
    redirectUrl: string | null;
    chatModerationMode: ChatModerationMode;
    version: number;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export type RecordingStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';
export interface Recording {
    id: string;
    orgId: string;
    hostId: string;
    originalFilename: string;
    durationSeconds: number | null;
    fileSizeBytes: number | null;
    mimeType: string | null;
    status: RecordingStatus;
    thumbnailUrl: string | null;
    hlsManifestUrl: string | null;
    metadata: RecordingMetadata;
    createdAt: string;
    updatedAt: string;
}
export interface RecordingMetadata {
    resolution?: string;
    bitrate?: number;
    fps?: number;
    codec?: string;
    audioCodec?: string;
}
export type SessionStatus = 'scheduled' | 'waiting' | 'recording' | 'live' | 'ended' | 'failed';
export type SessionMode = 'waiting' | 'recording' | 'live';
export interface WebinarSession {
    id: string;
    webinarId: string;
    status: SessionStatus;
    currentMode: SessionMode;
    startedAt: string | null;
    endedAt: string | null;
    peakAttendees: number;
    totalRegistrations: number;
    createdAt: string;
}
export type TimelineEventType = 'cta' | 'poll' | 'offer' | 'resource' | 'chat' | 'testimonial' | 'countdown' | 'quiz' | 'redirect' | 'custom';
export interface TimelineEvent {
    id: string;
    webinarId: string;
    type: TimelineEventType;
    triggerAtSeconds: number;
    durationSeconds: number | null;
    payload: TimelineEventPayload;
    isEnabled: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}
export type TimelineEventPayload = CtaPayload | PollPayload | OfferPayload | ResourcePayload | ChatPayload | TestimonialPayload | CountdownPayload | RedirectPayload;
export interface CtaPayload {
    type: 'cta';
    label: string;
    url: string;
    buttonColor?: string;
    openInNewTab?: boolean;
}
export interface PollPayload {
    type: 'poll';
    pollId: string;
    autoCloseSeconds?: number;
}
export interface OfferPayload {
    type: 'offer';
    offerId: string;
    showCountdown?: boolean;
}
export interface ResourcePayload {
    type: 'resource';
    resourceId: string;
}
export interface ChatPayload {
    type: 'chat';
    senderName: string;
    message: string;
}
export interface TestimonialPayload {
    type: 'testimonial';
    name: string;
    quote: string;
    avatarUrl?: string;
    company?: string;
}
export interface CountdownPayload {
    type: 'countdown';
    targetSeconds: number;
    label?: string;
}
export interface RedirectPayload {
    type: 'redirect';
    url: string;
    delaySeconds?: number;
}
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'attended';
export interface Registration {
    id: string;
    webinarId: string;
    userId: string | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: RegistrationStatus;
    registeredAt: string;
    confirmedAt: string | null;
}
export type PollStatus = 'draft' | 'open' | 'closed';
export interface Poll {
    id: string;
    webinarId: string;
    question: string;
    options: PollOption[];
    allowMultiple: boolean;
    showResultsToAttendees: boolean;
    status: PollStatus;
    openedAt: string | null;
    closedAt: string | null;
}
export interface PollOption {
    id: string;
    text: string;
}
export interface PollResults {
    pollId: string;
    totalResponses: number;
    options: Array<{
        id: string;
        text: string;
        count: number;
        percentage: number;
    }>;
}
export type CouponType = 'percentage' | 'fixed';
export interface Offer {
    id: string;
    webinarId: string;
    name: string;
    description: string | null;
    priceCents: number;
    comparePriceCents: number | null;
    currency: string;
    ctaText: string;
    ctaUrl: string;
    imageUrl: string | null;
    expiresAt: string | null;
    isActive: boolean;
}
export interface Coupon {
    id: string;
    orgId: string;
    code: string;
    type: CouponType;
    value: number;
    currency: string | null;
    maxUses: number | null;
    usedCount: number;
    validFrom: string | null;
    validUntil: string | null;
    isActive: boolean;
}
export type NotificationType = 'email' | 'whatsapp' | 'in_app' | 'push';
export type NotificationStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'read';
export interface Notification {
    id: string;
    type: NotificationType;
    templateKey: string;
    status: NotificationStatus;
    scheduledAt: string | null;
    sentAt: string | null;
    readAt: string | null;
    createdAt: string;
}
export interface WebinarAnalyticsSummary {
    webinarId: string;
    sessionId: string | null;
    totalRegistrations: number;
    totalAttendees: number;
    attendanceRate: number;
    avgWatchDurationSeconds: number;
    peakConcurrent: number;
    ctaClicks: number;
    offerViews: number;
    offerConversions: number;
    pollResponses: number;
    questionsAsked: number;
    replayViews: number;
    revenueCents: number;
    computedAt: string;
}
export interface RetentionDataPoint {
    positionSeconds: number;
    audiencePercentage: number;
}
export interface ApiResponse<T> {
    success: true;
    data: T;
    meta?: PaginationMeta;
}
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string;
        timestamp: string;
    };
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
}
export interface WsMessage<T = unknown> {
    id: string;
    type: string;
    payload: T;
    timestamp: string;
    sessionId: string;
}
export interface WsError {
    type: 'error';
    payload: {
        code: string;
        message: string;
        retryAfter?: number;
    };
}
export declare const PERMISSIONS: {
    readonly ORG_CREATE: "org:create";
    readonly ORG_MANAGE: "org:manage";
    readonly ORG_DELETE: "org:delete";
    readonly LICENSE_MANAGE: "license:manage";
    readonly USER_MANAGE_PLATFORM: "user:manage_platform";
    readonly USER_MANAGE_ORG: "user:manage_org";
    readonly WEBINAR_CREATE: "webinar:create";
    readonly WEBINAR_EDIT_OWN: "webinar:edit_own";
    readonly WEBINAR_EDIT_ANY: "webinar:edit_any";
    readonly WEBINAR_DELETE_OWN: "webinar:delete_own";
    readonly WEBINAR_DELETE_ANY: "webinar:delete_any";
    readonly WEBINAR_PUBLISH: "webinar:publish";
    readonly WEBINAR_GO_LIVE: "webinar:go_live";
    readonly WEBINAR_MODERATE: "webinar:moderate";
    readonly RECORDING_UPLOAD: "recording:upload";
    readonly RECORDING_DELETE: "recording:delete";
    readonly REGISTRATION_VIEW: "registration:view";
    readonly REGISTRATION_EXPORT: "registration:export";
    readonly ATTENDEE_JOIN_WEBINAR: "attendee:join_webinar";
    readonly CHAT_SEND: "chat:send";
    readonly CHAT_DELETE_ANY: "chat:delete_any";
    readonly POLL_CREATE: "poll:create";
    readonly POLL_RESPOND: "poll:respond";
    readonly OFFER_CREATE: "offer:create";
    readonly COUPON_CREATE: "coupon:create";
    readonly ANALYTICS_VIEW_OWN: "analytics:view_own";
    readonly ANALYTICS_VIEW_ALL: "analytics:view_all";
    readonly AUDIT_LOG_VIEW: "audit_log:view";
    readonly PAYMENT_MANAGE: "payment:manage";
    readonly WEBHOOK_MANAGE: "webhook:manage";
    readonly ADMIN_ACCESS: "admin:access";
    readonly USER_LIST: "user:list";
    readonly USER_READ: "user:read";
    readonly USER_UPDATE_STATUS: "user:update_status";
    readonly USER_DELETE: "user:delete";
};
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export declare const ROLES: {
    readonly SUPER_ADMIN: "super_admin";
    readonly PLATFORM_ADMIN: "platform_admin";
    readonly SUPPORT: "support";
    readonly SALES: "sales";
    readonly ORG_ADMIN: "org_admin";
    readonly HOST: "host";
    readonly MODERATOR: "moderator";
    readonly REGISTERED_USER: "registered_user";
    readonly GUEST: "guest";
};
export type Role = (typeof ROLES)[keyof typeof ROLES];
//# sourceMappingURL=index.d.ts.map