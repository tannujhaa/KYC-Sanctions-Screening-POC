import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  History,
  CheckCircle2,
  Check,
  X,
  ArrowUpRight,
  ArrowLeft,
  Info,
  FolderOpen,
} from 'lucide-react';
import {
  kycService,
  getCurrentUserEmail,
  normalizeDobToYmd,
  MOCK_SANCTIONS_LIST,
  extractCustomerFromDocDetails,
  detectScreeningMethod,
  extractDocumentNamesFromDocDetails,
} from '../services/kycService';
import type { KycCase, ScreeningMethod } from '../types/kyc';
import { DocumentValidationSection, safeRenderText } from '../components/screening/DocumentValidationSection';

export const ScreeningResultPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [caseData, setCaseData] = useState<KycCase | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<'Approved' | 'Rejected' | 'Escalated'>('Approved');
  const [comment, setComment] = useState('');
  const [isDecisionRecorded, setIsDecisionRecorded] = useState(false);
  const [decidedOnTime, setDecidedOnTime] = useState('18 Nov 2026, 10:45');
  const [activeReviewer, setActiveReviewer] = useState('Demo Reviewer');
  const [loading, setLoading] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);

  useEffect(() => {
    async function initCase() {
      setLoading(true);
      try {
        const email = await getCurrentUserEmail();
        if (email && email !== 'demo.reviewer@xebia.com') {
          setActiveReviewer(email);
        }

        if (caseId) {
          let found = await kycService.getCaseById(caseId);
          const stateResult = (location.state as any)?.screeningResult;
          if (!found && stateResult && stateResult.caseId === caseId) {
            found = stateResult as KycCase;
          } else if (found && stateResult && stateResult.caseId === caseId) {
            if (stateResult.customerName && (!found.customerName || found.customerName.startsWith('KYC-') || found.customerName === 'Not available')) {
              found.customerName = stateResult.customerName;
            }
            if (stateResult.nationality && (!found.nationality || found.nationality === 'Not available')) {
              found.nationality = stateResult.nationality;
            }
            if (stateResult.dob && (!found.dob || found.dob === 'Not available')) {
              found.dob = stateResult.dob;
            }
            if (stateResult.address && (!found.address || found.address === 'Not available')) {
              found.address = stateResult.address;
            }
            if (stateResult.documentValidationStatus && !found.documentValidationStatus) {
              found.documentValidationStatus = stateResult.documentValidationStatus;
            }
            if (stateResult.documentValidationDetails && !found.documentValidationDetails) {
              found.documentValidationDetails = stateResult.documentValidationDetails;
            }
            if (stateResult.screeningMethod && !found.screeningMethod) {
              found.screeningMethod = stateResult.screeningMethod;
            }
            if (stateResult.documentNames && stateResult.documentNames.length > 0 && (!found.documentNames || found.documentNames.length === 0)) {
              found.documentNames = stateResult.documentNames;
            }
            if (stateResult.documents && stateResult.documents.length > 0 && (!found.documents || found.documents.length === 0)) {
              found.documents = stateResult.documents;
            }
          }

          if (found) {
            setCaseData(found);
            const hasMatched = Boolean(
              found.matchedEntry &&
              found.matchedEntry.trim() !== '' &&
              found.matchedEntry.toLowerCase() !== 'none' &&
              found.matchedEntry.toLowerCase() !== 'null' &&
              found.matchedEntry.toLowerCase() !== '—' &&
              found.matchedEntry.toLowerCase() !== '-'
            );
            const isPotMatch = found.checkResult === 'Potential Match' || hasMatched;

            // If the case already has a recorded decision (other than 'Pending review')
            if (found.reviewerDecision && found.reviewerDecision !== 'Pending review') {
              setIsDecisionRecorded(true);
              setSelectedDecision(found.reviewerDecision as 'Approved' | 'Rejected' | 'Escalated');
              if (found.reviewerComment) setComment(found.reviewerComment);
              setDecidedOnTime(found.decidedOn ? new Date(found.decidedOn).toLocaleString() : 'Recorded');
            } else {
              // Case was newly screened (whether Green or Red):
              // Show interactive reviewer decision section so reviewer can select Approve/Reject/Escalate and add comments
              setIsDecisionRecorded(false);
              setSelectedDecision(isPotMatch ? 'Escalated' : 'Approved');
              if (found.reviewerComment) {
                setComment(found.reviewerComment);
              } else {
                setComment('');
              }
            }
          }
        }
      } catch (err) {
        console.error('[ScreeningResultPage] Error initializing case:', err);
      } finally {
        setLoading(false);
      }
    }

    initCase();
  }, [caseId]);

  const hasMatchedEntry = Boolean(
    caseData?.matchedEntry &&
    caseData.matchedEntry.trim() !== '' &&
    caseData.matchedEntry.toLowerCase() !== 'none' &&
    caseData.matchedEntry.toLowerCase() !== 'null' &&
    caseData.matchedEntry.toLowerCase() !== '—' &&
    caseData.matchedEntry.toLowerCase() !== '-'
  );
  const isPotentialMatch = caseData ? (caseData.checkResult === 'Potential Match' || hasMatchedEntry) : false;
  const currentCaseId = caseData?.caseId || caseId || 'KYC-20261118-194444';

  // Screening Method Detection
  const stateResult = (location.state as any)?.screeningResult;
  const stateMethod: ScreeningMethod | undefined =
    (location.state as any)?.screeningMethod || stateResult?.screeningMethod;

  const screeningMethod: ScreeningMethod = detectScreeningMethod(caseData, stateMethod);
  const isDocumentUpload = screeningMethod === 'documents' || screeningMethod === 'document';

  // Customer Data (dynamically uses live case data from SharePoint and OCR document extraction)
  const extractedCustomer = React.useMemo(() => {
    return extractCustomerFromDocDetails(caseData?.documentValidationDetails);
  }, [caseData?.documentValidationDetails]);

  // Extract document names from DocumentValidationDetails
  const extractedDocNames = React.useMemo(() => {
    return extractDocumentNamesFromDocDetails(caseData?.documentValidationDetails);
  }, [caseData?.documentValidationDetails]);

  // Compute total document count across all available sources:
  // 1. caseData.documentNames
  // 2. extractedDocNames from documentValidationDetails
  // 3. caseData.documents
  // 4. stateResult.documents or stateResult.documentNames from navigation state
  const resolvedDocCount = React.useMemo(() => {
    if (caseData?.documentNames && caseData.documentNames.length > 0) {
      return caseData.documentNames.length;
    }
    if (extractedDocNames.length > 0) {
      return extractedDocNames.length;
    }
    if (caseData?.documents && caseData.documents.length > 0) {
      return caseData.documents.length;
    }
    const stateDocs = (location.state as any)?.documents || (location.state as any)?.screeningResult?.documents;
    if (Array.isArray(stateDocs) && stateDocs.length > 0) {
      return stateDocs.length;
    }
    const stateDocNames = (location.state as any)?.documentNames || (location.state as any)?.screeningResult?.documentNames;
    if (Array.isArray(stateDocNames) && stateDocNames.length > 0) {
      return stateDocNames.length;
    }
    // For Document Upload cases, at least 1 document was uploaded
    if (isDocumentUpload) {
      return 1;
    }
    return 0;
  }, [caseData, extractedDocNames, location.state, isDocumentUpload]);

  const rawCustName = (caseData?.customerName || '').trim();
  const isCustNameCaseId =
    !rawCustName ||
    rawCustName.startsWith('KYC-') ||
    (currentCaseId && rawCustName.toLowerCase() === currentCaseId.toLowerCase()) ||
    rawCustName === 'Unknown Customer';

  // For Document Upload cases: customer information must come from extracted values saved in SharePoint,
  // not from manual form values or the Case ID. If an extracted field is empty, display "Not available".
  const resolvedCustomerName = isDocumentUpload
    ? (extractedCustomer.name || (!isCustNameCaseId && rawCustName && rawCustName !== 'Not available' ? rawCustName : '') || 'Not available')
    : (!isCustNameCaseId && rawCustName && rawCustName !== 'Not available' ? rawCustName : 'Not available');

  const resolvedDob = isDocumentUpload
    ? (extractedCustomer.dob || (caseData?.dob && caseData.dob !== 'Not available' && caseData.dob !== '—' ? caseData.dob : '') || 'Not available')
    : (caseData?.dob && caseData.dob !== 'Not available' && caseData.dob !== '—' ? caseData.dob : 'Not available');

  const rawNationality = (caseData?.nationality || '').trim();
  const resolvedNationality = isDocumentUpload
    ? (extractedCustomer.nationality || (rawNationality && rawNationality !== 'Not available' && rawNationality !== '—' ? rawNationality : '') || 'Not available')
    : (rawNationality && rawNationality !== 'Not available' && rawNationality !== '—' ? rawNationality : 'Not available');

  const rawAddress = (caseData?.address || '').trim();
  const resolvedAddress = isDocumentUpload
    ? (extractedCustomer.address || (rawAddress && rawAddress !== 'Not available' && rawAddress !== '—' ? rawAddress : '') || 'Not available')
    : (rawAddress && rawAddress !== 'Not available' && rawAddress !== '—' ? rawAddress : 'Not available');

  const customer = {
    name: safeRenderText(resolvedCustomerName, 'Not available'),
    dob: normalizeDobToYmd(safeRenderText(resolvedDob, '')),
    nationality: safeRenderText(resolvedNationality, 'Not available'),
    address: safeRenderText(resolvedAddress, 'Not available'),
    docCount: resolvedDocCount,
    checkedOn: caseData?.checkedOn
      ? (() => {
          try {
            const raw = safeRenderText(caseData.checkedOn);
            const d = new Date(raw);
            return isNaN(d.getTime())
              ? raw
              : d.toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
          } catch {
            return safeRenderText(caseData.checkedOn);
          }
        })()
      : '—',
  };

  // Lookup matched sanctions entry from MOCK_SANCTIONS_LIST
  const matchedSanctionsEntry = MOCK_SANCTIONS_LIST.find((entry) => {
    if (!caseData?.matchedEntry) return false;
    const normMatched = caseData.matchedEntry.toLowerCase();
    return (
      normMatched.includes(entry.fullName.toLowerCase()) ||
      normMatched.includes(entry.id.toLowerCase()) ||
      entry.aliases.some((a) => normMatched.includes(a.toLowerCase()))
    );
  });

  // Matched Entry Data (for Potential Match)
  const matchedEntry = {
    fullName:
      matchedSanctionsEntry?.fullName ||
      caseData?.matchedEntry?.split('(')[0]?.trim() ||
      caseData?.matchedEntry ||
      'Sanctions Match',
    aliases:
      matchedSanctionsEntry?.aliases.join(', ') ||
      caseData?.matchedEntry ||
      '—',
    dob: normalizeDobToYmd(matchedSanctionsEntry?.dob || caseData?.dob || ''),
    nationality: matchedSanctionsEntry?.nationality || caseData?.nationality || '—',
    listedReason: matchedSanctionsEntry?.reason || caseData?.matchReason || 'Listed on sanctions watchlist',
  };

  const isNameExactMatch =
    Boolean(customer.name && matchedEntry.fullName) &&
    customer.name.trim().toLowerCase() === matchedEntry.fullName.trim().toLowerCase();

  const isDobMatch =
    Boolean(customer.dob && matchedEntry.dob && customer.dob !== '—' && matchedEntry.dob !== '—') &&
    normalizeDobToYmd(customer.dob) === normalizeDobToYmd(matchedEntry.dob);

  const isNatMatch =
    Boolean(customer.nationality && matchedEntry.nationality && customer.nationality !== '—' && matchedEntry.nationality !== '—') &&
    customer.nationality.trim().toLowerCase() === matchedEntry.nationality.trim().toLowerCase();

  // Record Decision Handler: stores locally and invokes KYC_RecordDecisionService & KYC_ScreenCustomerService
  const handleRecordDecision = async () => {
    if (savingDecision) return;
    setSavingDecision(true);

    try {
      const email = activeReviewer || (await getCurrentUserEmail());
      const nowStr = new Date().toLocaleString();
      const targetCaseId = caseData?.caseId || caseId || currentCaseId;

      console.log(`[ScreeningResultPage] Recording reviewer decision:`, {
        targetCaseId,
        decision: selectedDecision,
        comment,
        reviewer: email,
      });

      const updated = await kycService.recordDecision(
        targetCaseId,
        selectedDecision,
        comment,
        email,
        {
          customerName: customer.name,
          dob: normalizeDobToYmd(customer.dob),
          nationality: customer.nationality,
          address: customer.address,
          documents: caseData?.documents,
        }
      );

      if (updated) {
        setCaseData((prev) => ({
          ...prev,
          ...updated,
          // CRITICAL: Ensure checkResult and matchedEntry are NEVER wiped or downgraded by recordDecision!
          checkResult: (prev?.checkResult === 'Potential Match' || isPotentialMatch) ? 'Potential Match' : updated.checkResult,
          matchedEntry: prev?.matchedEntry || updated.matchedEntry,
          matchReason: prev?.matchReason || updated.matchReason,
        }));
      }

      setDecidedOnTime(nowStr);
      setIsDecisionRecorded(true);
    } catch (err) {
      console.error('[ScreeningResultPage] Error recording decision:', err);
    } finally {
      setSavingDecision(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', color: '#6B7280' }}>
        Loading screening result for case {caseId}...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px 24px 32px 24px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header with Back Button & Action Buttons (Aligned edge-to-edge, no breadcrumb, no unwanted space) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              margin: '0',
              fontSize: '24px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.3px',
            }}
          >
            Screening result
          </h1>
        </div>

        {/* Top Right Action Buttons: View audit trail & Chat with agent */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate(`/audit?caseId=${currentCaseId}`)}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              color: '#374151',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
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
            <History size={15} />
            <span>View audit trail</span>
          </button>
        </div>
      </div>

      {/* 2. Large Status Banner (Red for Potential Match, Green for No Match) */}
      <div
        style={{
          backgroundColor: isPotentialMatch ? '#C5221F' : '#107C41',
          borderRadius: '12px',
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#FFFFFF',
          boxShadow: isPotentialMatch
            ? '0 4px 12px rgba(197, 34, 31, 0.25)'
            : '0 4px 12px rgba(16, 124, 65, 0.25)',
          flexWrap: 'wrap',
          gap: '16px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Side: Shield Icon + Text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={24} strokeWidth={2.2} />
          </div>

          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '2px',
              }}
            >
              {isPotentialMatch ? 'POTENTIAL MATCH' : 'NO MATCH'}
            </div>
            <h2
              style={{
                margin: '0 0 2px 0',
                fontSize: '22px',
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-0.3px',
              }}
            >
              {isPotentialMatch ? 'Review required before onboarding' : 'Clear to proceed'}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              {isPotentialMatch
                ? '1 entry on Mock Sanctions List matched on alias and date of birth.'
                : 'No Mock Sanctions List entry matched on name or alias together with date of birth or nationality.'}
            </p>
          </div>
        </div>

        {/* Right Side: Case ID & Checked Timestamp */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.2px',
            }}
          >
            {currentCaseId}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: '2px',
            }}
          >
            Checked {customer.checkedOn}
          </div>
        </div>
      </div>

      {/* 3. Row 2: Customer Card (Left) & Matched List Entry / Screening Summary (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        {/* Customer Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3
            style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            {isDocumentUpload ? 'Extracted Customer Information' : 'Customer Information'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
              <span style={{ color: '#6B7280' }}>Full name</span>
              <strong style={{ color: '#111827' }}>{customer.name}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
              <span style={{ color: '#6B7280' }}>Date of birth</span>
              <span style={{ color: '#111827' }}>{customer.dob}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
              <span style={{ color: '#6B7280' }}>Nationality</span>
              <span style={{ color: '#111827' }}>{customer.nationality}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
              <span style={{ color: '#6B7280' }}>Address</span>
              <span style={{ color: '#111827' }}>{customer.address}</span>
            </div>

            {isDocumentUpload && (
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
                <span style={{ color: '#6B7280' }}>Documents</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#111827' }}>
                    {customer.docCount} {customer.docCount === 1 ? 'file' : 'files'}
                  </span>
                  <span style={{ color: '#9CA3AF' }}>·</span>
                  <span
                    style={{
                      color: '#831B84',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    onClick={() => {
                      const rawLink = caseData?.documentsLink;
                      const cid = caseData?.caseId || currentCaseId;
                      const targetUrl =
                        rawLink && (rawLink.startsWith('http://') || rawLink.startsWith('https://'))
                          ? rawLink
                          : `https://xebiagroup.sharepoint.com/sites/QA/Shared%20Documents/${encodeURIComponent(cid)}`;
                      window.open(targetUrl, '_blank');
                    }}
                    title="Open case documents folder in SharePoint"
                  >
                    <FolderOpen size={13} />
                    Open case folder
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Matched List Entry (Potential Match) OR Screening Summary (No Match) */}
        {isPotentialMatch ? (
          /* Matched list entry */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                Matched list entry
              </h3>
              <span
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                }}
              >
                Mock Sanctions List
              </span>
            </div>

            {/* Target Highlighted Name */}
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#DC2626',
                marginBottom: '14px',
              }}
            >
              {matchedEntry.fullName}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: '#6B7280' }}>Aliases</span>
                <span style={{ color: '#111827' }}>{matchedEntry.aliases}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: '#6B7280' }}>Date of birth</span>
                <span style={{ color: '#111827' }}>{matchedEntry.dob}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: '#6B7280' }}>Nationality</span>
                <span style={{ color: '#111827' }}>{matchedEntry.nationality}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: '#6B7280' }}>Listed reason</span>
                <span style={{ color: '#111827' }}>{matchedEntry.listedReason}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Screening summary (Green No Match) */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Screening summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 size={18} color="#16A34A" style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>Checked against <strong>7 entries</strong> on Mock Sanctions List</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 size={18} color="#16A34A" style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>Full names and listed aliases compared after normalisation</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 size={18} color="#16A34A" style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>No name hit confirmed by date of birth or nationality</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Row 3: Match Analysis Card (Rendered for Potential Match) */}
      {isPotentialMatch && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              Match analysis
            </h3>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              Rule: name or alias match + date of birth or nationality match = Potential Match
            </span>
          </div>

          {/* Comparison Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid #E5E7EB',
                    color: '#6B7280',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <th style={{ padding: '8px 12px 10px 0', width: '22%' }}>Field</th>
                  <th style={{ padding: '8px 12px 10px 12px', width: '26%' }}>Customer</th>
                  <th style={{ padding: '8px 12px 10px 12px', width: '34%' }}>List entry</th>
                  <th style={{ padding: '8px 0 10px 12px', width: '18%' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {/* Row 1: Name */}
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 12px 12px 0', fontWeight: 500, color: '#111827' }}>Name</td>
                  <td style={{ padding: '12px', color: '#1F2937' }}>{customer.name}</td>
                  <td style={{ padding: '12px', color: '#1F2937' }}>
                    {isNameExactMatch ? (
                      matchedEntry.fullName
                    ) : (
                      <>{matchedEntry.fullName} · via alias "{customer.name}"</>
                    )}
                  </td>
                  <td style={{ padding: '12px 0 12px 12px' }}>
                    {isNameExactMatch ? (
                      <span
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                        Full match
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                        Alias match
                      </span>
                    )}
                  </td>
                </tr>

                {/* Row 2: Date of birth */}
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 12px 12px 0', fontWeight: 500, color: '#111827' }}>Date of birth</td>
                  <td style={{ padding: '12px', color: '#1F2937' }}>{customer.dob}</td>
                  <td style={{ padding: '12px', color: '#1F2937' }}>{matchedEntry.dob}</td>
                  <td style={{ padding: '12px 0 12px 12px' }}>
                    {isDobMatch ? (
                      <span
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                        Match
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#F3F4F6',
                          color: '#6B7280',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        — Differs
                      </span>
                    )}
                  </td>
                </tr>

                {/* Row 3: Nationality */}
                <tr>
                  <td style={{ padding: '12px 12px 12px 0', fontWeight: 500, color: '#111827' }}>Nationality</td>
                  <td style={{ padding: '12px', color: '#1F2937' }}>{customer.nationality}</td>
                  <td style={{ padding: '12px', color: '#1F2937' }}>{matchedEntry.nationality}</td>
                  <td style={{ padding: '12px 0 12px 12px' }}>
                    {isNatMatch ? (
                      <span
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                        Match
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#F3F4F6',
                          color: '#6B7280',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        — Differs
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Blue Callout Box: Why this was flagged */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #DBEAFE',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <Info size={16} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E40AF', marginBottom: '2px' }}>
                Why this was flagged
              </div>
              <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: 1.4 }}>
                {caseData?.matchReason ? (
                  <span>
                    {caseData.matchReason}. Source: Mock Sanctions List.
                  </span>
                ) : (
                  <span>
                    {isNameExactMatch
                      ? `Full name match (${customer.name}); `
                      : `Alias match (${customer.name} matches listed alias of ${matchedEntry.fullName}); `}
                    {isDobMatch
                      ? `DOB match (${customer.dob}); `
                      : `DOB differs (${customer.dob} vs ${matchedEntry.dob}); `}
                    {isNatMatch
                      ? `Nationality match (${customer.nationality}). `
                      : `Nationality differs (${customer.nationality} vs ${matchedEntry.nationality}). `}
                    Source: Mock Sanctions List.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Document Validation Results Section (Mounted ONLY for Document Upload Cases) */}
      {isDocumentUpload && (
        <DocumentValidationSection
          status={caseData?.documentValidationStatus}
          details={caseData?.documentValidationDetails}
          validationDate={caseData?.documentValidationDate}
          customerData={{
            name: customer.name,
            dob: customer.dob,
            nationality: customer.nationality,
            address: customer.address,
          }}
          fallbackDocumentNames={caseData?.documentNames && caseData.documentNames.length > 0 ? caseData.documentNames : extractedDocNames}
          isDocumentOnly={true}
        />
      )}

      {/* 5. Row 4: Reviewer Decision Card (Available for BOTH Green and Red until recorded) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '22px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
          Reviewer decision
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#6B7280' }}>
          Recorded with your name and a timestamp in the audit trail.
        </p>

        {isDecisionRecorded ? (
          /* Decision Recorded State */
          <div>
            <div
              style={{
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#15803D',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Decision recorded in the audit trail.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
                <span style={{ color: '#6B7280' }}>Decision</span>
                <span
                  style={{
                    backgroundColor:
                      selectedDecision === 'Approved'
                        ? '#DCFCE7'
                        : selectedDecision === 'Rejected'
                        ? '#FEE2E2'
                        : '#FEF3C7',
                    color:
                      selectedDecision === 'Approved'
                        ? '#15803D'
                        : selectedDecision === 'Rejected'
                        ? '#DC2626'
                        : '#B45309',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    display: 'inline-block',
                    width: 'fit-content',
                  }}
                >
                  {selectedDecision}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: '#6B7280' }}>Reviewer</span>
                <span style={{ color: '#111827' }}>{activeReviewer}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: '#6B7280' }}>Decided on</span>
                <span style={{ color: '#111827' }}>{decidedOnTime}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <span style={{ color: '#6B7280' }}>Comment</span>
                <span style={{ color: '#111827' }}>{caseData?.reviewerComment || comment || 'No comment provided.'}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Decision Input State (Appears for both Green & Red newly screened cases) */
          <div>
            {/* 3 Decision Buttons: Approve, Reject, Escalate */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {/* Approve Button */}
              <button
                type="button"
                onClick={() => setSelectedDecision('Approved')}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: selectedDecision === 'Approved' ? '1.5px solid #16A34A' : '1px solid #D1D5DB',
                  backgroundColor: selectedDecision === 'Approved' ? '#DCFCE7' : '#FFFFFF',
                  color: selectedDecision === 'Approved' ? '#15803D' : '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedDecision === 'Approved' ? '0 1px 2px rgba(22, 163, 74, 0.1)' : 'none',
                }}
              >
                <Check size={16} strokeWidth={2.5} />
                <span>Approve</span>
              </button>

              {/* Reject Button */}
              <button
                type="button"
                onClick={() => setSelectedDecision('Rejected')}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: selectedDecision === 'Rejected' ? '1.5px solid #DC2626' : '1px solid #D1D5DB',
                  backgroundColor: selectedDecision === 'Rejected' ? '#FEE2E2' : '#FFFFFF',
                  color: selectedDecision === 'Rejected' ? '#DC2626' : '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedDecision === 'Rejected' ? '0 1px 2px rgba(220, 38, 38, 0.1)' : 'none',
                }}
              >
                <X size={16} strokeWidth={2.5} />
                <span>Reject</span>
              </button>

              {/* Escalate Button */}
              <button
                type="button"
                onClick={() => setSelectedDecision('Escalated')}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: selectedDecision === 'Escalated' ? '1.5px solid #B45309' : '1px solid #D1D5DB',
                  backgroundColor: selectedDecision === 'Escalated' ? '#9A6700' : '#FFFFFF',
                  color: selectedDecision === 'Escalated' ? '#FFFFFF' : '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedDecision === 'Escalated' ? '0 1px 3px rgba(154, 103, 0, 0.3)' : 'none',
                }}
              >
                <ArrowUpRight size={16} strokeWidth={2.5} />
                <span>Escalate</span>
              </button>
            </div>

            {/* Comment Box */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                Reviewer comment *
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Enter reviewer rationale or compliance notes..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#831B84')}
                onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
              />
            </div>

            {/* Submit Decision Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={savingDecision}
                onClick={handleRecordDecision}
                style={{
                  backgroundColor: '#831B84',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingDecision ? 'not-allowed' : 'pointer',
                  opacity: savingDecision ? 0.7 : 1,
                  boxShadow: '0 1px 3px rgba(131, 27, 132, 0.3)',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!savingDecision) e.currentTarget.style.backgroundColor = '#6A146B';
                }}
                onMouseLeave={(e) => {
                  if (!savingDecision) e.currentTarget.style.backgroundColor = '#831B84';
                }}
              >
                {savingDecision ? 'Submitting decision...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
