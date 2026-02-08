import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getDisputes } from '../services/api';
import type { Dispute } from '../types';

export function DisputeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;

  useEffect(() => {
    loadDisputes();
  }, [status, page]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const data = await getDisputes({
        status: status || undefined,
        limit,
        offset: (page - 1) * limit,
      });
      setDisputes(data.disputes);
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Disputes</h1>

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
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
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
        ) : disputes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No disputes found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  ID
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Trade
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Reason
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Status
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Created
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '500', color: '#666' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <code style={{ fontSize: '12px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                      {dispute.id.slice(0, 8)}
                    </code>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <code style={{ fontSize: '12px' }}>{dispute.tradeId.slice(0, 8)}</code>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {dispute.reason}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={dispute.status} />
                  </td>
                  <td style={{ padding: '12px 16px', color: '#666' }}>
                    {new Date(dispute.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      to={`/disputes/${dispute.id}`}
                      style={{
                        padding: '6px 12px',
                        background: '#4ade80',
                        color: '#fff',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '14px',
                      }}
                    >
                      View
                    </Link>
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
    open: { bg: '#fef3c7', color: '#92400e' },
    reviewing: { bg: '#dbeafe', color: '#1e40af' },
    resolved: { bg: '#d1fae5', color: '#065f46' },
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
