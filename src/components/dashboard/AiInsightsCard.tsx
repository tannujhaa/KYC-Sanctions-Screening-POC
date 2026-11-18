import React from 'react';
import { Sparkles } from 'lucide-react';
import type { DashboardStats } from '../../types/kyc';

interface AiInsightsCardProps {
  stats: DashboardStats;
  onAskAssistant?: () => void;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return `${hours} h ${remaining} min`;
}

export const AiInsightsCard: React.FC<AiInsightsCardProps> = ({ stats, onAskAssistant }) => {
  const {
    total,
    potentialMatches,
    pendingReview,
    oldestPendingMinutes,
    oldestPendingCaseId,
    matchBasis,
  } = stats;

  const dobConfirmedCount = matchBasis.dobConfirmed;
  const nationalityOnlyCount = matchBasis.nationalityOnly;
  const maxConfirmed = Math.max(1, potentialMatches);

  const dobPct = Math.round((dobConfirmedCount / maxConfirmed) * 100);
  const natPct = Math.round((nationalityOnlyCount / maxConfirmed) * 100);

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
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: '#FAF4FB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#831B84',
            marginTop: '1px',
          }}
        >
          <Sparkles size={16} />
        </div>
        <div>
          <h3
            style={{
              margin: '0 0 2px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            AI insights
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              color: '#6B7280',
            }}
          >
            KYC Assistant · from {total} case records · 10:45
          </p>
        </div>
      </div>

      {/* Block 1: Review Backlog */}
      <div
        style={{
          backgroundColor: '#FFF5F5',
          border: '1px solid #FEE2E2',
          borderLeft: '4px solid #EF4444',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#991B1B',
            marginBottom: '4px',
          }}
        >
          Review backlog
        </div>
        <div
          style={{
            fontSize: '12px',
            lineHeight: 1.5,
            color: '#7F1D1D',
          }}
        >
          {pendingReview} potential {pendingReview === 1 ? 'match is' : 'matches are'} awaiting a decision.
          {pendingReview > 0 && oldestPendingCaseId && (
            <> The oldest, {oldestPendingCaseId}, has been open for {formatMinutes(oldestPendingMinutes)}.</>
          )}
        </div>
      </div>

      {/* Block 2: Alias Hits */}
      <div
        style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#1E293B',
            marginBottom: '4px',
          }}
        >
          Alias hits drive the match rate
        </div>
        <div
          style={{
            fontSize: '12px',
            lineHeight: 1.5,
            color: '#475569',
          }}
        >
          {matchBasis.aliasHits} of {potentialMatches} potential matches came from a listed alias rather than
          the primary name. Alias coverage on the list matters more than exact spelling.
        </div>
      </div>

      {/* Block 3: How Matches Were Confirmed */}
      <div style={{ marginBottom: '18px' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#4B5563',
            marginBottom: '10px',
          }}
        >
          How matches were confirmed
        </div>

        {/* DOB Confirmed */}
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#4B5563',
              marginBottom: '4px',
            }}
          >
            <span>DOB confirmed</span>
            <span style={{ fontWeight: 600 }}>{dobConfirmedCount}</span>
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: '#F3F4F6',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${dobPct}%`,
                backgroundColor: '#831B84',
                borderRadius: '9999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Nationality Only */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#4B5563',
              marginBottom: '4px',
            }}
          >
            <span>Nationality only</span>
            <span style={{ fontWeight: 600 }}>{nationalityOnlyCount}</span>
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: '#F3F4F6',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${natPct}%`,
                backgroundColor: '#C589C6',
                borderRadius: '9999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Button: Ask the Assistant */}
      <button
        onClick={onAskAssistant}
        style={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          border: '1px solid #D1D5DB',
          color: '#1F2937',
          padding: '9px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '12px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#831B84';
          e.currentTarget.style.color = '#831B84';
          e.currentTarget.style.backgroundColor = '#FAF4FB';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#D1D5DB';
          e.currentTarget.style.color = '#1F2937';
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }}
      >
        Ask the assistant
      </button>

      {/* Disclaimer */}
      <div
        style={{
          fontSize: '10px',
          color: '#9CA3AF',
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}
      >
        Generated from mocked case data. Insights summarise records; they are not compliance advice.
      </div>
    </div>
  );
};
