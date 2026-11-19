import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import type { DashboardStats, KycCase } from '../../types/kyc';

interface AiInsightsCardProps {
  stats: DashboardStats;
  cases?: KycCase[];
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return `${hours} h ${remaining} min`;
}

export const AiInsightsCard: React.FC<AiInsightsCardProps> = ({
  stats,
  cases = [],
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'insights' | 'metrics'>('insights');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCurrentTimeStr(time);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const {
    total,
    potentialMatches,
    hitRate,
    cleared,
    pendingReview,
    oldestPendingMinutes,
    oldestPendingCaseId,
    matchBasis,
  } = stats;

  // Real-time dynamic calculations from all live cases
  const caseMetrics = useMemo(() => {
    const totalCases = cases.length || total;
    let approved = 0;
    let rejected = 0;
    let escalated = 0;
    let pending = 0;

    const nationalityMap: Record<string, number> = {};

    cases.forEach((c) => {
      const dec = c.reviewerDecision || 'Pending review';
      if (dec === 'Approved') approved++;
      else if (dec === 'Rejected') rejected++;
      else if (dec === 'Escalated') escalated++;
      else pending++;

      if (c.nationality) {
        const nat = c.nationality.trim();
        if (nat) {
          nationalityMap[nat] = (nationalityMap[nat] || 0) + 1;
        }
      }
    });

    const decided = approved + rejected + escalated;
    const resolutionPct = totalCases > 0 ? Math.round((decided / totalCases) * 100) : 0;

    // Top nationalities sorted descending
    const topNationalities = Object.entries(nationalityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalCases,
      approved,
      rejected,
      escalated,
      pending,
      decided,
      resolutionPct,
      topNationalities,
    };
  }, [cases, total]);

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
        width: '100%',
      }}
    >
      {/* 1. Header with dynamic time and Tab Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
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
              KYC Assistant · from {caseMetrics.totalCases} case records · {currentTimeStr || 'Live'}
            </p>
          </div>
        </div>

        {/* Tab Switcher: Insights vs Metrics */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid #E5E7EB',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            style={{
              border: 'none',
              backgroundColor: activeTab === 'insights' ? '#831B84' : 'transparent',
              color: activeTab === 'insights' ? '#FFFFFF' : '#4B5563',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={12} />
            Insights
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            style={{
              border: 'none',
              backgroundColor: activeTab === 'metrics' ? '#831B84' : 'transparent',
              color: activeTab === 'metrics' ? '#FFFFFF' : '#4B5563',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <BarChart3 size={12} />
            Metrics
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT */}
      {activeTab === 'insights' ? (
        <>
          {/* Block 1: Dynamic Review Backlog Status */}
          {pendingReview > 0 ? (
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
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#991B1B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <AlertTriangle size={13} color="#EF4444" />
                  Review backlog
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/cases?status=pending')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#831B84',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  Review now <ArrowRight size={11} />
                </button>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#7F1D1D',
                }}
              >
                {pendingReview} potential {pendingReview === 1 ? 'match is' : 'matches are'} awaiting a decision.
                {oldestPendingCaseId && (
                  <> The oldest, <strong>{oldestPendingCaseId}</strong>, has been open for {formatMinutes(oldestPendingMinutes)}.</>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #DCFCE7',
                borderLeft: '4px solid #10B981',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#166534',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <CheckCircle2 size={13} color="#10B981" />
                Queue fully up to date
              </div>
              <div
                style={{
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#14532D',
                }}
              >
                All {caseMetrics.totalCases} screening cases have been processed. There are currently no pending reviews in the queue.
              </div>
            </div>
          )}

          {/* Block 2: Dynamic Watchlist & Match Pattern */}
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
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <TrendingUp size={13} color="#6366F1" />
              {potentialMatches === 0
                ? '100% Clean screening rate'
                : matchBasis.aliasHits > 0
                ? 'Alias hits drive the match rate'
                : 'Direct name match detection'}
            </div>
            <div
              style={{
                fontSize: '12px',
                lineHeight: 1.5,
                color: '#475569',
              }}
            >
              {potentialMatches === 0 ? (
                `Zero sanctions or PEP watchlist overlap detected across ${caseMetrics.totalCases} customer screenings. All records verified clean.`
              ) : matchBasis.aliasHits > 0 ? (
                `${matchBasis.aliasHits} of ${potentialMatches} (${Math.round((matchBasis.aliasHits / potentialMatches) * 100)}%) potential matches originated from listed aliases rather than primary legal names. Cross-referencing aliases is active and effective.`
              ) : (
                `All ${potentialMatches} potential matches were identified directly on primary legal names corroborated by date of birth or nationality.`
              )}
            </div>
          </div>

          {/* Block 3: Dynamic How Matches Were Confirmed */}
          <div style={{ marginBottom: '18px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#4B5563',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>How matches were confirmed</span>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>
                {potentialMatches} flagged / {caseMetrics.totalCases} total
              </span>
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
        </>
      ) : (
        /* METRICS TAB: Visual Decisions Breakdown & Compliance Health */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
          {/* Reviewer Decisions Progress Bar */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              <span>Reviewer Decisions</span>
              <span style={{ color: '#831B84' }}>{caseMetrics.resolutionPct}% resolved</span>
            </div>

            {/* Segmented bar */}
            <div
              style={{
                height: '10px',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                backgroundColor: '#E5E7EB',
                marginBottom: '10px',
              }}
            >
              {caseMetrics.totalCases > 0 ? (
                <>
                  <div
                    style={{
                      width: `${(caseMetrics.approved / caseMetrics.totalCases) * 100}%`,
                      backgroundColor: '#10B981',
                      transition: 'width 0.3s ease',
                    }}
                    title={`Approved: ${caseMetrics.approved}`}
                  />
                  <div
                    style={{
                      width: `${(caseMetrics.rejected / caseMetrics.totalCases) * 100}%`,
                      backgroundColor: '#EF4444',
                      transition: 'width 0.3s ease',
                    }}
                    title={`Rejected: ${caseMetrics.rejected}`}
                  />
                  <div
                    style={{
                      width: `${(caseMetrics.escalated / caseMetrics.totalCases) * 100}%`,
                      backgroundColor: '#F59E0B',
                      transition: 'width 0.3s ease',
                    }}
                    title={`Escalated: ${caseMetrics.escalated}`}
                  />
                  <div
                    style={{
                      width: `${(caseMetrics.pending / caseMetrics.totalCases) * 100}%`,
                      backgroundColor: '#9CA3AF',
                      transition: 'width 0.3s ease',
                    }}
                    title={`Pending: ${caseMetrics.pending}`}
                  />
                </>
              ) : (
                <div style={{ width: '100%', backgroundColor: '#E5E7EB' }} />
              )}
            </div>

            {/* Legend */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span>Approved: <strong>{caseMetrics.approved}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991B1B' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                <span>Rejected: <strong>{caseMetrics.rejected}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400E' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <span>Escalated: <strong>{caseMetrics.escalated}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9CA3AF' }} />
                <span>Pending: <strong>{caseMetrics.pending}</strong></span>
              </div>
            </div>
          </div>

          {/* Top Nationalities */}
          {caseMetrics.topNationalities.length > 0 && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ShieldCheck size={13} color="#831B84" />
                Screened Demographics
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {caseMetrics.topNationalities.map(([nat, cnt]) => (
                  <span
                    key={nat}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: '#1E293B',
                      fontWeight: 500,
                    }}
                  >
                    {nat}: <strong>{cnt}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Portfolio Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '8px 4px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#6B7280' }}>Total Cases</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{caseMetrics.totalCases}</div>
            </div>
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #DCFCE7',
                borderRadius: '8px',
                padding: '8px 4px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#166534' }}>Cleared</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803D' }}>{cleared}</div>
            </div>
            <div
              style={{
                backgroundColor: '#FAF5FF',
                border: '1px solid #F3E8FF',
                borderRadius: '8px',
                padding: '8px 4px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#7E22CE' }}>Hit Rate</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#831B84' }}>{hitRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Footer (No mocked data text) */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '8px',
          fontSize: '10px',
          color: '#9CA3AF',
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}
      >
        Live insights computed dynamically from active SharePoint screening records.
      </div>
    </div>
  );
};
