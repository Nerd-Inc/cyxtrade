import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllTraders, approveTrader, rejectTrader, suspendTrader } from '../services/api';
import type { Trader } from '../types';

export function TraderListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;

  useEffect(() => {
    loadTraders();
  }, [status, page]);

  const loadTraders = async () => {
    try {
      setLoading(true);
      const data = await getAllTraders({
        status: status || undefined,
        limit,
        offset: (page - 1) * limit,
      });
      setTraders(data.traders);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this trader?')) return;
    try {
      setActionLoading(id);
      await approveTrader(id);
      loadTraders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return;
    try {
      setActionLoading(id);
      await rejectTrader(id, reason);
      loadTraders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (id: string) => {
    const reason = prompt('Suspension reason (optional):');
    if (reason === null) return;
    try {
      setActionLoading(id);
      await suspendTrader(id, reason);
      loadTraders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Traders</h1>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          background: '#fff',
          padding: '16px',
          borderRadius: '8px',
        }}
      >
        <select
          value={status}
          onChange={(e) => setFilter('status', e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            background: '#fff',
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

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
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
        ) : traders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No traders found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Name
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Phone
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Status
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Bond
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Rating
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Trades
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {traders.map((trader) => (
                <tr key={trader.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '500' }}>{trader.displayName || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {trader.corridors?.map((c) => `${c.from}→${c.to}`).join(', ') || 'No corridors'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#666' }}>{trader.phone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={trader.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div>${trader.bondAmount}</div>
                    {trader.bondLocked > 0 && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        (${trader.bondLocked} locked)
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {trader.rating > 0 ? `${trader.rating.toFixed(1)} ★` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{trader.totalTrades}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {trader.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(trader.id)}
                            disabled={actionLoading === trader.id}
                            style={{
                              padding: '6px 12px',
                              background: '#4ade80',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: actionLoading === trader.id ? 'not-allowed' : 'pointer',
                              opacity: actionLoading === trader.id ? 0.5 : 1,
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(trader.id)}
                            disabled={actionLoading === trader.id}
                            style={{
                              padding: '6px 12px',
                              background: '#f87171',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: actionLoading === trader.id ? 'not-allowed' : 'pointer',
                              opacity: actionLoading === trader.id ? 0.5 : 1,
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {trader.status === 'active' && (
                        <button
                          onClick={() => handleSuspend(trader.id)}
                          disabled={actionLoading === trader.id}
                          style={{
                            padding: '6px 12px',
                            background: '#fbbf24',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: actionLoading === trader.id ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === trader.id ? 0.5 : 1,
                          }}
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              borderTop: '1px solid #eee',
            }}
          >
            <span style={{ color: '#666' }}>
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFilter('page', String(page - 1))}
                disabled={page <= 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setFilter('page', String(page + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    active: { bg: '#d1fae5', color: '#065f46' },
    suspended: { bg: '#fee2e2', color: '#991b1b' },
    rejected: { bg: '#f3f4f6', color: '#374151' },
  };
  const style = styles[status] || { bg: '#f3f4f6', color: '#374151' };

  return (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
      }}
    >
      {status}
    </span>
  );
}
