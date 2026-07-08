// Admin API client — enterprise grade
const ADMIN_BASE = '/api/v1/admin';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('admin_token='))
      ?.split('=')[1] ?? null
  );
}

export function setAdminToken(token: string) {
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toUTCString();
  document.cookie = `admin_token=${token}; path=/; expires=${expires}; SameSite=Lax`;
}

export function clearAdminToken() {
  document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${ADMIN_BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;

  let json: unknown;
  try { json = await res.json(); } catch { json = {}; }

  if (!res.ok) {
    const msg =
      (json as any)?.error?.message ??
      (json as any)?.message ??
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (json && typeof json === 'object' && 'data' in (json as object))
    return (json as any).data as T;
  return json as T;
}

export const adminApi = {
  login: (email: string, password: string) =>
    req<{ token: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  stats: () => req<any>('/stats'),

  users: {
    list: (p?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      license?: string;
    }) => {
      const q = new URLSearchParams();
      if (p?.page) q.set('page', String(p.page));
      if (p?.limit) q.set('limit', String(p.limit));
      if (p?.search) q.set('search', p.search);
      if (p?.status) q.set('status', p.status);
      if (p?.license) q.set('license', p.license);
      return req<any>(`/users${q.toString() ? `?${q}` : ''}`);
    },
    get: (id: string) => req<any>(`/users/${id}`),
    create: (body: any) =>
      req<any>('/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      req<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    updateStatus: (id: string, status: string) =>
      req<any>(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) => req<any>(`/users/${id}`, { method: 'DELETE' }),
    bulkStatus: (ids: string[], status: string) =>
      req<any>('/users/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ ids, status }),
      }),
  },

  invitations: {
    list: (p?: { page?: number; limit?: number; status?: string }) => {
      const q = new URLSearchParams();
      if (p?.page) q.set('page', String(p.page));
      if (p?.limit) q.set('limit', String(p.limit));
      if (p?.status) q.set('status', p.status);
      return req<any>(`/invitations${q.toString() ? `?${q}` : ''}`);
    },
    create: (body: any) =>
      req<any>('/invitations', { method: 'POST', body: JSON.stringify(body) }),
    resend: (id: string) =>
      req<any>(`/invitations/${id}/resend`, { method: 'POST' }),
    cancel: (id: string) =>
      req<any>(`/invitations/${id}`, { method: 'DELETE' }),
  },

  licenses: {
    list: () => req<any>('/licenses'),
    assignments: (p?: { page?: number; limit?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (p?.page) q.set('page', String(p.page));
      if (p?.limit) q.set('limit', String(p.limit));
      if (p?.search) q.set('search', p.search);
      return req<any>(`/licenses/assignments${q.toString() ? `?${q}` : ''}`);
    },
    assign: (userId: string, licenseId: string, expiresAt?: string) =>
      req<any>('/licenses/assign', {
        method: 'POST',
        body: JSON.stringify({ userId, licenseId, expiresAt }),
      }),
    remove: (userId: string) =>
      req<any>('/licenses/remove', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    transfer: (fromUserId: string, toUserId: string) =>
      req<any>('/licenses/transfer', {
        method: 'POST',
        body: JSON.stringify({ fromUserId, toUserId }),
      }),
    history: (p?: { page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (p?.page) q.set('page', String(p.page));
      if (p?.limit) q.set('limit', String(p.limit));
      return req<any>(`/licenses/history${q.toString() ? `?${q}` : ''}`);
    },
  },

  roles: {
    list: () => req<any>('/roles'),
    permissions: () => req<any>('/permissions'),
    updatePermissions: (roleId: string, permissionIds: string[]) =>
      req<any>(`/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissionIds }),
      }),
  },

  logs: {
    activity: (p?: { page?: number; limit?: number; action?: string }) => {
      const q = new URLSearchParams();
      if (p?.page) q.set('page', String(p.page));
      if (p?.limit) q.set('limit', String(p.limit));
      if (p?.action) q.set('action', p.action);
      return req<any>(`/activity${q.toString() ? `?${q}` : ''}`);
    },
    email: (p?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }) => {
      const q = new URLSearchParams();
      if (p?.page) q.set('page', String(p.page));
      if (p?.limit) q.set('limit', String(p.limit));
      if (p?.search) q.set('search', p.search);
      if (p?.status) q.set('status', p.status);
      return req<any>(`/email-logs${q.toString() ? `?${q}` : ''}`);
    },
  },

  webinars: {
    list: (p?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }) => {
      const q = new URLSearchParams();
      if (p?.page) q.set('page', String(p.page));
      if (p?.limit) q.set('limit', String(p.limit));
      if (p?.search) q.set('search', p.search);
      if (p?.status) q.set('status', p.status);
      return req<any>(`/webinars${q.toString() ? `?${q}` : ''}`);
    },
    get: (id: string) => req<any>(`/webinars/${id}`),
    delete: (id: string) =>
      req<any>(`/webinars/${id}`, { method: 'DELETE' }),
  },
};
