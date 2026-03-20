import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  getAllTraders,
  approveTrader,
  rejectTrader,
  suspendTrader,
  activateTrader,
  bulkTraderAction,
} from '../services/api';
import { BulkActionBar } from '../components/BulkActionBar';
import type { Trader, BulkActionResult } from '../types';

export function TraderListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkActionResult | null>(null);

  const status = searchParams.get('status') || '';
  const tier = searchParams.get('tier') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;

  useEffect(() => {
    loadTraders();
    setSelectedIds(new Set()); // Clear selection on filter change
  }, [status, tier, search, page]);

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

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === traders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(traders.map((t) => t.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Individual actions
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

  const handleActivate = async (id: string) => {
    if (!confirm('Reactivate this trader?')) return;
    try {
      setActionLoading(id);
      await activateTrader(id);
      loadTraders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk actions
  const handleBulkApprove = async (reason?: string) => {
    try {
      const result = await bulkTraderAction('approve', Array.from(selectedIds), reason);
      setBulkResult(result);
      clearSelection();
      loadTraders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkReject = async (reason?: string) => {
    try {
      const result = await bulkTraderAction('reject', Array.from(selectedIds), reason);
      setBulkResult(result);
      clearSelection();
      loadTraders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkSuspend = async (reason?: string) => {
    try {
      const result = await bulkTraderAction('suspend', Array.from(selectedIds), reason);
      setBulkResult(result);
      clearSelection();
      loadTraders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const allSelected = traders.length > 0 && selectedIds.size === traders.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < traders.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Traders</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>{total} total</span>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          background: '#fff',
          padding: '16px',
          borderRadius: '8px',
          flexWrap: 'wrap',
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

        <select
          value={tier}
          onChange={(e) => setFilter('tier', e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            background: '#fff',
          }}
        >
          <option value="">All Tiers</option>
          <option value="observer">Observer</option>
          <option value="starter">Starter</option>
          <option value="verified">Verified</option>
          <option value="trusted">Trusted</option>
          <option value="anchor">Anchor</option>
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder="Search by name or phone..."
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '200px',
          }}
        />

        {(status || tier || search) && (
          <button
            onClick={() => {
              setSearchParams(new URLSearchParams());
            }}
            style={{
              padding: '8px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00',
            marginBottom: '24px',
            cursor: 'pointer',
          }}
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {/* Bulk result notification */}
      {bulkResult && (
        <div
          style={{
            padding: '12px',
            background: bulkResult.failed > 0 ? '#fef3c7' : '#d1fae5',
            border: `1px solid ${bulkResult.failed > 0 ? '#fcd34d' : '#6ee7b7'}`,
            borderRadius: '4px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            Bulk {bulkResult.action}: {bulkResult.processed} processed, {bulkResult.failed} failed
          </span>
          <button
            onClick={() => setBulkResult(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ×
          </button>
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
                <th style={{ width: '40px', padding: '12px 16px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
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
                  Tier
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
                <tr
                  key={trader.id}
                  style={{
                    borderTop: '1px solid #eee',
                    background: selectedIds.has(trader.id) ? '#f0f9ff' : 'transparent',
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(trader.id)}
                      onChange={() => toggleSelect(trader.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      to={`/traders/${trader.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ fontWeight: '500' }}>{trader.displayName || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {trader.corridors?.map((c) => `${c.from}→${c.to}`).join(', ') || 'No corridors'}
                      </div>
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#666' }}>{trader.phone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={trader.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <TierBadge tier={(trader as any).tier || 'observer'} />
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
                          <ActionButton
                            onClick={() => handleApprove(trader.id)}
                            disabled={actionLoading === trader.id}
                            color="#10b981"
                          >
                            Approve
                          </ActionButton>
                          <ActionButton
                            onClick={() => handleReject(trader.id)}
                            disabled={actionLoading === trader.id}
                            color="#ef4444"
                          >
                            Reject
                          </ActionButton>
                        </>
                      )}
                      {trader.status === 'active' && (
                        <ActionButton
                          onClick={() => handleSuspend(trader.id)}
                          disabled={actionLoading === trader.id}
                          color="#f59e0b"
                          textColor="#000"
                        >
                          Suspend
                        </ActionButton>
                      )}
                      {trader.status === 'suspended' && (
                        <ActionButton
                          onClick={() => handleActivate(trader.id)}
                          disabled={actionLoading === trader.id}
                          color="#3b82f6"
                        >
                          Activate
                        </ActionButton>
                      )}
                      <Link
                        to={`/traders/${trader.id}`}
                        style={{
                          padding: '6px 12px',
                          background: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontSize: '14px',
                        }}
                      >
                        View
                      </Link>
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

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
        onSuspend={handleBulkSuspend}
        onClearSelection={clearSelection}
      />
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

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, { bg: string; color: string; border?: string }> = {
    observer: { bg: '#f3f4f6', color: '#6b7280' },
    starter: { bg: '#e0f2fe', color: '#0369a1' },
    verified: { bg: '#dbeafe', color: '#1d4ed8' },
    trusted: { bg: '#fef3c7', color: '#92400e' },
    anchor: { bg: '#fce7f3', color: '#be185d', border: '1px solid #f9a8d4' },
  };
  const style = styles[tier] || styles.observer;

  return (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
        border: style.border,
      }}
    >
      {tier}
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  color,
  textColor = '#fff',
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  color: string;
  textColor?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        background: color,
        color: textColor,
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: '14px',
      }}
    >
      {children}
    </button>
  );
}
