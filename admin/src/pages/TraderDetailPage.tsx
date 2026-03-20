import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getTrader,
  approveTrader,
  rejectTrader,
  suspendTrader,
  activateTrader,
  changeTraderTier,
  getTraderTierHistory,
  getTraderRestrictions,
  addTraderRestriction,
  removeTraderRestriction,
  getEntityAuditHistory,
} from '../services/api';
import type { Trader, TierHistoryEntry, Restriction, AuditLogEntry } from '../types';

type TabId = 'overview' | 'tier' | 'restrictions' | 'audit';

export function TraderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trader, setTrader] = useState<Trader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  // Tab data
  const [tierHistory, setTierHistory] = useState<TierHistoryEntry[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);

  // Modals
  const [showTierModal, setShowTierModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);

  useEffect(() => {
    if (id) loadTrader();
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 'tier') loadTierHistory();
    if (id && activeTab === 'restrictions') loadRestrictions();
    if (id && activeTab === 'audit') loadAuditHistory();
  }, [id, activeTab]);

  const loadTrader = async () => {
    try {
      setLoading(true);
      const data = await getTrader(id!);
      setTrader(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTierHistory = async () => {
    try {
      const data = await getTraderTierHistory(id!);
      setTierHistory(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadRestrictions = async () => {
    try {
      const data = await getTraderRestrictions(id!, true);
      setRestrictions(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadAuditHistory = async () => {
    try {
      const data = await getEntityAuditHistory('trader', id!);
      setAuditHistory(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Actions
  const handleApprove = async () => {
    if (!confirm('Approve this trader?')) return;
    try {
      setActionLoading(true);
      await approveTrader(id!);
      loadTrader();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      await rejectTrader(id!, reason);
      loadTrader();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Suspension reason:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      await suspendTrader(id!, reason);
      loadTrader();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!confirm('Reactivate this trader?')) return;
    try {
      setActionLoading(true);
      await activateTrader(id!);
      loadTrader();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRestriction = async (restrictionId: string) => {
    if (!confirm('Remove this restriction?')) return;
    try {
      await removeTraderRestriction(id!, restrictionId);
      loadRestrictions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!trader) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Trader not found</h2>
        <Link to="/traders">Back to traders</Link>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'tier', label: 'Tier History' },
    { id: 'restrictions', label: 'Restrictions' },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/traders" style={{ color: '#666', textDecoration: 'none', marginBottom: '8px', display: 'block' }}>
          ← Back to traders
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0 }}>{trader.displayName || 'Unknown'}</h1>
            <p style={{ margin: '4px 0 0', color: '#666' }}>{trader.phone}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {trader.status === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  style={buttonStyle('#10b981')}
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  style={buttonStyle('#ef4444')}
                >
                  Reject
                </button>
              </>
            )}
            {trader.status === 'active' && (
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                style={buttonStyle('#f59e0b', '#000')}
              >
                Suspend
              </button>
            )}
            {trader.status === 'suspended' && (
              <button
                onClick={handleActivate}
                disabled={actionLoading}
                style={buttonStyle('#3b82f6')}
              >
                Reactivate
              </button>
            )}
          </div>
        </div>
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

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: '#fff', borderRadius: '8px', padding: '24px' }}>
        {activeTab === 'overview' && <OverviewTab trader={trader} onChangeTier={() => setShowTierModal(true)} />}
        {activeTab === 'tier' && <TierHistoryTab history={tierHistory} onChangeTier={() => setShowTierModal(true)} />}
        {activeTab === 'restrictions' && (
          <RestrictionsTab
            restrictions={restrictions}
            onAdd={() => setShowRestrictionModal(true)}
            onRemove={handleRemoveRestriction}
          />
        )}
        {activeTab === 'audit' && <AuditTab history={auditHistory} />}
      </div>

      {/* Change Tier Modal */}
      {showTierModal && (
        <ChangeTierModal
          currentTier={(trader as any).tier || 'observer'}
          onClose={() => setShowTierModal(false)}
          onSubmit={async (tier, reason) => {
            await changeTraderTier(id!, tier, reason);
            loadTrader();
            loadTierHistory();
            setShowTierModal(false);
          }}
        />
      )}

      {/* Add Restriction Modal */}
      {showRestrictionModal && (
        <AddRestrictionModal
          onClose={() => setShowRestrictionModal(false)}
          onSubmit={async (data) => {
            await addTraderRestriction(id!, data);
            loadRestrictions();
            setShowRestrictionModal(false);
          }}
        />
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ trader, onChangeTier }: { trader: Trader; onChangeTier: () => void }) {
  const tier = (trader as any).tier || 'observer';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <div>
        <h3 style={{ marginTop: 0 }}>Status</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <StatusBadge status={trader.status} />
          {trader.isOnline && <span style={{ color: '#10b981' }}>Online</span>}
        </div>

        <h3>Tier</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <TierBadge tier={tier} />
          <button
            onClick={onChangeTier}
            style={{
              padding: '4px 12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Change
          </button>
        </div>

        <h3>Bond</h3>
        <p style={{ margin: 0 }}>
          <strong>${trader.bondAmount}</strong> total
          {trader.bondLocked > 0 && <span> (${trader.bondLocked} locked)</span>}
        </p>
      </div>

      <div>
        <h3 style={{ marginTop: 0 }}>Performance</h3>
        <p>Rating: {trader.rating > 0 ? `${trader.rating.toFixed(1)} ★` : 'No ratings yet'}</p>
        <p>Total Trades: {trader.totalTrades}</p>

        <h3>Corridors</h3>
        {trader.corridors?.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {trader.corridors.map((c, i) => (
              <li key={i}>
                {c.from} → {c.to} (Buy: {c.buyRate}, Sell: {c.sellRate})
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#666' }}>No corridors configured</p>
        )}

        <h3>Account</h3>
        <p>Created: {new Date(trader.createdAt).toLocaleDateString()}</p>
        {trader.approvedAt && <p>Approved: {new Date(trader.approvedAt).toLocaleDateString()}</p>}
      </div>
    </div>
  );
}

// Tier History Tab
function TierHistoryTab({ history, onChangeTier }: { history: TierHistoryEntry[]; onChangeTier: () => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Tier History</h3>
        <button
          onClick={onChangeTier}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Change Tier
        </button>
      </div>

      {history.length === 0 ? (
        <p style={{ color: '#666' }}>No tier changes recorded</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>To</th>
              <th style={thStyle}>Reason</th>
              <th style={thStyle}>Changed By</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr key={entry.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={tdStyle}>{new Date(entry.createdAt).toLocaleString()}</td>
                <td style={tdStyle}>{entry.oldTier || '-'}</td>
                <td style={tdStyle}><TierBadge tier={entry.newTier} /></td>
                <td style={tdStyle}>{entry.reason || '-'}</td>
                <td style={tdStyle}>{entry.changedByName || 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Restrictions Tab
function RestrictionsTab({
  restrictions,
  onAdd,
  onRemove,
}: {
  restrictions: Restriction[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const activeRestrictions = restrictions.filter((r) => r.isActive);
  const inactiveRestrictions = restrictions.filter((r) => !r.isActive);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Restrictions ({activeRestrictions.length} active)</h3>
        <button
          onClick={onAdd}
          style={{
            padding: '8px 16px',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add Restriction
        </button>
      </div>

      {activeRestrictions.length === 0 ? (
        <p style={{ color: '#666' }}>No active restrictions</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {activeRestrictions.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ color: '#b91c1c' }}>{formatRestrictionType(r.restrictionType)}</strong>
                  {r.reason && <p style={{ margin: '4px 0 0', color: '#666' }}>{r.reason}</p>}
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#999' }}>
                    Applied by {r.appliedByName || 'System'} on {new Date(r.createdAt).toLocaleDateString()}
                    {r.expiresAt && ` • Expires ${new Date(r.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(r.id)}
                  style={{
                    padding: '4px 12px',
                    background: '#fff',
                    border: '1px solid #fca5a5',
                    borderRadius: '4px',
                    color: '#b91c1c',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveRestrictions.length > 0 && (
        <>
          <h4 style={{ color: '#666' }}>Previous Restrictions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inactiveRestrictions.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '12px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  opacity: 0.7,
                }}
              >
                <strong>{formatRestrictionType(r.restrictionType)}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                  {new Date(r.createdAt).toLocaleDateString()} - {new Date(r.removedAt!).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Audit Tab
function AuditTab({ history }: { history: AuditLogEntry[] }) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Audit History</h3>

      {history.length === 0 ? (
        <p style={{ color: '#666' }}>No audit entries</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {history.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: '12px 16px',
                background: '#f9fafb',
                borderRadius: '8px',
                borderLeft: `4px solid ${getActionColor(entry.action)}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{formatAction(entry.action)}</strong>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>
                by {entry.adminName || 'System'}
                {entry.reason && ` — ${entry.reason}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Change Tier Modal
function ChangeTierModal({
  currentTier,
  onClose,
  onSubmit,
}: {
  currentTier: string;
  onClose: () => void;
  onSubmit: (tier: string, reason: string) => Promise<void>;
}) {
  const [tier, setTier] = useState(currentTier);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Reason is required');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(tier, reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Change Tier</h2>

      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>New Tier</label>
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          marginBottom: '16px',
        }}
      >
        <option value="observer">Observer</option>
        <option value="starter">Starter</option>
        <option value="verified">Verified</option>
        <option value="trusted">Trusted</option>
        <option value="anchor">Anchor</option>
      </select>

      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
        Reason <span style={{ color: '#ef4444' }}>*</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Enter reason for tier change..."
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          minHeight: '80px',
          marginBottom: '16px',
        }}
      />

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={buttonStyle('#f3f4f6', '#374151')}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading} style={buttonStyle('#3b82f6')}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}

// Add Restriction Modal
function AddRestrictionModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { restrictionType: string; reason: string; expiresAt?: string }) => Promise<void>;
}) {
  const [type, setType] = useState('no_new_trades');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Reason is required');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        restrictionType: type,
        reason,
        expiresAt: expiresAt || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Add Restriction</h2>

      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Restriction Type</label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          marginBottom: '16px',
        }}
      >
        <option value="no_new_trades">Cannot Accept New Trades</option>
        <option value="under_review">Under Review</option>
        <option value="volume_limit">Volume Limit</option>
        <option value="corridor_limit">Corridor Restriction</option>
        <option value="kyc_required">KYC Required</option>
        <option value="bond_hold">Bond Withdrawal Hold</option>
      </select>

      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
        Reason <span style={{ color: '#ef4444' }}>*</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Enter reason for restriction..."
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          minHeight: '80px',
          marginBottom: '16px',
        }}
      />

      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
        Expires At (optional)
      </label>
      <input
        type="datetime-local"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          marginBottom: '16px',
        }}
      />

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={buttonStyle('#f3f4f6', '#374151')}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading} style={buttonStyle('#ef4444')}>
          {loading ? 'Adding...' : 'Add Restriction'}
        </button>
      </div>
    </Modal>
  );
}

// Modal wrapper
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '12px',
          width: '400px',
          maxWidth: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Helper components
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
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '14px',
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
  const styles: Record<string, { bg: string; color: string }> = {
    observer: { bg: '#f3f4f6', color: '#6b7280' },
    starter: { bg: '#e0f2fe', color: '#0369a1' },
    verified: { bg: '#dbeafe', color: '#1d4ed8' },
    trusted: { bg: '#fef3c7', color: '#92400e' },
    anchor: { bg: '#fce7f3', color: '#be185d' },
  };
  const style = styles[tier] || styles.observer;

  return (
    <span
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
      }}
    >
      {tier}
    </span>
  );
}

// Styles
const buttonStyle = (bg: string, color = '#fff') => ({
  padding: '10px 20px',
  background: bg,
  color,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '500' as const,
});

const thStyle = {
  textAlign: 'left' as const,
  padding: '12px 16px',
  fontWeight: '500',
  color: '#666',
};

const tdStyle = {
  padding: '12px 16px',
};

// Helpers
function formatRestrictionType(type: string): string {
  const labels: Record<string, string> = {
    volume_limit: 'Volume Limit',
    corridor_limit: 'Corridor Restriction',
    no_new_trades: 'Cannot Accept New Trades',
    under_review: 'Under Review',
    kyc_required: 'KYC Required',
    bond_hold: 'Bond Withdrawal Hold',
  };
  return labels[type] || type;
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    approve: 'Approved',
    reject: 'Rejected',
    suspend: 'Suspended',
    activate: 'Activated',
    tier_change: 'Tier Changed',
    restriction_add: 'Restriction Added',
    restriction_remove: 'Restriction Removed',
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
  };
  return colors[action] || '#6b7280';
}
