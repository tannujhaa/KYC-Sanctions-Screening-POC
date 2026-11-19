import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Info,
  Filter,
  RotateCcw,
  History,
} from 'lucide-react';
import { kycService } from '../services/kycService';
import { KYC_AuditLogService } from '../generated/services/KYC_AuditLogService';
import type { KYC_AuditLogRead } from '../generated/models/KYC_AuditLogModel';
import type { KycCase, AuditLogEntry } from '../types/kyc';

/**
 * Formats ISO date string to "18 Nov 2026, 10:42:05" matching screenshot.
 */
function formatAuditTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins}:${secs}`;
  } catch {
    return isoStr;
  }
}

/**
 * Formats ISO date string to "10:42" short time.
 */
function formatShortTime(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return '—';
  }
}

export const AuditTrailPage: React.FC = () => {
  const navigate = useNavigate();
  const { caseId: pathCaseId } = useParams<{ caseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Case ID: prefer query param ?caseId=, then route param /audit/:caseId
  const urlCaseId = searchParams.get('caseId') || pathCaseId || '';
  const [selectedCaseId, setSelectedCaseId] = useState<string>(urlCaseId);

  // View Mode: default to 'this_case' ONLY if a specific case was passed; otherwise default to 'all_cases'
  const [viewMode, setViewMode] = useState<'this_case' | 'all_cases'>(urlCaseId ? 'this_case' : 'all_cases');

  // Filters for 'all_cases' gallery
  const [caseFilter, setCaseFilter] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [caseData, setCaseData] = useState<KycCase | null>(null);
  const [allCases, setAllCases] = useState<KycCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync selectedCaseId & viewMode if url changes
  useEffect(() => {
    if (urlCaseId) {
      setSelectedCaseId(urlCaseId);
      setViewMode('this_case');
    }
  }, [urlCaseId]);

  // Load live case details and audit log records dynamically from SharePoint
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch live cases from SharePoint KYC_Cases list
        const cases = await kycService.getCases();
        setAllCases(cases);

        // Determine target case ID ONLY if explicitly requested (never auto-pick a previous case)
        const targetCaseId = selectedCaseId || urlCaseId || '';
        if (targetCaseId) {
          const current = cases.find((c) => c.caseId.toLowerCase() === targetCaseId.toLowerCase());
          setCaseData(current || null);
        } else {
          setCaseData(null);
        }

        // 2. Fetch live audit logs directly from SharePoint KYC_AuditLog list
        let auditRecords: AuditLogEntry[] = [];
        try {
          console.log('[AuditTrailPage] Fetching records via KYC_AuditLogService.getAll()...');
          const spResult = await KYC_AuditLogService.getAll();
          console.log('[AuditTrailPage] KYC_AuditLogService.getAll() response:', spResult);

          const items: KYC_AuditLogRead[] = Array.isArray(spResult?.data)
            ? spResult.data
            : Array.isArray((spResult?.data as any)?.value)
            ? (spResult.data as any).value
            : [];

          if (spResult && (spResult.success || items.length > 0)) {
            console.log(`[AuditTrailPage] Received ${items.length} records from SharePoint KYC_AuditLog.`);
            auditRecords = items.map((item: KYC_AuditLogRead) => {
              const performedBy =
                item.PerformedBy?.DisplayName ||
                item.PerformedBy?.Email ||
                item.Author?.DisplayName ||
                item.Author?.Email ||
                item['PerformedBy#Claims'] ||
                'System';

              const resolvedCaseId = (item.CaseID || (item.Title?.startsWith('KYC-') ? item.Title : '') || '').trim();
              let event = item.Title || 'Audit Log';
              if (event.startsWith('KYC-')) {
                event = item.ReviewerDecision ? 'Decision Recorded' : 'Screening Completed';
              }

              // Lookup matching case from live cases to enrich decision & comment
              const matchCase = cases.find((c) => c.caseId.toLowerCase() === resolvedCaseId.toLowerCase());
              let details = item.Details || item.ReviewerComments || 'Action recorded.';

              const isDecisionEvent =
                event.toLowerCase().includes('decision') ||
                Boolean(item.ReviewerDecision) ||
                (details && details.toLowerCase().includes('decision'));

              if (isDecisionEvent) {
                event = 'Decision Recorded';
                const dec = item.ReviewerDecision || matchCase?.reviewerDecision || 'Approved';
                const comm =
                  item.ReviewerComments ||
                  matchCase?.reviewerComment ||
                  (details.includes('Comment:') ? details.split('Comment:')[1]?.trim() : '');

                if (comm && comm !== 'No comment provided.') {
                  details = `Reviewer decision: ${dec}. Comment: ${comm}`;
                } else if (matchCase?.reviewerComment) {
                  details = `Reviewer decision: ${dec}. Comment: ${matchCase.reviewerComment}`;
                } else if (dec) {
                  details = `Reviewer decision: ${dec}. Comment: No comment provided.`;
                }
              }

              return {
                id: String(item.ID || Math.random()),
                caseId: resolvedCaseId,
                event: event as any,
                details,
                performedBy,
                timestamp: item.Timestamp || item.Created || new Date().toISOString(),
              };
            });
            auditRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          }
        } catch (spErr) {
          console.warn('[AuditTrailPage] Live SharePoint fetch failed or running standalone, falling back to service logs:', spErr);
        }

        // Only if SharePoint call failed standalone, fall back to service logs
        if (auditRecords.length === 0) {
          auditRecords = await kycService.getAuditLogs();
        }

        setLogs(auditRecords);
      } catch (err) {
        console.error('[AuditTrailPage] Failed to load audit trail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedCaseId]);

  // Logs filtered for "This case" view
  const thisCaseLogs = useMemo(() => {
    if (!selectedCaseId) return [];
    const sid = selectedCaseId.toLowerCase();
    return logs.filter((l) => l.caseId.toLowerCase() === sid || (l.details && l.details.toLowerCase().includes(sid)));
  }, [logs, selectedCaseId]);

  // Timeline entries for this case: uses live SharePoint audit logs, or dynamic case entries
  const displayThisCaseLogs: AuditLogEntry[] = useMemo(() => {
    let resultLogs: AuditLogEntry[] = [];

    if (thisCaseLogs.length > 0) {
      // Sort chronologically ascending for event timeline
      resultLogs = [...thisCaseLogs].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } else if (caseData) {
      // If no explicit audit rows found in KYC_AuditLog list yet, dynamically generate timeline nodes from live caseData
      const entries: AuditLogEntry[] = [
        {
          id: `create-${caseData.caseId}`,
          caseId: caseData.caseId,
          event: 'Case Created',
          details: `Case created for ${caseData.customerName} (${caseData.caseId}).`,
          performedBy: caseData.reviewer || 'System',
          timestamp: caseData.createdAt || caseData.checkedOn,
        },
        {
          id: `screen-${caseData.caseId}`,
          caseId: caseData.caseId,
          event: 'Screening Completed',
          details:
            (caseData.checkResult === 'Potential Match' || Boolean(caseData.matchedEntry && caseData.matchedEntry.toLowerCase() !== 'none' && caseData.matchedEntry.toLowerCase() !== 'null'))
              ? `Potential Match: ${caseData.matchReason || caseData.matchedEntry || 'Potential watchlist match detected.'}`
              : 'No Match: Clean screen. No sanctions hit confirmed by date of birth or nationality.',
          performedBy: 'System (screening flow)',
          timestamp: caseData.checkedOn || caseData.createdAt,
        },
      ];

      if (caseData.decidedOn || (caseData.reviewerDecision && caseData.reviewerDecision !== 'Pending review')) {
        entries.push({
          id: `decide-${caseData.caseId}`,
          caseId: caseData.caseId,
          event: 'Decision Recorded',
          details: `Reviewer decision: ${caseData.reviewerDecision || 'Approved'}. Comment: ${caseData.reviewerComment || 'Reviewer decision recorded.'}`,
          performedBy: caseData.reviewer || 'Reviewer',
          timestamp: caseData.decidedOn || caseData.checkedOn,
        });
      }

      resultLogs = entries;
    }

    // Enrich 'Decision Recorded' entries with live caseData reviewer decision & comment if missing or defaulted
    const enriched = resultLogs.map((item) => {
      if (item.event.toLowerCase().includes('decision')) {
        const comm = caseData?.reviewerComment;
        const dec = caseData?.reviewerDecision && caseData.reviewerDecision !== 'Pending review'
          ? caseData.reviewerDecision
          : '';

        if (comm && (item.details.includes('No comment provided') || !item.details.includes('Comment:'))) {
          const finalDec = dec || (item.details.includes(':') ? item.details.split(':')[0].replace(/Reviewer decision/i, '').trim() : '') || 'Approved';
          return {
            ...item,
            details: `Reviewer decision: ${finalDec}. Comment: ${comm}`,
          };
        }
      }
      return item;
    });

    // Deduplicate duplicate 'Decision Recorded' entries within a 5-minute window for the same case
    const deduplicated: AuditLogEntry[] = [];
    for (const log of enriched) {
      if (log.event.toLowerCase().includes('decision')) {
        const existingIdx = deduplicated.findIndex((existing) => {
          if (!existing.event.toLowerCase().includes('decision')) return false;
          return Math.abs(new Date(existing.timestamp).getTime() - new Date(log.timestamp).getTime()) < 300000;
        });

        if (existingIdx !== -1) {
          // Prefer entry that has an explicit human reviewer over empty/System
          const existing = deduplicated[existingIdx];
          const hasHuman = (p?: string) => p && p.toLowerCase() !== 'system' && p.trim() !== '';
          if (!hasHuman(existing.performedBy) && hasHuman(log.performedBy)) {
            deduplicated[existingIdx] = log;
          }
          continue;
        }
      }
      deduplicated.push(log);
    }

    return deduplicated;
  }, [thisCaseLogs, caseData]);

  // Logs filtered for "All cases" gallery / table view
  const filteredGalleryLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter by case
      if (caseFilter && caseFilter !== 'All') {
        if (!log.caseId.toLowerCase().includes(caseFilter.toLowerCase())) {
          return false;
        }
      }
      // Filter by event type
      if (eventFilter && eventFilter !== 'All') {
        if (log.event.toLowerCase() !== eventFilter.toLowerCase()) {
          return false;
        }
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDetails = log.details.toLowerCase().includes(q);
        const matchesAuthor = log.performedBy.toLowerCase().includes(q);
        const matchesCase = log.caseId.toLowerCase().includes(q);
        if (!matchesDetails && !matchesAuthor && !matchesCase) {
          return false;
        }
      }
      return true;
    });
  }, [logs, caseFilter, eventFilter, searchQuery]);

  // Distinct case IDs for dropdown filter
  const distinctCaseIds = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.caseId));
    allCases.forEach((c) => set.add(c.caseId));
    return Array.from(set).filter(Boolean).sort();
  }, [logs, allCases]);

  // Group filtered gallery logs by Case ID so each case has its own table with 'Open result' shown once
  const groupedCases = useMemo(() => {
    const map = new Map<string, { caseInfo?: KycCase; logs: AuditLogEntry[] }>();

    filteredGalleryLogs.forEach((log) => {
      const cid = log.caseId || 'Unassigned';
      if (!map.has(cid)) {
        const caseInfo = allCases.find((c) => c.caseId.toLowerCase() === cid.toLowerCase());
        map.set(cid, { caseInfo, logs: [] });
      }
      const existingLogs = map.get(cid)!.logs;

      // Deduplicate consecutive/duplicate 'Decision Recorded' entries within 5 mins
      if (log.event.toLowerCase().includes('decision')) {
        const dupIdx = existingLogs.findIndex((ex) => {
          if (!ex.event.toLowerCase().includes('decision')) return false;
          return Math.abs(new Date(ex.timestamp).getTime() - new Date(log.timestamp).getTime()) < 300000;
        });
        if (dupIdx !== -1) {
          const ex = existingLogs[dupIdx];
          const hasHuman = (p?: string) => p && p.toLowerCase() !== 'system' && p.trim() !== '';
          if (!hasHuman(ex.performedBy) && hasHuman(log.performedBy)) {
            existingLogs[dupIdx] = log;
          }
          return;
        }
      }

      existingLogs.push(log);
    });

    return Array.from(map.entries()).map(([caseId, data]) => ({
      caseId,
      caseInfo: data.caseInfo,
      logs: data.logs,
    }));
  }, [filteredGalleryLogs, allCases]);

  // Helper for timeline icon styling
  const renderEventIcon = (event: string) => {
    const norm = event.toLowerCase();
    if (norm.includes('create')) {
      return (
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#F3E8FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#831B84',
            flexShrink: 0,
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
        </div>
      );
    }
    if (norm.includes('screen')) {
      return (
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#DC2626',
            flexShrink: 0,
          }}
        >
          <Search size={14} strokeWidth={2.5} />
        </div>
      );
    }
    // Decision Recorded
    return (
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: '#FEF3C7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#B45309',
          flexShrink: 0,
        }}
      >
        <ArrowUpRight size={15} strokeWidth={2.5} />
      </div>
    );
  };

  const hasMatchedEntry = Boolean(
    caseData?.matchedEntry &&
    caseData.matchedEntry.trim() !== '' &&
    caseData.matchedEntry.toLowerCase() !== 'none' &&
    caseData.matchedEntry.toLowerCase() !== 'null' &&
    caseData.matchedEntry.toLowerCase() !== '—' &&
    caseData.matchedEntry.toLowerCase() !== '-'
  );
  const isPotentialMatch = caseData ? (caseData.checkResult === 'Potential Match' || hasMatchedEntry) : false;
  const reviewerDecision = caseData?.reviewerDecision || 'Pending review';

  return (
    <div
      style={{
        padding: '20px 24px 32px 24px',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#F9FAFB',
        minHeight: '100vh',
      }}
    >
      {/* 1. Breadcrumb */}
      <div
        style={{
          fontSize: '12px',
          color: '#6B7280',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          onClick={() => navigate('/cases')}
          style={{ cursor: 'pointer', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Cases
        </span>
        <span>/</span>
        {viewMode === 'this_case' && selectedCaseId && (
          <>
            <span
              onClick={() => navigate(`/result/${selectedCaseId}`)}
              style={{ cursor: 'pointer', color: '#831B84', fontWeight: 500 }}
            >
              {selectedCaseId}
            </span>
            <span>/</span>
          </>
        )}
        <span style={{ color: '#111827', fontWeight: 500 }}>Audit trail</span>
      </div>

      {/* 2. Page Header & View Toggle (matching screenshot) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Header with Back Button, Case ID, Customer Name, and Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/cases')}
            title="Back to Cases"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#831B84';
              e.currentTarget.style.borderColor = '#831B84';
              e.currentTarget.style.backgroundColor = '#FAF5FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.2px',
            }}
          >
            {viewMode === 'this_case' && selectedCaseId && caseData
              ? `${selectedCaseId}${caseData?.customerName ? ` · ${caseData.customerName}` : ''}`
              : 'Audit trail'}
          </h1>

          {/* Result Badge */}
          {viewMode === 'this_case' && selectedCaseId && caseData && (
            <span
              style={{
                backgroundColor: isPotentialMatch ? '#FEE2E2' : '#DCFCE7',
                color: isPotentialMatch ? '#DC2626' : '#15803D',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {isPotentialMatch ? 'Potential Match' : 'No Match'}
            </span>
          )}

          {/* Decision Badge */}
          {viewMode === 'this_case' && selectedCaseId && caseData && (
            <span
              style={{
                backgroundColor:
                  reviewerDecision === 'Escalated'
                    ? '#FEF3C7'
                    : reviewerDecision === 'Approved'
                    ? '#DCFCE7'
                    : reviewerDecision === 'Rejected'
                    ? '#FEE2E2'
                    : '#F3F4F6',
                color:
                  reviewerDecision === 'Escalated'
                    ? '#B45309'
                    : reviewerDecision === 'Approved'
                    ? '#15803D'
                    : reviewerDecision === 'Rejected'
                    ? '#DC2626'
                    : '#4B5563',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {reviewerDecision}
            </span>
          )}
        </div>

        {/* View Toggle: This case / All cases (matching top-right pill group) */}
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
            onClick={() => setViewMode('this_case')}
            style={{
              border: 'none',
              backgroundColor: viewMode === 'this_case' ? '#831B84' : 'transparent',
              color: viewMode === 'this_case' ? '#FFFFFF' : '#374151',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            This case
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all_cases')}
            style={{
              border: 'none',
              backgroundColor: viewMode === 'all_cases' ? '#831B84' : 'transparent',
              color: viewMode === 'all_cases' ? '#FFFFFF' : '#374151',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All cases
          </button>
        </div>
      </div>

      {/* 3. Main Content: 'This case' view vs 'All cases' gallery view */}
      {loading ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '13px',
          }}
        >
          Loading audit trail records...
        </div>
      ) : viewMode === 'this_case' ? (
        !selectedCaseId || !caseData || displayThisCaseLogs.length === 0 ? (
          /* Blank / Empty state when no entry has been made or no audits recorded */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '64px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FAF4FB',
                color: '#831B84',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <History size={28} strokeWidth={2} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              No audits recorded
            </h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#6B7280', maxWidth: '440px', lineHeight: 1.5 }}>
              No entry has been made yet. When customer screening or reviewer decisions are recorded, the audit trail for this case will appear here.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setViewMode('all_cases')}
                style={{
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                View all cases
              </button>
              <button
                type="button"
                onClick={() => navigate('/new-case')}
                style={{
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#831B84',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(131,27,132,0.25)',
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
        ) : (
          /* ================= THIS CASE VIEW (EXACT SCREENSHOT LAYOUT) ================= */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)',
              gap: '20px',
              alignItems: 'start',
            }}
          >
          {/* Left Column: Event timeline Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <h2
              style={{
                margin: '0 0 24px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Event timeline
            </h2>

            {/* Vertical Connected Timeline or Empty state */}
            {displayThisCaseLogs.length === 0 ? (
              <div style={{ padding: '36px 12px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                No audit events recorded for this case yet.
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {displayThisCaseLogs.map((item, index) => {
                  const isLast = index === displayThisCaseLogs.length - 1;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      position: 'relative',
                      paddingBottom: isLast ? '0' : '28px',
                    }}
                  >
                    {/* Vertical connecting line between icons */}
                    {!isLast && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '13px',
                          top: '28px',
                          bottom: '0',
                          width: '2px',
                          backgroundColor: '#E5E7EB',
                        }}
                      />
                    )}

                    {/* Left Event Icon */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {renderEventIcon(item.event)}
                    </div>

                    {/* Right Content */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: '#111827',
                          }}
                        >
                          {item.event}
                        </strong>
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#6B7280',
                            fontWeight: 400,
                          }}
                        >
                          {formatAuditTimestamp(item.timestamp)}
                        </span>
                      </div>

                      {/* Event Details */}
                      {item.event.toLowerCase().includes('decision') ? (
                        <div
                          style={{
                            margin: '6px 0 0 0',
                            padding: '10px 14px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            fontSize: '12.5px',
                            color: '#374151',
                            lineHeight: '1.5',
                          }}
                        >
                          {(() => {
                            const raw = item.details || '';
                            let dec = caseData?.reviewerDecision && caseData.reviewerDecision !== 'Pending review'
                              ? caseData.reviewerDecision
                              : '';
                            let comm = caseData?.reviewerComment || '';

                            if (!comm && raw.includes('Comment:')) {
                              const extracted = raw.split('Comment:')[1]?.trim();
                              if (extracted && extracted !== 'No comment provided.') comm = extracted;
                            }
                            if (!dec && raw.includes(':')) {
                              const candidate = raw.split(':')[0].replace(/Reviewer decision/i, '').trim();
                              if (candidate && candidate !== '.') dec = candidate;
                            }
                            if (!comm && raw.includes(':') && !raw.includes('Comment:')) {
                              comm = raw.split(':').slice(1).join(':').trim();
                            }

                            const finalDec = dec || 'Approved';
                            const finalComm = comm || caseData?.reviewerComment || 'Reviewer decision recorded.';

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 600, color: '#4B5563', fontSize: '12px' }}>Decision:</span>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: '11px',
                                      padding: '2px 8px',
                                      borderRadius: '9999px',
                                      backgroundColor:
                                        finalDec === 'Approved'
                                          ? '#DCFCE7'
                                          : finalDec === 'Rejected'
                                          ? '#FEE2E2'
                                          : '#FEF3C7',
                                      color:
                                        finalDec === 'Approved'
                                          ? '#15803D'
                                          : finalDec === 'Rejected'
                                          ? '#DC2626'
                                          : '#B45309',
                                    }}
                                  >
                                    {finalDec}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                  <span style={{ fontWeight: 600, color: '#4B5563', fontSize: '12px', flexShrink: 0 }}>Reviewer comment:</span>
                                  <span style={{ color: '#111827', fontWeight: 500 }}>
                                    {finalComm}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '12.5px',
                            color: '#374151',
                            lineHeight: '1.5',
                          }}
                        >
                          {item.details}
                        </p>
                      )}

                      {/* Author */}
                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '11.5px',
                          color: '#6B7280',
                        }}
                      >
                        by {item.performedBy}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          {/* Right Column: Case summary Card & Info Banner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Case Summary Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <h2
                style={{
                  margin: '0 0 18px 0',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Case summary
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <span style={{ color: '#6B7280' }}>Customer</span>
                  <strong style={{ color: '#111827' }}>{caseData?.customerName || '—'}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <span style={{ color: '#6B7280' }}>Matched</span>
                  <span style={{ color: '#111827' }}>
                    {caseData?.matchedEntry?.split('(')[0]?.trim() || (isPotentialMatch ? 'Potential Match' : 'None')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <span style={{ color: '#6B7280' }}>Reviewer</span>
                  <span style={{ color: '#111827' }}>{caseData?.reviewer || '—'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <span style={{ color: '#6B7280' }}>Checked</span>
                  <span style={{ color: '#111827' }}>{formatShortTime(caseData?.checkedOn)}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <span style={{ color: '#6B7280' }}>Decided</span>
                  <span style={{ color: '#111827' }}>
                    {caseData?.decidedOn ? formatShortTime(caseData.decidedOn) : '—'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <span style={{ color: '#6B7280' }}>Documents</span>
                  <span
                    onClick={() => {
                      const rawLink = caseData?.documentsLink;
                      const cid = selectedCaseId || caseData?.caseId || '';
                      const targetUrl =
                        rawLink && (rawLink.startsWith('http://') || rawLink.startsWith('https://'))
                          ? rawLink
                          : `https://xebiagroup.sharepoint.com/sites/QA/Shared%20Documents/${encodeURIComponent(cid)}`;
                      window.open(targetUrl, '_blank');
                    }}
                    style={{
                      color: '#831B84',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    title="Open case documents folder in SharePoint"
                  >
                    Case folder
                  </span>
                </div>
              </div>

              {/* Back to Result Button */}
              <button
                type="button"
                onClick={() => navigate(`/result/${selectedCaseId}`)}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <span>Back to result</span>
              </button>
            </div>

            {/* Read-Only Audit Info Callout Banner */}
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <Info size={16} color="#3B82F6" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#1E40AF', lineHeight: '1.45' }}>
                Audit entries are written only by server-side flows. Reviewers have read-only access to this log.
              </span>
            </div>
          </div>
        </div>
        )
      ) : (
        /* ================= ALL CASES GALLERY / TABLE VIEW ================= */
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {/* Gallery Filters Bar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            {/* Filter by Case ID Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="#6B7280" />
              <select
                value={caseFilter}
                onChange={(e) => setCaseFilter(e.target.value)}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Cases ({distinctCaseIds.length})</option>
                {distinctCaseIds.map((cid) => (
                  <option key={cid} value={cid}>
                    {cid}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Event Type Dropdown */}
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              style={{
                height: '36px',
                padding: '0 12px',
                fontSize: '13px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                color: '#111827',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Event Types</option>
              <option value="Case Created">Case Created</option>
              <option value="Screening Completed">Screening Completed</option>
              <option value="Decision Recorded">Decision Recorded</option>
            </select>

            {/* Search Query Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                }}
              />
              <input
                type="text"
                placeholder="Search details or reviewer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  paddingLeft: '34px',
                  paddingRight: '12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Reset Filters Button */}
            {(caseFilter || eventFilter !== 'All' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setCaseFilter('');
                  setEventFilter('All');
                  setSearchQuery('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#831B84',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 10px',
                }}
              >
                <RotateCcw size={13} />
                <span>Reset filters</span>
              </button>
            )}

            {/* Record count pill */}
            <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: 'auto' }}>
              Showing <strong>{filteredGalleryLogs.length}</strong> records across <strong>{groupedCases.length}</strong> {groupedCases.length === 1 ? 'case' : 'cases'}
            </span>
          </div>

          {/* Grouped Audit Logs: A dedicated table per case, with 'Open result' shown once */}
          {groupedCases.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6B7280',
                fontSize: '13px',
              }}
            >
              No audit records matching the selected filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {groupedCases.map(({ caseId, caseInfo, logs: caseLogs }) => {
                const hasMatched = Boolean(
                  caseInfo?.matchedEntry &&
                  caseInfo.matchedEntry.trim() !== '' &&
                  caseInfo.matchedEntry.toLowerCase() !== 'none' &&
                  caseInfo.matchedEntry.toLowerCase() !== 'null' &&
                  caseInfo.matchedEntry.toLowerCase() !== '—' &&
                  caseInfo.matchedEntry.toLowerCase() !== '-'
                );
                const isPotential = (caseInfo?.checkResult === 'Potential Match') || hasMatched;
                const decision = caseInfo?.reviewerDecision;

                return (
                  <div
                    key={caseId}
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    {/* Case Header: Case ID, Customer, Status, and View Result button ONCE */}
                    <div
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Case ID badge */}
                        <span
                          onClick={() => {
                            setSelectedCaseId(caseId);
                            setSearchParams({ caseId });
                            setViewMode('this_case');
                          }}
                          title="Click to view detailed timeline"
                          style={{
                            backgroundColor: '#FAF4FB',
                            color: '#831B84',
                            border: '1px solid #EDE0EE',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            letterSpacing: '-0.2px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE0EE')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAF4FB')}
                        >
                          {caseId}
                        </span>

                        {/* Customer Name */}
                        {caseInfo?.customerName && (
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                            {caseInfo.customerName}
                          </span>
                        )}

                        {/* Result Badge */}
                        {caseInfo?.checkResult && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: isPotential ? '#FEE2E2' : '#DCFCE7',
                              color: isPotential ? '#DC2626' : '#15803D',
                            }}
                          >
                            {isPotential ? 'Potential Match' : 'No Match'}
                          </span>
                        )}

                        {/* Decision Badge */}
                        {decision && decision !== 'Pending review' && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor:
                                decision === 'Approved' ? '#DCFCE7' : decision === 'Rejected' ? '#FEE2E2' : '#FEF3C7',
                              color:
                                decision === 'Approved' ? '#15803D' : decision === 'Rejected' ? '#DC2626' : '#B45309',
                            }}
                          >
                            {decision}
                          </span>
                        )}

                        {/* Event count */}
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>
                          ({caseLogs.length} {caseLogs.length === 1 ? 'event' : 'events'})
                        </span>
                      </div>

                      {/* Right: Open result button (shown ONCE for the whole case) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCaseId(caseId);
                            setSearchParams({ caseId });
                            setViewMode('this_case');
                          }}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #D1D5DB',
                            color: '#374151',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
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
                          Timeline
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/result/${encodeURIComponent(caseId)}`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #D1D5DB',
                            color: '#831B84',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FAF4FB';
                            e.currentTarget.style.borderColor = '#831B84';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#D1D5DB';
                          }}
                        >
                          <span>Open result</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Table for all events of this case */}
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '13px',
                          textAlign: 'left',
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              borderBottom: '1px solid #E5E7EB',
                              color: '#6B7280',
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            <th style={{ padding: '10px 16px', width: '220px' }}>EVENT</th>
                            <th style={{ padding: '10px 16px' }}>DETAILS</th>
                            <th style={{ padding: '10px 16px', width: '160px' }}>PERFORMED BY</th>
                            <th style={{ padding: '10px 16px', width: '180px', textAlign: 'right' }}>TIMESTAMP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {caseLogs.map((log) => (
                            <tr
                              key={log.id}
                              style={{
                                borderBottom: '1px solid #F3F4F6',
                                transition: 'background-color 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {/* Event with Icon */}
                              <td style={{ padding: '12px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {renderEventIcon(log.event)}
                                  <strong style={{ color: '#111827', fontSize: '13px' }}>{log.event}</strong>
                                </div>
                              </td>

                              {/* Details */}
                              <td
                                style={{
                                  padding: '12px 16px',
                                  verticalAlign: 'top',
                                  color: '#374151',
                                  lineHeight: '1.45',
                                }}
                              >
                                {log.details}
                              </td>

                              {/* Performed By */}
                              <td
                                style={{
                                  padding: '12px 16px',
                                  verticalAlign: 'top',
                                  color: '#4B5563',
                                  fontSize: '12.5px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {log.performedBy}
                              </td>

                              {/* Timestamp */}
                              <td
                                style={{
                                  padding: '12px 16px',
                                  verticalAlign: 'top',
                                  color: '#6B7280',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap',
                                  textAlign: 'right',
                                }}
                              >
                                {formatAuditTimestamp(log.timestamp)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
