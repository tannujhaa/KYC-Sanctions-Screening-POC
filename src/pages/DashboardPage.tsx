import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { getContext } from '@microsoft/power-apps/app';
import type { IContext } from '@microsoft/power-apps/app';
import { kycService } from '../services/kycService';
import type { DashboardStats, KycCase } from '../types/kyc';
import { StackedBarChart } from '../components/dashboard/StackedBarChart';
import { NeedsReviewList } from '../components/dashboard/NeedsReviewList';
import { RecentCasesTable } from '../components/dashboard/RecentCasesTable';
import { AiInsightsCard } from '../components/dashboard/AiInsightsCard';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cases, setCases] = useState<KycCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('Reviewer');

  // Fetch logged in user name dynamically
  useEffect(() => {
    getContext()
      .then((ctx: IContext) => {
        if (ctx?.user?.fullName) {
          setUserName(ctx.user.fullName);
        } else if (ctx?.user?.userPrincipalName) {
          const emailName = ctx.user.userPrincipalName.split('@')[0];
          const formatted = emailName
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          setUserName(formatted);
        }
      })
      .catch((e: unknown) => {
        console.warn('[Power Apps] getContext() not available in DashboardPage:', e);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        const [dashStats, allCases] = await Promise.all([
          kycService.getDashboardStats(14),
          kycService.getCases(),
        ]);

        if (isMounted) {
          setStats(dashStats);
          setCases(allCases);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !stats) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          color: '#6B7280',
          fontSize: '14px',
        }}
      >
        Loading dashboard data...
      </div>
    );
  }

  // Format oldest pending string e.g. "2 h 10 min"
  const oldestPendingFormatted =
    stats.oldestPendingMinutes < 60
      ? `${stats.oldestPendingMinutes} min`
      : `${Math.floor(stats.oldestPendingMinutes / 60)} h ${stats.oldestPendingMinutes % 60} min`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const pendingCount = cases.filter((c) => c.reviewerDecision === 'Pending review').length;

  return (
    <div
      style={{
        padding: '20px 24px 36px 24px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. GREETING HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.3px',
            }}
          >
            {getGreeting()}, {userName}
          </h1>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Review Queue (n) */}
          <button
            onClick={() => navigate('/cases?status=pending')}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              color: '#1F2937',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.borderColor = '#9CA3AF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#D1D5DB';
            }}
          >
            Review queue ({pendingCount})
          </button>

          {/* + New case */}
          <button
            onClick={() => navigate('/new-case')}
            style={{
              backgroundColor: '#831B84',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(131, 27, 132, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6A146B')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#831B84')}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New case</span>
          </button>
        </div>
      </div>

      {/* 2. 4 KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* KPI 1: Total screenings */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: '#FAF4FB',
                color: '#831B84',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={14} />
            </div>
            <span>Total screenings</span>
          </div>

          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#111827',
              margin: '8px 0 4px 0',
              lineHeight: 1.1,
            }}
          >
            {stats.total}
          </div>

          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            {stats.todayTotal} today · last 14 days
          </div>
        </div>

        {/* KPI 2: Potential matches */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={14} />
            </div>
            <span>Potential matches</span>
          </div>

          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#111827',
              margin: '8px 0 4px 0',
              lineHeight: 1.1,
            }}
          >
            {stats.potentialMatches}
          </div>

          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            {stats.hitRate}% hit rate · {stats.todayPotential} today
          </div>
        </div>

        {/* KPI 3: Cleared */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={14} />
            </div>
            <span>Cleared</span>
          </div>

          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#111827',
              margin: '8px 0 4px 0',
              lineHeight: 1.1,
            }}
          >
            {stats.cleared}
          </div>

          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            No match on any list entry
          </div>
        </div>

        {/* KPI 4: Pending review */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={14} />
            </div>
            <span>Pending review</span>
          </div>

          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#111827',
              margin: '8px 0 4px 0',
              lineHeight: 1.1,
            }}
          >
            {stats.pendingReview}
          </div>

          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            {stats.pendingReview > 0
              ? `Oldest open ${oldestPendingFormatted}`
              : 'All pending cases cleared'}
          </div>
        </div>
      </div>

      {/* 3. MIDDLE ROW: Stacked Column Chart (Left) & Needs Your Review (Right) */}
      <div
        className="dashboard-grid-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 1fr)',
          gap: '20px',
          width: '100%',
          alignItems: 'start',
        }}
      >
        {/* Screenings Per Day Stacked Bar Chart */}
        <StackedBarChart
          data={stats.perDay}
          totalScreenings={stats.total}
          totalPotential={stats.potentialMatches}
        />

        {/* Needs Your Review List */}
        <NeedsReviewList
          cases={cases}
          pendingCount={stats.pendingReview}
        />
      </div>

      {/* 4. BOTTOM ROW: Recent Cases Table (Left) & AI Insights Card (Right) */}
      <div
        className="dashboard-grid-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 1fr)',
          gap: '20px',
          width: '100%',
        }}
      >
        {/* Recent Cases */}
        <RecentCasesTable cases={cases} />

        {/* AI Insights Card */}
        <AiInsightsCard
          stats={stats}
          cases={cases}
        />
      </div>
    </div>
  );
};
