import { useState } from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  onApprove: (reason?: string) => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onSuspend: (reason?: string) => Promise<void>;
  onClearSelection: () => void;
  // Permission flags
  canApprove?: boolean;
  canReject?: boolean;
  canSuspend?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onApprove,
  onReject,
  onSuspend,
  onClearSelection,
  canApprove = true,
  canReject = true,
  canSuspend = true,
}: BulkActionBarProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showReasonModal, setShowReasonModal] = useState<{
    action: 'approve' | 'reject' | 'suspend';
    required: boolean;
  } | null>(null);
  const [reason, setReason] = useState('');

  if (selectedCount === 0) return null;

  const handleAction = async (action: 'approve' | 'reject' | 'suspend', requireReason: boolean) => {
    if (requireReason) {
      setShowReasonModal({ action, required: true });
      return;
    }

    setLoading(action);
    try {
      if (action === 'approve') {
        await onApprove();
      } else if (action === 'reject') {
        await onReject();
      } else {
        await onSuspend();
      }
    } finally {
      setLoading(null);
    }
  };

  const submitWithReason = async () => {
    if (!showReasonModal) return;

    const { action } = showReasonModal;
    setLoading(action);
    try {
      if (action === 'approve') {
        await onApprove(reason);
      } else if (action === 'reject') {
        await onReject(reason);
      } else {
        await onSuspend(reason);
      }
      setShowReasonModal(null);
      setReason('');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {/* Floating action bar */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1f2937',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 1000,
        }}
      >
        <span style={{ fontWeight: '500' }}>{selectedCount} selected</span>

        <div style={{ width: '1px', height: '24px', background: '#374151' }} />

        {canApprove && (
          <button
            onClick={() => handleAction('approve', false)}
            disabled={loading !== null}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loading === 'approve' && <Spinner />}
            Approve All
          </button>
        )}

        {canReject && (
          <button
            onClick={() => handleAction('reject', true)}
            disabled={loading !== null}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loading === 'reject' && <Spinner />}
            Reject All
          </button>
        )}

        {canSuspend && (
          <button
            onClick={() => handleAction('suspend', true)}
            disabled={loading !== null}
            style={{
              padding: '8px 16px',
              background: '#f59e0b',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loading === 'suspend' && <Spinner />}
            Suspend All
          </button>
        )}

        <div style={{ width: '1px', height: '24px', background: '#374151' }} />

        <button
          onClick={onClearSelection}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: '#9ca3af',
            border: '1px solid #374151',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Reason modal */}
      {showReasonModal && (
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
          onClick={() => {
            setShowReasonModal(null);
            setReason('');
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              width: '400px',
              maxWidth: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
              {showReasonModal.action === 'reject' ? 'Reject' : 'Suspend'} {selectedCount} Trader
              {selectedCount > 1 ? 's' : ''}
            </h3>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Reason {showReasonModal.required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for this action..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                minHeight: '100px',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowReasonModal(null);
                  setReason('');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitWithReason}
                disabled={loading !== null || (showReasonModal.required && !reason.trim())}
                style={{
                  padding: '10px 20px',
                  background: showReasonModal.action === 'reject' ? '#ef4444' : '#f59e0b',
                  color: showReasonModal.action === 'reject' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor:
                    loading || (showReasonModal.required && !reason.trim())
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: loading || (showReasonModal.required && !reason.trim()) ? 0.6 : 1,
                  fontWeight: '500',
                }}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: '14px',
        height: '14px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}
