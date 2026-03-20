import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminStats,
  getDisputes,
  getPendingTraders,
  getDashboardKPIs,
  getDashboardActivity,
} from '../services/api';
import type { AdminStats, Dispute, Trader, DashboardKPIs, AuditLogEntry } from '../types';

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [pendingTraders, setPendingTraders] = useState<Trader[]>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, kpisData, disputesData, tradersData, activityData] = await Promise.all([
        getAdminStats().catch(() => null),
        getDashboardKPIs().catch(() => null),
        getDisputes({ status: 'open', limit: 5 }).catch(() => ({ disputes: [], total: 0 })),
        getPendingTraders({ limit: 5 }).catch(() => ({ traders: [], total: 0 })),
        getDashboardActivity(10).catch(() => []),
      ]);

      setStats(statsData);
      setKpis(kpisData);
      setDisputes(disputesData.disputes);
      setPendingTraders(tradersData.traders);
      setActivity(activityData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Dashboard</h1>

      {error && (
        <div
          style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <KPICard
          title="Pending Traders"
          value={kpis?.pendingTraders ?? stats?.pendingTraders ?? '-'}
          color="#f59e0b"
          link="/traders?status=pending"
        />
        <KPICard
          title="Active Alerts"
          value={kpis?.activeAlerts ?? '-'}
          color="#ef4444"
        />
        <KPICard
          title="Volume Today"
          value={kpis?.volumeToday ? `$${formatNumber(kpis.volumeToday)}` : '-'}
          color="#10b981"
        />
        <KPICard
          title="Trades Today"
          value={kpis?.tradesToday ?? '-'}
          color="#3b82f6"
        />
        <KPICard
          title="Open Disputes"
          value={stats?.openDisputes ?? '-'}
          color="#f87171"
          link="/disputes?status=open"
        />
        <KPICard
          title="Dispute Rate"
          value={kpis?.disputeRate !== undefined ? `${kpis.disputeRate}%` : '-'}
          color={kpis && kpis.disputeRate > 5 ? '#ef4444' : '#10b981'}
          subtitle="Last 7 days"
        />
      </div>

      {/* Tier Distribution */}
      {kpis?.tierDistribution && Object.keys(kpis.tierDistribution).length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>Trader Tier Distribution</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.entries(kpis.tierDistribution).map(([tier, count]) => (
              <div
                key={tier}
                style={{
                  padding: '12px 20px',
                  background: getTierBgColor(tier),
                  borderRadius: '8px',
                  minWidth: '100px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: '600', color: getTierColor(tier) }}>
                  {count}
                </div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
                  {tier}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
        {/* Open Disputes */}
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>Open Disputes</h2>
            <Link to="/disputes" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
              View all
            </Link>
          </div>

          {disputes.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No open disputes</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {disputes.map((dispute) => (
                <Link
                  key={dispute.id}
                  to={`/disputes/${dispute.id}`}
                  style={{
                    display: 'block',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>Trade {dispute.tradeId.slice(0, 8)}...</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Traders */}
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>Pending Traders</h2>
            <Link to="/traders?status=pending" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
              View all
            </Link>
          </div>

          {pendingTraders.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No pending traders</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingTraders.map((trader) => (
                <Link
                  key={trader.id}
                  to={`/traders/${trader.id}`}
                  style={{
                    display: 'block',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{trader.displayName || 'Unknown'}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {trader.phone} · Applied {new Date(trader.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>Recent Activity</h2>
            <Link to="/audit" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
              View all
            </Link>
          </div>

          {activity.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activity.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '10px 12px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${getActionColor(entry.action)}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>
                      {formatAction(entry.action)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      {formatTimeAgo(entry.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    by {entry.adminName || 'System'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  color,
  link,
  subtitle,
}: {
  title: string;
  value: number | string;
  color?: string;
  link?: string;
  subtitle?: string;
}) {
  const content = (
    <div
      style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderTop: `3px solid ${color || '#e5e7eb'}`,
      }}
    >
      <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: color || '#333' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );

  if (link) {
    return (
      <Link to={link} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }

  return content;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    approve: 'Trader Approved',
    reject: 'Trader Rejected',
    suspend: 'Trader Suspended',
    activate: 'Trader Activated',
    tier_change: 'Tier Changed',
    restriction_add: 'Restriction Added',
    restriction_remove: 'Restriction Removed',
    dispute_resolve: 'Dispute Resolved',
    role_assign: 'Role Assigned',
    bulk_approve: 'Bulk Approve',
    bulk_reject: 'Bulk Reject',
    bulk_suspend: 'Bulk Suspend',
  };
  return labels[action] || action;
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    approve: '#10b981',
    reject: '#ef4444',
    suspend: '#f59e0b',
    activate: '#3b82f6',
    tier_change: '#8b5cf6',
    restriction_add: '#ef4444',
    restriction_remove: '#10b981',
    dispute_resolve: '#0ea5e9',
    bulk_approve: '#10b981',
    bulk_reject: '#ef4444',
    bulk_suspend: '#f59e0b',
  };
  return colors[action] || '#6b7280';
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    observer: '#6b7280',
    starter: '#0369a1',
    verified: '#1d4ed8',
    trusted: '#92400e',
    anchor: '#be185d',
  };
  return colors[tier] || '#6b7280';
}

function getTierBgColor(tier: string): string {
  const colors: Record<string, string> = {
    observer: '#f3f4f6',
    starter: '#e0f2fe',
    verified: '#dbeafe',
    trusted: '#fef3c7',
    anchor: '#fce7f3',
  };
  return colors[tier] || '#f3f4f6';
}
