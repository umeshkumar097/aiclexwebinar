// ─── User & Auth ──────────────────────────────────────────────────────────────

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

// ─── Organization ─────────────────────────────────────────────────────────────

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

// ─── License ──────────────────────────────────────────────────────────────────

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

// ─── Webinar ──────────────────────────────────────────────────────────────────

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

// ─── Recording ────────────────────────────────────────────────────────────────

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

// ─── Session ──────────────────────────────────────────────────────────────────

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

// ─── Timeline ─────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | 'cta'
  | 'poll'
  | 'offer'
  | 'resource'
  | 'chat'
  | 'testimonial'
  | 'countdown'
  | 'quiz'
  | 'redirect'
  | 'custom';

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

export type TimelineEventPayload =
  | CtaPayload
  | PollPayload
  | OfferPayload
  | ResourcePayload
  | ChatPayload
  | TestimonialPayload
  | CountdownPayload
  | RedirectPayload;

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

// ─── Registration ─────────────────────────────────────────────────────────────

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

// ─── Poll ─────────────────────────────────────────────────────────────────────

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
  options: Array<{ id: string; text: string; count: number; percentage: number }>;
}

// ─── Offers & Coupons ─────────────────────────────────────────────────────────

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

// ─── Notification ─────────────────────────────────────────────────────────────

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

// ─── Analytics ────────────────────────────────────────────────────────────────

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

// ─── API Response Wrappers ────────────────────────────────────────────────────

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

// ─── WebSocket ────────────────────────────────────────────────────────────────

export interface WsMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
  sessionId: string;
}

export interface WsError {
  type: 'error';
  payload: { code: string; message: string; retryAfter?: number };
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export const PERMISSIONS = {
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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PLATFORM_ADMIN: 'platform_admin',
  SUPPORT: 'support',
  SALES: 'sales',
  ORG_ADMIN: 'org_admin',
  HOST: 'host',
  MODERATOR: 'moderator',
  REGISTERED_USER: 'registered_user',
  GUEST: 'guest',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
