import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats, getDisputes, getPendingTraders } from '../services/api';
import type { AdminStats, Dispute, Trader } from '../types';

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [pendingTraders, setPendingTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, disputesData, tradersData] = await Promise.all([
        getAdminStats().catch(() => null),
        getDisputes({ status: 'open', limit: 5 }).catch(() => ({ disputes: [], total: 0 })),
        getPendingTraders({ limit: 5 }).catch(() => ({ traders: [], total: 0 })),
      ]);

      setStats(statsData);
      setDisputes(disputesData.disputes);
      setPendingTraders(tradersData.traders);
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

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <StatCard title="Total Users" value={stats?.totalUsers ?? '-'} />
        <StatCard title="Active Traders" value={stats?.activeTraders ?? '-'} color="#4ade80" />
        <StatCard title="Pending Traders" value={stats?.pendingTraders ?? '-'} color="#fbbf24" />
        <StatCard title="Open Disputes" value={stats?.openDisputes ?? '-'} color="#f87171" />
        <StatCard title="Total Trades" value={stats?.totalTrades ?? '-'} />
        <StatCard title="Completed Trades" value={stats?.completedTrades ?? '-'} color="#4ade80" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
            <h2 style={{ margin: 0, fontSize: '18px' }}>Open Disputes</h2>
            <Link to="/disputes" style={{ color: '#4ade80', textDecoration: 'none' }}>
              View all
            </Link>
          </div>

          {disputes.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No open disputes</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#666', fontWeight: '500' }}>Trade</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#666', fontWeight: '500' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#666', fontWeight: '500' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((dispute) => (
                  <tr key={dispute.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 0' }}>
                      <Link to={`/disputes/${dispute.id}`} style={{ color: '#333', textDecoration: 'none' }}>
                        {dispute.tradeId.slice(0, 8)}...
                      </Link>
                    </td>
                    <td style={{ padding: '12px 0' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: dispute.status === 'open' ? '#fef3c7' : '#e0e7ff',
                          color: dispute.status === 'open' ? '#92400e' : '#3730a3',
                        }}
                      >
                        {dispute.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 0', color: '#666' }}>
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <h2 style={{ margin: 0, fontSize: '18px' }}>Pending Traders</h2>
            <Link to="/traders?status=pending" style={{ color: '#4ade80', textDecoration: 'none' }}>
              View all
            </Link>
          </div>

          {pendingTraders.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No pending traders</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#666', fontWeight: '500' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#666', fontWeight: '500' }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#666', fontWeight: '500' }}>Applied</th>
                </tr>
              </thead>
              <tbody>
                {pendingTraders.map((trader) => (
                  <tr key={trader.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 0' }}>
                      <Link to={`/traders/${trader.id}`} style={{ color: '#333', textDecoration: 'none' }}>
                        {trader.displayName || 'Unknown'}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 0', color: '#666' }}>{trader.phone}</td>
                    <td style={{ padding: '12px 0', color: '#666' }}>
                      {new Date(trader.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number | string; color?: string }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: color || '#333' }}>{value}</div>
    </div>
  );
}
