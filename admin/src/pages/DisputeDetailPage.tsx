import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDispute, resolveDispute } from '../services/api';
import type { Dispute } from '../types';

export function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  // Resolution form
  const [resolution, setResolution] = useState<'favor_user' | 'favor_trader' | 'split'>('favor_user');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (id) loadDispute();
  }, [id]);

  const loadDispute = async () => {
    try {
      setLoading(true);
      const data = await getDispute(id!);
      setDispute(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!dispute) return;

    try {
      setResolving(true);
      await resolveDispute(dispute.id, { resolution, notes });
      navigate('/disputes');
    } catch (err: any) {
      setError(err.message);
      setShowConfirm(false);
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (error || !dispute) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#c00', marginBottom: '16px' }}>{error || 'Dispute not found'}</p>
        <button onClick={() => navigate('/disputes')}>Back to Disputes</button>
      </div>
    );
  }

  const trade = dispute.trade;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button
            onClick={() => navigate('/disputes')}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginBottom: '8px' }}
          >
            &larr; Back to Disputes
          </button>
          <h1 style={{ margin: 0 }}>Dispute Details</h1>
        </div>
        <StatusBadge status={dispute.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Main Content */}
        <div>
          {/* Dispute Info */}
          <Card title="Dispute Information">
            <InfoRow label="Dispute ID" value={dispute.id} mono />
            <InfoRow label="Trade ID" value={dispute.tradeId} mono />
            <InfoRow label="Opened By" value={dispute.openedByUser?.displayName || dispute.openedBy} />
            <InfoRow label="Created" value={new Date(dispute.createdAt).toLocaleString()} />
            <InfoRow label="Reason" value={dispute.reason} />
          </Card>

          {/* Trade Info */}
          {trade && (
            <Card title="Trade Details" style={{ marginTop: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h4 style={{ color: '#666', marginBottom: '8px' }}>Send</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {trade.sendAmount} {trade.sendCurrency}
                  </div>
                  <div style={{ color: '#666', marginTop: '4px' }}>
                    From: {trade.userName || 'User'}
                  </div>
                </div>
                <div>
                  <h4 style={{ color: '#666', marginBottom: '8px' }}>Receive</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {trade.receiveAmount} {trade.receiveCurrency}
                  </div>
                  <div style={{ color: '#666', marginTop: '4px' }}>
                    To: {trade.recipientName}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <InfoRow label="Trader" value={trade.traderName || trade.traderId} />
                <InfoRow label="Bond Locked" value={`$${trade.bondLocked || 0} USDT`} />
                <InfoRow label="Trade Status" value={trade.status} />
                <InfoRow label="Payment Reference" value={trade.paymentReference || '-'} />
              </div>
            </Card>
          )}

          {/* Evidence */}
          <Card title="Evidence" style={{ marginTop: '24px' }}>
            {!dispute.evidence || dispute.evidence.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No evidence submitted</p>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {dispute.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '500' }}>
                        {ev.submittedByUser?.displayName || 'Unknown'}
                      </span>
                      <span style={{ color: '#666', fontSize: '14px' }}>
                        {new Date(ev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Type: {ev.evidenceType}
                    </div>
                    {ev.content && <p style={{ margin: 0 }}>{ev.content}</p>}
                    {ev.fileUrl && (
                      <div style={{ marginTop: '12px' }}>
                        <a
                          href={ev.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#4ade80' }}
                        >
                          View Attachment
                        </a>
                        {ev.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                          <img
                            src={ev.fileUrl}
                            alt="Evidence"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '300px',
                              marginTop: '8px',
                              borderRadius: '4px',
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar - Resolution */}
        <div>
          {dispute.status === 'resolved' ? (
            <Card title="Resolution">
              <InfoRow label="Decision" value={formatResolution(dispute.resolution!)} />
              <InfoRow label="Resolved By" value={dispute.resolvedBy || '-'} />
              <InfoRow label="Resolved At" value={dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleString() : '-'} />
              {dispute.resolutionNotes && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>Notes</div>
                  <p style={{ margin: 0 }}>{dispute.resolutionNotes}</p>
                </div>
              )}
            </Card>
          ) : (
            <Card title="Resolve Dispute">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Decision
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="resolution"
                      value="favor_user"
                      checked={resolution === 'favor_user'}
                      onChange={() => setResolution('favor_user')}
                      style={{ marginRight: '8px' }}
                    />
                    <span>Favor User</span>
                    <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                      (Trader bond slashed)
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="resolution"
                      value="favor_trader"
                      checked={resolution === 'favor_trader'}
                      onChange={() => setResolution('favor_trader')}
                      style={{ marginRight: '8px' }}
                    />
                    <span>Favor Trader</span>
                    <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                      (Bond unlocked)
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="resolution"
                      value="split"
                      checked={resolution === 'split'}
                      onChange={() => setResolution('split')}
                      style={{ marginRight: '8px' }}
                    />
                    <span>Split</span>
                    <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                      (Partial refund)
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain your decision..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    minHeight: '100px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={() => setShowConfirm(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#4ade80',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Resolve Dispute
              </button>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Confirm Resolution</h2>
            <p>
              You are about to resolve this dispute with decision:{' '}
              <strong>{formatResolution(resolution)}</strong>
            </p>
            {resolution === 'favor_user' && (
              <p style={{ color: '#c00' }}>
                This will slash the trader's bond of ${trade?.bondLocked || 0} USDT.
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: resolving ? '#ccc' : '#4ade80',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: resolving ? 'not-allowed' : 'pointer',
                }}
              >
                {resolving ? 'Resolving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        ...style,
      }}
    >
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', marginBottom: '8px' }}>
      <span style={{ color: '#666', minWidth: '140px' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value ?? '-'}
      </span>
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
        padding: '8px 16px',
        borderRadius: '4px',
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

function formatResolution(res: string): string {
  const map: Record<string, string> = {
    favor_user: 'Favor User',
    favor_trader: 'Favor Trader',
    split: 'Split',
  };
  return map[res] || res;
}
