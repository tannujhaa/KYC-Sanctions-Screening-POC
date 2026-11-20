import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MoreVertical,
  ArrowUpRight,
  History,
  RotateCcw,
} from 'lucide-react';
import { kycService, parseDocumentValidationDetails } from '../services/kycService';
import { KYC_CasesService } from '../generated/services/KYC_CasesService';
import type { KYC_CasesRead } from '../generated/models/KYC_CasesModel';
import type { KycCase, CheckResult, ReviewerDecision } from '../types/kyc';

/**
 * Format ISO date string into "18 Nov 2026, 10:42" matching reference UI.
 */
function formatCheckedOn(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
}

/**
 * Map SharePoint KYC_CasesRead record into application KycCase model.
 */
function mapSharePointCase(item: KYC_CasesRead): KycCase {
  const caseId = item.Title || (item.ID ? `KYC-${String(item.ID).padStart(4, '0')}` : `KYC-${Date.now().toString().slice(-4)}`);
  const rawResult =
    (item.CheckResult as any)?.Value ||
    (typeof item.CheckResult === 'string' ? item.CheckResult : '') ||
    '';
  const rawMatchedEntry = (item.MatchedEntry || '').trim();
  const hasMatchedEntry = Boolean(
    rawMatchedEntry &&
    rawMatchedEntry.toLowerCase() !== 'none' &&
    rawMatchedEntry.toLowerCase() !== 'null' &&
    rawMatchedEntry.toLowerCase() !== '—' &&
    rawMatchedEntry.toLowerCase() !== '-'
  );
  const rawReason = (item.MatchReason || '').toLowerCase();
  const hasMatchReason = Boolean(
    rawReason &&
    !rawReason.includes('no match') &&
    (rawReason.includes('matched') || rawReason.includes('hit') || rawReason.includes('sanction') || rawReason.includes('embargo') || rawReason.includes('flagged'))
  );

  const isPotMatch =
    rawResult.toLowerCase().includes('potential') ||
    (rawResult.toLowerCase().includes('match') && !rawResult.toLowerCase().includes('no')) ||
    hasMatchedEntry ||
    hasMatchReason;

  const checkResult: CheckResult = isPotMatch ? 'Potential Match' : 'No Match';

  let reviewerDecision: ReviewerDecision = 'Pending review';
  if (item.ReviewerDecision) {
    const rd = item.ReviewerDecision.toLowerCase();
    if (rd.includes('approved') || rd === 'approve') reviewerDecision = 'Approved';
    else if (rd.includes('rejected') || rd === 'reject') reviewerDecision = 'Rejected';
    else if (rd.includes('escalated') || rd === 'escalate') reviewerDecision = 'Escalated';
  }

  const reviewer =
    item.Reviewer?.DisplayName ||
    item.Reviewer?.Email ||
    item.Author?.DisplayName ||
    item.Author?.Email ||
    item['Reviewer#Claims'] ||
    null;

  const rawDocStatus =
    (item as any).DocumentValidationStatus ||
    (item as any).DocumentStatus ||
    (item as any)['Document status'] ||
    (item as any)['Document_x0020_status'] ||
    (item as any)['Document_x0020_Status'] ||
    null;

  const rawDocDetails =
    (item as any).DocumentValidationDetails ||
    (item as any).Validation ||
    (item as any)['validation'] ||
    (item as any)['Validation'] ||
    (item as any)['Validation Details'] ||
    (item as any)['ValidationDetails'] ||
    null;

  const rawDocDate =
    (item as any).DocumentValidationDate ||
    (item as any).DatetimeOfValidation ||
    (item as any)['datetime of validaton'] ||
    (item as any)['Datetime of validation'] ||
    (item as any)['Datetime_x0020_of_x0020_validaton'] ||
    null;

  const parsedDocDetails = parseDocumentValidationDetails(rawDocDetails);
  const docStatus = (rawDocStatus || parsedDocDetails?.overallValidationStatus || null) as any;

  return {
    caseId,
    customerName: item.CustomerName || item.Title || 'Unknown Customer',
    dob: item.DOB || '',
    nationality: item.Nationality || '',
    address: item.Address || '',
    checkResult,
    matchedEntry: item.MatchedEntry || null,
    matchReason: item.MatchReason || null,
    reviewerDecision,
    reviewerComment: item.ReviewerComment || null,
    reviewer,
    checkedOn: item.CheckedOn || item.Created || new Date().toISOString(),
    decidedOn: item.DecidedOn || null,
    documentsLink: item.DocumentsLink || `/documents/${caseId}`,
    documentNames: [],
    documentValidationStatus: docStatus,
    documentValidationDetails: parsedDocDetails,
    documentValidationDate: rawDocDate,
    createdAt: item.Created || item.CheckedOn || new Date().toISOString(),
  };
}

export const ScreeningCasesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [cases, setCases] = useState<KycCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'All' | 'Potential Match' | 'No Match'>('All');
  const [openMenuCaseId, setOpenMenuCaseId] = useState<string | null>(null);

  // Sync initial search or status filters from URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
    }
    const status = searchParams.get('status');
    if (status === 'pending') {
      // Keep All or let search handle
    }
  }, [searchParams]);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuCaseId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch records dynamically using KYC_CasesModel.ts & KYC_CasesService
  useEffect(() => {
    let isMounted = true;

    async function loadCases() {
      setLoading(true);
      try {
        console.log('[Cases] Fetching records using KYC_CasesService.getAll()...');
        const spResult = await KYC_CasesService.getAll();
        console.log('[Cases] KYC_CasesService.getAll() response:', spResult);

        const items: KYC_CasesRead[] = Array.isArray(spResult?.data)
          ? spResult.data
          : Array.isArray((spResult?.data as any)?.value)
          ? (spResult.data as any).value
          : [];

        if (spResult && (spResult.success || items.length > 0)) {
          console.log(`[Cases] Successfully fetched ${items.length} records from SharePoint KYC_Cases.`);
          const spCases = items.map(mapSharePointCase);
          // Sort newest first
          spCases.sort((a, b) => new Date(b.createdAt || b.checkedOn).getTime() - new Date(a.createdAt || a.checkedOn).getTime());

          if (isMounted) {
            setCases(spCases);
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.warn('[Cases] KYC_CasesService fetch failed or standalone, falling back to kycService:', err);
      }

      // Standalone fallback only if completely failed to reach SharePoint
      const all = await kycService.getCases();
      if (isMounted) {
        setCases(all);
        setLoading(false);
      }
    }

    loadCases();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter cases based on search input and active pill tab
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const isPot =
        c.checkResult === 'Potential Match' ||
        Boolean(
          c.matchedEntry &&
          c.matchedEntry.trim() !== '' &&
          c.matchedEntry.toLowerCase() !== 'none' &&
          c.matchedEntry.toLowerCase() !== 'null' &&
          c.matchedEntry.toLowerCase() !== '—' &&
          c.matchedEntry.toLowerCase() !== '-'
        );

      // Tab filter
      if (activeFilterTab === 'Potential Match' && !isPot) {
        return false;
      }
      if (activeFilterTab === 'No Match' && isPot) {
        return false;
      }

      // Search query filter (matches Case ID, Customer Name, or Nationality)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = c.caseId.toLowerCase().includes(q);
        const matchesName = c.customerName.toLowerCase().includes(q);
        const matchesNationality = c.nationality.toLowerCase().includes(q);
        return matchesId || matchesName || matchesNationality;
      }

      return true;
    });
  }, [cases, activeFilterTab, searchQuery]);

  return (
    <div
      style={{
        padding: '24px 32px 48px 32px',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#F9FAFB',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* 1. Page Header matching reference */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontSize: '26px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.02em',
            }}
          >
            Cases
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#6B7280',
            }}
          >
            All screened customers, newest first.
          </p>
        </div>

        {/* + New Case Button */}
        <button
          onClick={() => navigate('/new-case')}
          style={{
            backgroundColor: '#831B84',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(131, 27, 132, 0.2)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6e1470')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#831B84')}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New case</span>
        </button>
      </div>

      {/* 2. Main Content Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Filter & Search Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Search input and Filter tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={16}
                color="#9CA3AF"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or case ID"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: '13px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#831B84')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* Pill Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveFilterTab('All')}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: activeFilterTab === 'All' ? 600 : 500,
                  color: activeFilterTab === 'All' ? '#111827' : '#6B7280',
                  backgroundColor: activeFilterTab === 'All' ? '#FFFFFF' : 'transparent',
                  border: activeFilterTab === 'All' ? '1px solid #D1D5DB' : '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: activeFilterTab === 'All' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTab('Potential Match')}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: activeFilterTab === 'Potential Match' ? 600 : 500,
                  color: activeFilterTab === 'Potential Match' ? '#DC2626' : '#6B7280',
                  backgroundColor: activeFilterTab === 'Potential Match' ? '#FEF2F2' : 'transparent',
                  border: activeFilterTab === 'Potential Match' ? '1px solid #FECACA' : '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Potential Match
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTab('No Match')}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: activeFilterTab === 'No Match' ? 600 : 500,
                  color: activeFilterTab === 'No Match' ? '#15803D' : '#6B7280',
                  backgroundColor: activeFilterTab === 'No Match' ? '#F0FDF4' : 'transparent',
                  border: activeFilterTab === 'No Match' ? '1px solid #BBF7D0' : '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                No Match
              </button>
            </div>
          </div>

          {/* Right: Cases count */}
          <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
            {filteredCases.length} {filteredCases.length === 1 ? 'case' : 'cases'}
          </div>
        </div>

        {/* 3. Table or Loading State */}
        {loading ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '13px',
            }}
          >
            Loading cases...
          </div>
        ) : filteredCases.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '13px',
            }}
          >
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
              No cases found matching your criteria.
            </p>
            {(searchQuery || activeFilterTab !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilterTab('All');
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#4B5563',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={13} />
                <span>Reset filters</span>
              </button>
            )}
          </div>
        ) : (
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
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>CASE ID</th>
                  <th style={{ padding: '12px 16px' }}>CUSTOMER</th>
                  <th style={{ padding: '12px 16px' }}>NATIONALITY</th>
                  <th style={{ padding: '12px 16px' }}>RESULT</th>
                  <th style={{ padding: '12px 16px' }}>DECISION</th>
                  <th style={{ padding: '12px 16px' }}>CHECKED ON</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const isPotential =
                    c.checkResult === 'Potential Match' ||
                    Boolean(
                      c.matchedEntry &&
                      c.matchedEntry.trim() !== '' &&
                      c.matchedEntry.toLowerCase() !== 'none' &&
                      c.matchedEntry.toLowerCase() !== 'null' &&
                      c.matchedEntry.toLowerCase() !== '—' &&
                      c.matchedEntry.toLowerCase() !== '-'
                    );

                  // Format decision label and styling
                  let decisionLabel = 'Pending';
                  let decisionBg = '#F3F4F6';
                  let decisionColor = '#4B5563';

                  if (c.reviewerDecision === 'Escalated') {
                    decisionLabel = 'Escalated';
                    decisionBg = '#FEF3C7';
                    decisionColor = '#B45309';
                  } else if (c.reviewerDecision === 'Approved') {
                    decisionLabel = 'Approved';
                    decisionBg = '#DCFCE7';
                    decisionColor = '#15803D';
                  } else if (c.reviewerDecision === 'Rejected') {
                    decisionLabel = 'Rejected';
                    decisionBg = '#FEE2E2';
                    decisionColor = '#DC2626';
                  }

                  const isMenuOpen = openMenuCaseId === c.caseId;

                  return (
                    <tr
                      key={c.caseId}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* 1. CASE ID (Bold Purple, Clickable) */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          onClick={() => navigate(`/result/${encodeURIComponent(c.caseId)}`)}
                          style={{
                            color: '#831B84',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {c.caseId}
                        </span>
                      </td>

                      {/* 2. CUSTOMER */}
                      <td style={{ padding: '14px 16px', color: '#111827', fontWeight: 500 }}>
                        {c.customerName}
                      </td>

                      {/* 3. NATIONALITY */}
                      <td style={{ padding: '14px 16px', color: '#4B5563' }}>
                        {c.nationality || '—'}
                      </td>

                      {/* 4. RESULT */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: isPotential ? '#FEE2E2' : '#DCFCE7',
                            color: isPotential ? '#DC2626' : '#15803D',
                            display: 'inline-block',
                          }}
                        >
                          {isPotential ? 'Potential Match' : 'No Match'}
                        </span>
                      </td>

                      {/* 5. DECISION */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: decisionBg,
                            color: decisionColor,
                            display: 'inline-block',
                          }}
                        >
                          {decisionLabel}
                        </span>
                      </td>

                      {/* 6. CHECKED ON */}
                      <td style={{ padding: '14px 16px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                        {formatCheckedOn(c.checkedOn || c.createdAt)}
                      </td>

                      {/* 7. ACTION (3-dots menu with 'View result' and 'View audit') */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuCaseId(isMenuOpen ? null : c.caseId);
                            }}
                            title="Actions"
                            style={{
                              background: isMenuOpen ? '#F3F4F6' : 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              color: isMenuOpen ? '#111827' : '#6B7280',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                            onMouseLeave={(e) => {
                              if (!isMenuOpen) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown Popover */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 'calc(100% + 4px)',
                                zIndex: 100,
                                backgroundColor: '#FFFFFF',
                                borderRadius: '8px',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                minWidth: '140px',
                                padding: '4px',
                                textAlign: 'left',
                              }}
                            >
                              {/* Option 1: View result */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuCaseId(null);
                                  navigate(`/result/${encodeURIComponent(c.caseId)}`);
                                }}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  color: '#111827',
                                  background: 'none',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#FAF4FB';
                                  e.currentTarget.style.color = '#831B84';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.color = '#111827';
                                }}
                              >
                                <ArrowUpRight size={14} color="#831B84" />
                                <span>View result</span>
                              </button>

                              {/* Option 2: View audit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuCaseId(null);
                                  navigate(`/audit?caseId=${encodeURIComponent(c.caseId)}`);
                                }}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  color: '#111827',
                                  background: 'none',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#FAF4FB';
                                  e.currentTarget.style.color = '#831B84';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.color = '#111827';
                                }}
                              >
                                <History size={14} color="#831B84" />
                                <span>View audit</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
