import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getAuditLog, getAuditActionCounts } from '../services/api';
import type { AuditLogEntry } from '../types';

export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});

  // Filters
  const action = searchParams.get('action') || '';
  const entityType = searchParams.get('entityType') || '';
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 50;

  useEffect(() => {
    loadEntries();
  }, [action, entityType, search, startDate, endDate, page]);

  useEffect(() => {
    loadActionCounts();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await getAuditLog({
        action: action || undefined,
        entityType: entityType || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
        offset: (page - 1) * limit,
      });
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActionCounts = async () => {
    try {
      const counts = await getAuditActionCounts();
      setActionCounts(counts);
    } catch (err: any) {
      // Ignore counts error
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

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const totalPages = Math.ceil(total / limit);
  const hasFilters = action || entityType || search || startDate || endDate;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Audit Log</h1>
        <span style={{ color: '#666', fontSize: '14px' }}>{total} entries</span>
      </div>

      {/* Action Stats */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {Object.entries(actionCounts).map(([actionName, count]) => (
          <div
            key={actionName}
            onClick={() => setFilter('action', action === actionName ? '' : actionName)}
            style={{
              padding: '12px 20px',
              background: action === actionName ? '#3b82f6' : '#fff',
              color: action === actionName ? '#fff' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              minWidth: 'fit-content',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{count}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{formatAction(actionName)}</div>
          </div>
        ))}
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
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Action
          </label>
          <select
            value={action}
            onChange={(e) => setFilter('action', e.target.value)}
            style={selectStyle}
          >
            <option value="">All Actions</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
            <option value="suspend">Suspend</option>
            <option value="activate">Activate</option>
            <option value="tier_change">Tier Change</option>
            <option value="restriction_add">Add Restriction</option>
            <option value="restriction_remove">Remove Restriction</option>
            <option value="dispute_resolve">Resolve Dispute</option>
            <option value="role_assign">Assign Role</option>
            <option value="bulk_approve">Bulk Approve</option>
            <option value="bulk_reject">Bulk Reject</option>
            <option value="bulk_suspend">Bulk Suspend</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Entity Type
          </label>
          <select
            value={entityType}
            onChange={(e) => setFilter('entityType', e.target.value)}
            style={selectStyle}
          >
            <option value="">All Types</option>
            <option value="trader">Trader</option>
            <option value="dispute">Dispute</option>
            <option value="user">User</option>
            <option value="role">Role</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setFilter('startDate', e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setFilter('endDate', e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search admin, reason..."
            style={{ ...inputStyle, width: '200px' }}
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear
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

      {/* Entries */}
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
        ) : entries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No audit entries found</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Timestamp</th>
                  <th style={thStyle}>Admin</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Reason</th>
                  <th style={thStyle}>IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={tdStyle}>
                      <div>{new Date(entry.createdAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '500' }}>{entry.adminName || 'System'}</div>
                      {entry.adminEmail && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{entry.adminEmail}</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <ActionBadge action={entry.action} />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            background: '#f3f4f6',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          {entry.entityType}
                        </span>
                        {entry.entityId && (
                          <Link
                            to={getEntityLink(entry.entityType, entry.entityId)}
                            style={{ fontSize: '12px', color: '#3b82f6' }}
                          >
                            {entry.entityId.substring(0, 8)}...
                          </Link>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={entry.reason || ''}
                      >
                        {entry.reason || '-'}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: '#666', fontSize: '12px' }}>
                      {entry.ipAddress || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
          </>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    approve: { bg: '#d1fae5', color: '#065f46' },
    reject: { bg: '#fee2e2', color: '#991b1b' },
    suspend: { bg: '#fef3c7', color: '#92400e' },
    activate: { bg: '#dbeafe', color: '#1d4ed8' },
    tier_change: { bg: '#ede9fe', color: '#6d28d9' },
    restriction_add: { bg: '#fee2e2', color: '#991b1b' },
    restriction_remove: { bg: '#d1fae5', color: '#065f46' },
    dispute_resolve: { bg: '#e0f2fe', color: '#0369a1' },
    role_assign: { bg: '#fce7f3', color: '#be185d' },
    bulk_approve: { bg: '#d1fae5', color: '#065f46' },
    bulk_reject: { bg: '#fee2e2', color: '#991b1b' },
    bulk_suspend: { bg: '#fef3c7', color: '#92400e' },
  };

  const style = styles[action] || { bg: '#f3f4f6', color: '#374151' };

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {formatAction(action)}
    </span>
  );
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    approve: 'Approve',
    reject: 'Reject',
    suspend: 'Suspend',
    activate: 'Activate',
    tier_change: 'Tier Change',
    restriction_add: 'Add Restriction',
    restriction_remove: 'Remove Restriction',
    dispute_resolve: 'Resolve Dispute',
    role_assign: 'Assign Role',
    bulk_approve: 'Bulk Approve',
    bulk_reject: 'Bulk Reject',
    bulk_suspend: 'Bulk Suspend',
    login: 'Login',
    export: 'Export',
  };
  return labels[action] || action;
}

function getEntityLink(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'trader':
      return `/traders/${entityId}`;
    case 'dispute':
      return `/disputes/${entityId}`;
    default:
      return '#';
  }
}

const selectStyle = {
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  background: '#fff',
};

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '12px 16px',
  fontWeight: '500',
  color: '#666',
};

const tdStyle = {
  padding: '12px 16px',
};
