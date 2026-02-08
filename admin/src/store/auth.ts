import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMe, requestOtp, verifyOtp } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  sendOtp: (phone: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      sendOtp: async (phone: string) => {
        set({ isLoading: true, error: null });
        try {
          await requestOtp(phone);
          set({ isLoading: false });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      login: async (phone: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const { token, user } = await verifyOtp(phone, otp);

          // Check if user is admin
          if (!user.isAdmin) {
            throw new Error('Access denied. Admin privileges required.');
          }

          localStorage.setItem('admin_token', token);
          set({ token, user, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('admin_token');
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          set({ user: null, token: null });
          return false;
        }

        try {
          const user = await getMe();
          if (!user.isAdmin) {
            localStorage.removeItem('admin_token');
            set({ user: null, token: null });
            return false;
          }
          set({ user, token });
          return true;
        } catch {
          localStorage.removeItem('admin_token');
          set({ user: null, token: null });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
