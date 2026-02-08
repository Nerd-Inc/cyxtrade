import axios, { AxiosError } from 'axios';
import type {
  ApiResponse,
  AdminStats,
  Dispute,
  Trader,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const message = error.response?.data?.error?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

// ============ Auth ============

export async function requestOtp(phone: string): Promise<void> {
  await api.post('/auth/otp', { phone });
}

export async function verifyOtp(phone: string, otp: string): Promise<{ token: string; user: any }> {
  const response = await api.post<any, ApiResponse<{ token: string; user: any }>>('/auth/verify', { phone, otp });
  return response.data!;
}

export async function getMe(): Promise<any> {
  const response = await api.get<any, ApiResponse<any>>('/users/me');
  return response.data;
}

// ============ Admin Stats ============

export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<any, ApiResponse<AdminStats>>('/admin/stats');
  return response.data!;
}

// ============ Disputes ============

export async function getDisputes(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ disputes: Dispute[]; total: number }> {
  const response = await api.get<any, ApiResponse<{ disputes: Dispute[]; total: number }>>(
    '/admin/disputes',
    { params }
  );
  return response.data!;
}

export async function getDispute(id: string): Promise<Dispute> {
  const response = await api.get<any, ApiResponse<Dispute>>(`/admin/disputes/${id}`);
  return response.data!;
}

export async function resolveDispute(
  id: string,
  data: {
    resolution: 'favor_user' | 'favor_trader' | 'split';
    notes?: string;
  }
): Promise<Dispute> {
  const response = await api.put<any, ApiResponse<Dispute>>(`/admin/disputes/${id}/resolve`, data);
  return response.data!;
}

// ============ Traders ============

export async function getPendingTraders(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ traders: Trader[]; total: number }> {
  const response = await api.get<any, ApiResponse<{ traders: Trader[]; total: number }>>(
    '/admin/traders/pending',
    { params }
  );
  return response.data!;
}

export async function getAllTraders(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ traders: Trader[]; total: number }> {
  const response = await api.get<any, ApiResponse<{ traders: Trader[]; total: number }>>(
    '/admin/traders',
    { params }
  );
  return response.data!;
}

export async function getTrader(id: string): Promise<Trader> {
  const response = await api.get<any, ApiResponse<Trader>>(`/admin/traders/${id}`);
  return response.data!;
}

export async function approveTrader(id: string): Promise<Trader> {
  const response = await api.put<any, ApiResponse<Trader>>(`/admin/traders/${id}/approve`);
  return response.data!;
}

export async function rejectTrader(id: string, reason?: string): Promise<Trader> {
  const response = await api.put<any, ApiResponse<Trader>>(`/admin/traders/${id}/reject`, { reason });
  return response.data!;
}

export async function suspendTrader(id: string, reason?: string): Promise<Trader> {
  const response = await api.put<any, ApiResponse<Trader>>(`/admin/traders/${id}/suspend`, { reason });
  return response.data!;
}

export default api;
