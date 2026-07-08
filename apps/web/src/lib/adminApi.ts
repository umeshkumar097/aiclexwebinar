// Admin API client — uses admin_token cookie, separate from regular auth
const ADMIN_BASE = '/api/v1/admin';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return document.cookie
    .split(';')
    .find((c) => c.trim().startsWith('admin_token='))
    ?.split('=')[1] ?? null;
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

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${ADMIN_BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // Handle both wrapped and unwrapped responses
  if (json && typeof json === 'object' && 'data' in json) return json.data as T;
  return json as T;
}

export const adminApi = {
  login: (email: string, password: string) =>
    adminRequest<{ token: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  stats: () => adminRequest<any>('/stats'),

  users: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      return adminRequest<any>(`/users${q.toString() ? `?${q}` : ''}`);
    },
    get: (id: string) => adminRequest<any>(`/users/${id}`),
    updateStatus: (id: string, status: string) =>
      adminRequest<any>(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      adminRequest<any>(`/users/${id}`, { method: 'DELETE' }),
  },

  webinars: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      return adminRequest<any>(`/webinars${q.toString() ? `?${q}` : ''}`);
    },
    get: (id: string) => adminRequest<any>(`/webinars/${id}`),
    delete: (id: string) =>
      adminRequest<any>(`/webinars/${id}`, { method: 'DELETE' }),
  },

  activity: () => adminRequest<any>('/activity'),
};
