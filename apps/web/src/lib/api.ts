// Empty string = relative URL → Next.js rewrite proxies /api/v1/* → backend:3000
// For SSR, Next.js rewrites also apply server-side in dev mode
const API_BASE = '';


export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
  };
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? document.cookie
          .split(';')
          .find((c) => c.trim().startsWith('zonvo_access_token='))
          ?.split('=')[1]
      : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const orgId =
    typeof window !== 'undefined' ? localStorage.getItem('zonvo_active_org') : null;

  if (orgId) {
    headers['X-Organization-ID'] = orgId;
  }

  const url = `${API_BASE}/api/v1${path}`;
  console.debug('[API] Request:', init.method ?? 'GET', url);

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });

  console.debug('[API] Response:', res.status, url);

  // 204 No Content — no body to parse (e.g. DELETE)
  if (res.status === 204) {
    return undefined as T;
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch (parseErr) {
    console.error('[API] JSON parse error:', parseErr, 'Status:', res.status);
    throw new Error(`Server returned ${res.status} with non-JSON body`);
  }

  if (!res.ok || !json.success) {
    const err = json.error;
    console.error('[API] API error:', res.status, err?.code, '—', err?.message);
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? `Request failed with status ${res.status}`,
      err?.details,
    );
  }

  return json.data;
}


// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  timezone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
}

export interface AuthUser {
  userId: string;
  email: string;
  orgId: string | null;
  roles: string[];
  permissions: string[];
  sessionId: string;
  managedByEmail?: string | null;
}

export const authApi = {
  getInvitationInfo: (token: string) =>
    request<{ email: string; firstName: string; invitedByEmail: string; userExists: boolean }>(`/auth/invitation-info?token=${token}`),

  acceptInvite: (token: string, password?: string) =>
    request<TokenPair>('/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  register: (payload: RegisterPayload) =>
    request<{ userId: string; email: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<TokenPair>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  refresh: (refreshToken: string) =>
    request<TokenPair>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  me: () => request<AuthUser>('/auth/me'),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string, confirmPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword }),
    }),

  verifyEmail: (token: string) =>
    request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    }),

  getDeviceSessions: () => request<unknown[]>('/auth/devices'),

  revokeDeviceSession: (id: string) =>
    request<void>(`/auth/devices/${id}`, { method: 'DELETE' }),
};

// ─── Webinars ─────────────────────────────────────────────────────────────────

export type WebinarStatus = 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';
export type WebinarMode = 'semi_live' | 'fully_live';

export interface Webinar {
  id: string;
  organizationId: string | null;
  hostUserId: string;
  title: string;
  description: string | null;
  joinCode: string | null;
  password: string | null;
  hasPassword?: boolean;
  status: WebinarStatus;
  mode: WebinarMode;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number;
  maxAttendees: number;
  registeredCount: number;
  attendeeCount: number;
  thumbnailUrl: string | null;
  replayUrl: string | null;
  videoUrl: string | null;
  timedEvents: Array<{ timeSeconds: number; type: string; data: Record<string, unknown> }>;
  livekitRoom: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WebinarListResult {
  items: Webinar[];
  total: number;
  page: number;
  limit: number;
}

export interface WebinarStats {
  total: number;
  live: number;
  scheduled: number;
  draft: number;
}

export interface CreateWebinarPayload {
  title: string;
  description?: string;
  mode?: WebinarMode;
  scheduledAt?: string;
  durationMinutes?: number;
  maxAttendees?: number;
  password?: string;
  videoUrl?: string;
  timedEvents?: Array<{ timeSeconds: number; type: string; data: Record<string, unknown> }>;
  replayUrl?: string;
}


export interface PublicWebinar {
  id: string;
  title: string;
  description: string | null;
  status: WebinarStatus;
  mode: WebinarMode;
  scheduledAt: string | null;
  durationMinutes: number;
  maxAttendees: number;
  registeredCount: number;
  hasPassword: boolean;
  joinCode: string | null;
  thumbnailUrl: string | null;
  settings: {
    waitingRoom: boolean;
    requireRegistration: boolean;
    requireLogin: boolean;
    privateWebinar: boolean;
    enableWatermark: boolean;
    showLiveCount: boolean;
    enableChat: boolean;
    enablePolls: boolean;
    waitingThumbnailUrl: string | null;
  };
}

export const webinarApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<WebinarListResult>(`/webinars${qs ? `?${qs}` : ''}`);
  },

  stats: () => request<WebinarStats>('/webinars/stats'),

  get: (id: string) => request<Webinar>(`/webinars/${id}`),

  /** Public — no auth needed */
  getByCode: (code: string) => request<PublicWebinar>(`/webinars/join/${code}`),

  create: (payload: CreateWebinarPayload) =>
    request<Webinar>('/webinars', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<CreateWebinarPayload> & { status?: WebinarStatus }) =>
    request<Webinar>(`/webinars/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  goLive: (id: string) =>
    request<Webinar>(`/webinars/${id}/go-live`, { method: 'POST', body: '{}' }),

  endLive: (id: string) =>
    request<Webinar>(`/webinars/${id}/end`, { method: 'POST', body: '{}' }),

  delete: (id: string) =>
    request<void>(`/webinars/${id}`, { method: 'DELETE' }),

  /** Get LiveKit token for host */
  getHostToken: (id: string, displayName: string) =>
    request<{ token: string; livekitUrl: string }>(`/webinars/${id}/host-token`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),

  /** Join webinar — mode-aware.
   *  fully_live → LiveKit token
   *  semi_live  → synchronized video data
   */
  getAttendeeToken: (
    code: string,
    displayName: string,
    password?: string,
  ) =>
    request<
      | { mode: 'fully_live'; token: string; roomName: string; webinarTitle: string; livekitUrl: string; settings: Record<string, unknown> }
      | { mode: 'semi_live'; videoUrl: string; currentPositionSeconds: number; timedEvents: unknown[]; webinarTitle: string; webinarId: string; settings: Record<string, unknown> }
    >(`/webinars/join/${code}/token`, {
      method: 'POST',
      body: JSON.stringify({ displayName, password }),
    }),

  /** Waiting Room: attendee requests to join waiting room */
  joinWaitingRoom: (code: string, name: string, email?: string) =>
    request<{ admitted: boolean; waitingId?: string; message?: string }>(
      `/webinars/join/${code}/waiting-room`,
      { method: 'POST', body: JSON.stringify({ name, email }) },
    ),

  /** Waiting Room: attendee polls their status */
  checkWaitingStatus: (code: string, waitingId: string) =>
    request<{ status: 'pending' | 'admitted' | 'rejected' }>(
      `/webinars/join/${code}/waiting-room/${waitingId}`,
    ),

  /** Host: get pending waiting room list */
  getWaitingRoom: (id: string) =>
    request<{ pending: { id: string; name: string; email: string; requestedAt: string }[] }>(
      `/webinars/${id}/waiting-room`,
    ),

  /** Host: admit from waiting room */
  admitFromWaitingRoom: (id: string, waitingId: string) =>
    request<void>(`/webinars/${id}/waiting-room/${waitingId}/admit`, { method: 'POST', body: '{}' }),

  /** Host: reject from waiting room */
  rejectFromWaitingRoom: (id: string, waitingId: string) =>
    request<void>(`/webinars/${id}/waiting-room/${waitingId}/reject`, { method: 'POST', body: '{}' }),

  /** Presigned R2 upload URL for semi-live video */
  getVideoUploadUrl: (id: string, filename: string, contentType: string) =>
    request<{ uploadUrl: string; fileKey: string; publicUrl: string }>(
      `/webinars/${id}/video-upload-url`,
      { method: 'POST', body: JSON.stringify({ filename, contentType }) },
    ),

  /** Presigned R2 upload URL for webinar recording */
  getRecordingUploadUrl: (id: string, filename: string, contentType: string) =>
    request<{ uploadUrl: string; fileKey: string; publicUrl: string }>(
      `/webinars/${id}/recording-upload-url`,
      { method: 'POST', body: JSON.stringify({ filename, contentType }) },
    ),

  /** Presigned R2 upload URL for images (thumbnails) */
  getImageUploadUrl: (id: string, filename: string, contentType: string) =>
    request<{ uploadUrl: string; fileKey: string; publicUrl: string }>(
      `/webinars/${id}/image-upload-url`,
      { method: 'POST', body: JSON.stringify({ filename, contentType }) },
    ),


  /** Host broadcasts an event to all SSE-connected attendees */
  broadcast: (id: string, type: string, data: Record<string, unknown>) =>
    request<{ sent: number }>(`/webinars/${id}/broadcast`, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
    }),

  /** Live viewer list (host only) */
  getViewers: (id: string) =>
    request<{ viewers: { id: string; displayName: string; joinedAt: number }[]; count: number }>(
      `/webinars/${id}/viewers`,
    ),

  /** Pre-register attendee for a webinar (name + email) */
  registerAttendee: (code: string, name: string, email: string) =>
    request<{ registeredCount: number }>(`/webinars/join/${code}/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    }),

  /** Attendee sends chat message via REST → broadcasts via SSE */
  sendChat: (code: string, displayName: string, message: string) =>
    request<{ sent: number }>(`/webinars/join/${code}/chat`, {
      method: 'POST',
      body: JSON.stringify({ displayName, message }),
    }),

  /**
   * Open an SSE stream to receive real-time events from the host.
   * Returns an EventSource — call .close() on cleanup.
   * Bypasses the Next.js proxy directly to backend (SSE needs streaming).
   */
  openEventStream: (code: string, displayName: string): EventSource => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
    const url = new URL(`${backendUrl}/api/webinars/join/${code}/events`);
    url.searchParams.set('name', displayName);
    return new EventSource(url.toString());
  },
};

export { request };
