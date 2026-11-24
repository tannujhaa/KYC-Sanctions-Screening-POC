import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { KycCase } from '../../types/kyc';

interface NeedsReviewListProps {
  cases: KycCase[];
  pendingCount: number;
}

// Helper to format minutes into human-readable e.g. "2 h 10 min" or "18 min"
function formatOpenTime(createdAtStr?: string | null): string {
  if (!createdAtStr) return 'recently';
  const now = Date.now();
  let created = new Date(createdAtStr).getTime();
  if (isNaN(created)) {
    created = new Date(createdAtStr.replace(/,/g, '')).getTime();
  }
  if (isNaN(created)) return 'recently';
  const diffMins = Math.max(1, Math.floor((now - created) / (1000 * 60)));

  if (diffMins < 60) {
    return `${diffMins} min`;
  }
  const hours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `${hours} h ${remainingMins} min`;
}

// Helper to summarize match basis in short label
function formatMatchSummary(matchReason?: string | null): string {
  if (!matchReason) return 'Flagged match';
  const norm = matchReason.toLowerCase();
  const hasName = norm.includes('name') || norm.includes('alias');
  const hasDob = norm.includes('dob');
  const hasNat = norm.includes('nationality');

  const parts: string[] = [];
  if (hasName) parts.push('Name');
  if (hasDob) parts.push('DOB');
  if (hasNat) parts.push('nationality');

  return parts.length > 0 ? parts.join(' + ') : 'Match flagged';
}

export const NeedsReviewList: React.FC<NeedsReviewListProps> = ({ cases, pendingCount }) => {
  const navigate = useNavigate();

  // Filter pending review cases and sort OLDEST first (ascending timestamp)
  const pendingCases = cases
    .filter((c) => c.reviewerDecision === 'Pending review')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '300px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            Needs your review
          </h3>
          <span
            style={{
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            {pendingCount}
          </span>
        </div>

        <button
          onClick={() => navigate('/cases?status=pending')}
          style={{
            background: 'none',
            border: 'none',
            color: '#831B84',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          View all
        </button>
      </div>

      {/* List */}
      <div
        className="custom-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          maxHeight: '204px',
          paddingRight: '6px',
        }}
      >
        {pendingCases.length === 0 ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '13px',
            }}
          >
            No cases currently pending review.
          </div>
        ) : (
          pendingCases.map((item) => (
            <div
              key={item.caseId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #F3F4F6',
                backgroundColor: '#FAFAFA',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                    {item.customerName}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    {item.caseId}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  {formatMatchSummary(item.matchReason)} · open {formatOpenTime(item.createdAt)}
                </div>
              </div>

              <button
                onClick={() =>
                  navigate(`/result/${item.caseId}`, {
                    state: {
                      screeningResult: item,
                      screeningMethod: item.screeningMethod,
                    },
                  })
                }
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  color: '#374151',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#831B84';
                  e.currentTarget.style.color = '#831B84';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.color = '#374151';
                }}
              >
                Review
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
