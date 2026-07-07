'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { authApi, type AuthUser, type TokenPair } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (data: TokenPair) => void;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  refreshAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: (data: TokenPair) => {
        // Store access token in cookie for middleware
        document.cookie = `zonvo_access_token=${data.accessToken}; path=/; max-age=${data.expiresIn}; SameSite=Strict`;

        const user: AuthUser = {
          userId: data.user.id,
          email: data.user.email,
          orgId: null,
          roles: [],
          permissions: [],
          sessionId: '',
        };

        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          user,
        });
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Swallow — we still want to clear local state
        }

        // Clear cookie
        document.cookie = 'zonvo_access_token=; path=/; max-age=0';
        localStorage.removeItem('zonvo_active_org');

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });

        window.location.href = '/login';
      },

      setUser: (user: AuthUser) => set({ user }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      refreshAuth: async (): Promise<boolean> => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const data = await authApi.refresh(refreshToken);
          get().login(data);
          return true;
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          document.cookie = 'zonvo_access_token=; path=/; max-age=0';
          return false;
        }
      },
    }),
    {
      name: 'zonvo-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
