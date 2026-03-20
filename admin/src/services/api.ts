import axios, { AxiosError } from 'axios';
import type {
  ApiResponse,
  AdminStats,
  Dispute,
  Trader,
  BulkActionResult,
  TierHistoryEntry,
  Restriction,
  AuditLogEntry,
  DashboardKPIs,
  AdminRole,
  AdminUser,
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

export async function activateTrader(id: string, reason?: string): Promise<Trader> {
  const response = await api.put<any, ApiResponse<Trader>>(`/admin/traders/${id}/activate`, { reason });
  return response.data!;
}

// ============ Bulk Actions ============

export async function bulkTraderAction(
  action: 'approve' | 'reject' | 'suspend',
  traderIds: string[],
  reason?: string
): Promise<BulkActionResult> {
  const response = await api.post<any, ApiResponse<BulkActionResult>>('/admin/traders/bulk', {
    action,
    traderIds,
    reason,
  });
  return response.data!;
}

// ============ Tier Management ============

export async function changeTraderTier(id: string, tier: string, reason: string): Promise<void> {
  await api.put(`/admin/traders/${id}/tier`, { tier, reason });
}

export async function getTraderTierHistory(id: string): Promise<TierHistoryEntry[]> {
  const response = await api.get<any, ApiResponse<{ history: TierHistoryEntry[] }>>(
    `/admin/traders/${id}/tier-history`
  );
  return response.data!.history;
}

// ============ Restrictions ============

export async function getTraderRestrictions(
  id: string,
  includeInactive = false
): Promise<Restriction[]> {
  const response = await api.get<any, ApiResponse<{ restrictions: Restriction[] }>>(
    `/admin/traders/${id}/restrictions`,
    { params: { includeInactive } }
  );
  return response.data!.restrictions;
}

export async function addTraderRestriction(
  traderId: string,
  data: {
    restrictionType: string;
    value?: unknown;
    reason: string;
    expiresAt?: string;
  }
): Promise<{ id: string }> {
  const response = await api.post<any, ApiResponse<{ id: string }>>(
    `/admin/traders/${traderId}/restrictions`,
    data
  );
  return response.data!;
}

export async function removeTraderRestriction(traderId: string, restrictionId: string): Promise<void> {
  await api.delete(`/admin/traders/${traderId}/restrictions/${restrictionId}`);
}

// ============ Audit Log ============

export async function getAuditLog(params?: {
  adminId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const response = await api.get<any, ApiResponse<{ entries: AuditLogEntry[]; total: number }>>(
    '/admin/audit',
    { params }
  );
  return response.data!;
}

export async function getEntityAuditHistory(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  const response = await api.get<any, ApiResponse<{ history: AuditLogEntry[] }>>(
    `/admin/audit/entity/${entityType}/${entityId}`,
    { params: { limit } }
  );
  return response.data!.history;
}

export async function getAuditActionCounts(params?: {
  adminId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Record<string, number>> {
  const response = await api.get<any, ApiResponse<{ counts: Record<string, number> }>>(
    '/admin/audit/counts',
    { params }
  );
  return response.data!.counts;
}

// ============ Dashboard ============

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const response = await api.get<any, ApiResponse<DashboardKPIs>>('/admin/dashboard/kpis');
  return response.data!;
}

export async function getDashboardActivity(limit = 20): Promise<AuditLogEntry[]> {
  const response = await api.get<any, ApiResponse<{ activity: AuditLogEntry[] }>>(
    '/admin/dashboard/activity',
    { params: { limit } }
  );
  return response.data!.activity;
}

// ============ Roles ============

export async function getRoles(): Promise<AdminRole[]> {
  const response = await api.get<any, ApiResponse<{ roles: AdminRole[] }>>('/admin/roles');
  return response.data!.roles;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await api.get<any, ApiResponse<{ admins: AdminUser[] }>>('/admin/admins');
  return response.data!.admins;
}

export async function assignUserRole(userId: string, roleId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/role`, { roleId });
}

export async function removeUserRole(userId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}/role`);
}

export default api;
