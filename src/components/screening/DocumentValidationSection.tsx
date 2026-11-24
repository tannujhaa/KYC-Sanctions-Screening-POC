import React from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import type {
  DocumentValidationStatus,
  DocumentValidationDetails,
  DocumentItemValidation,
} from '../../types/kyc';
import { parseDocumentValidationDetails } from '../../services/kycService';

interface CustomerComparisonRow {
  field: string;
  submittedValue: string;
  extractedValue: string;
  status: string;
  explanation?: string;
}

interface DocumentValidationSectionProps {
  status?: DocumentValidationStatus | string | null;
  details?: DocumentValidationDetails | string | null;
  validationDate?: string | null;
  customerData: {
    name: string;
    dob: string;
    nationality: string;
    address: string;
  };
  fallbackDocumentNames?: string[];
  isDocumentOnly?: boolean;
}

/**
 * Safely converts any value (including objects with { item }, { Value }, arrays, etc.) to a string
 * so React will never crash with "Objects are not valid as a React child".
 */
export function safeRenderText(val: any, fallback: string = '—'): string {
  if (val == null) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed !== '' ? trimmed : fallback;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object') {
    if (val.item != null) return safeRenderText(val.item, fallback);
    if (val.Value != null) return safeRenderText(val.Value, fallback);
    if (val.value != null) return safeRenderText(val.value, fallback);
    if (val.name != null) return safeRenderText(val.name, fallback);
    if (val.label != null) return safeRenderText(val.label, fallback);
    if (Array.isArray(val)) {
      const items = val.map((v) => safeRenderText(v, '')).filter(Boolean);
      return items.length > 0 ? items.join(', ') : fallback;
    }
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return String(val);
}

/**
 * Normalizes status strings to 'Pass' | 'Fail' | 'Needs Review' | 'Unknown'
 */
function normalizeStatus(raw?: any): 'Pass' | 'Fail' | 'Needs Review' | 'Unknown' {
  if (!raw) return 'Unknown';
  let str = '';
  if (typeof raw === 'string') {
    str = raw;
  } else if (typeof raw === 'object' && raw !== null) {
    str = raw.Value || raw.value || raw.Title || raw.name || raw.label || '';
  } else {
    str = String(raw);
  }
  const norm = str.trim().toLowerCase();
  if (norm === 'pass' || norm === 'passed' || norm === 'match' || norm === 'matched' || norm === 'verified' || norm === 'valid') {
    return 'Pass';
  }
  if (norm === 'fail' || norm === 'failed' || norm === 'mismatch' || norm === 'invalid') {
    return 'Fail';
  }
  if (
    norm.includes('review') ||
    norm.includes('warn') ||
    norm.includes('differs') ||
    norm.includes('partial') ||
    norm === 'needs review' ||
    norm === 'needs_review'
  ) {
    return 'Needs Review';
  }
  return 'Unknown';
}

/**
 * Returns a styled badge for status
 */
function renderStatusBadge(statusRaw?: any, labelOverride?: string) {
  const status = normalizeStatus(statusRaw);
  const rawStr =
    typeof statusRaw === 'object' && statusRaw !== null
      ? statusRaw.Value || statusRaw.value || statusRaw.label || status
      : String(statusRaw || '');
  const label = labelOverride || (status === 'Unknown' ? rawStr || 'Pending' : status);

  if (status === 'Pass') {
    return (
      <span
        style={{
          backgroundColor: '#DCFCE7',
          color: '#15803D',
          border: '1px solid #BBF7D0',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}
      >
        <CheckCircle2 size={12} strokeWidth={2.5} />
        {label}
      </span>
    );
  }

  if (status === 'Fail') {
    return (
      <span
        style={{
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          border: '1px solid #FECACA',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}
      >
        <XCircle size={12} strokeWidth={2.5} />
        {label}
      </span>
    );
  }

  if (status === 'Needs Review') {
    return (
      <span
        style={{
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}
      >
        <AlertTriangle size={12} strokeWidth={2.5} />
        {label}
      </span>
    );
  }

  return (
    <span
      style={{
        backgroundColor: '#F3F4F6',
        color: '#4B5563',
        border: '1px solid #E5E7EB',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export const DocumentValidationSection: React.FC<DocumentValidationSectionProps> = ({
  status,
  details,
  validationDate,
  customerData,
  fallbackDocumentNames = [],
  isDocumentOnly,
}) => {
  // Safely parse details if string
  const parsedDetails: DocumentValidationDetails | null = React.useMemo(() => {
    return parseDocumentValidationDetails(details);
  }, [details]);

  // Overall status resolution: prefer direct flow status output, then details JSON
  const overallStatus =
    status ||
    parsedDetails?.overallValidationStatus ||
    (parsedDetails as any)?.DocumentValidationStatus ||
    null;

  // Has ANY document validation data been recorded?
  const hasValidationData = Boolean(overallStatus || parsedDetails);

  if (!hasValidationData) {
    return null;
  }

  // 1. Normalized Document List
  const docList: DocumentItemValidation[] = React.useMemo(() => {
    let rawDocs: any =
      parsedDetails?.documents ||
      (parsedDetails as any)?.Documents ||
      (parsedDetails as any)?.uploadedDocuments ||
      (parsedDetails as any)?.UploadedDocuments ||
      (parsedDetails as any)?.documentList ||
      (parsedDetails as any)?.DocumentList ||
      (parsedDetails as any)?.extractedDocuments;

    if (rawDocs && typeof rawDocs === 'object' && !Array.isArray(rawDocs) && (rawDocs as any).item) {
      rawDocs = (rawDocs as any).item;
    }
    if (!Array.isArray(rawDocs) && rawDocs && typeof rawDocs === 'object') {
      rawDocs = [rawDocs];
    }

    if (Array.isArray(rawDocs) && rawDocs.length > 0) {
      return rawDocs.map((rawDoc: any, idx: number) => {
        const d = rawDoc?.item && typeof rawDoc.item === 'object' ? rawDoc.item : rawDoc;
        if (typeof d === 'string') {
          return {
            name: d,
            type: d.toLowerCase().includes('passport')
              ? 'Passport'
              : d.toLowerCase().includes('bill')
              ? 'Utility Bill'
              : d.toLowerCase().includes('bank')
              ? 'Bank Statement'
              : 'ID Document',
            status: overallStatus || 'Pass',
          };
        }
        return {
          name: safeRenderText(d?.name || d?.fileName || d?.documentName, `Document ${idx + 1}`),
          type: safeRenderText(d?.type || d?.documentType || d?.docType, 'Identity Document'),
          status: safeRenderText(d?.status || d?.validationStatus || d?.documentStatus || overallStatus, 'Pass'),
          remarks: safeRenderText(d?.remarks || d?.details || d?.comment, 'Document verified by extraction engine.'),
        };
      });
    }

    // Fallback from uploaded names
    if (fallbackDocumentNames.length > 0) {
      return fallbackDocumentNames.map((name) => {
        const lower = name.toLowerCase();
        const type = lower.includes('passport')
          ? 'Passport'
          : lower.includes('bill')
          ? 'Utility Bill'
          : lower.includes('bank')
          ? 'Bank Statement'
          : 'ID Document';
        return {
          name,
          type,
          status: overallStatus || 'Pass',
        };
      });
    }

    return [];
  }, [parsedDetails, fallbackDocumentNames, overallStatus]);

  const normOverall = String(overallStatus || '').trim().toLowerCase();
  const isOverallNotApplicable =
    !overallStatus ||
    normOverall === '' ||
    normOverall.includes('not applicable') ||
    normOverall.includes('not_applicable') ||
    normOverall === 'n/a' ||
    normOverall === 'na' ||
    normOverall === 'none' ||
    normOverall === 'null' ||
    normOverall === 'undefined' ||
    normOverall.includes('not required');

  // If status is Not Applicable and there are no documents, do not render this component
  if (isOverallNotApplicable && docList.length === 0) {
    return null;
  }

  // 2. Customer Data Comparisons (bound to submittedValue, extractedValue, status)
  const customerComparisons = React.useMemo<CustomerComparisonRow[]>(() => {
    let rawVal: any =
      parsedDetails?.customerDataValidation ||
      (parsedDetails as any)?.CustomerDataValidation ||
      (parsedDetails as any)?.customer_data_validation ||
      (parsedDetails as any)?.fieldValidation ||
      (parsedDetails as any)?.comparisons ||
      (parsedDetails as any)?.validationResults;

    if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal) && (rawVal as any).item) {
      rawVal = (rawVal as any).item;
    }
    if (!Array.isArray(rawVal) && rawVal && typeof rawVal === 'object') {
      rawVal = [rawVal];
    }

    if (Array.isArray(rawVal) && rawVal.length > 0) {
      return rawVal.map((rawItem: any) => {
        const item = rawItem?.item && typeof rawItem.item === 'object' ? rawItem.item : rawItem;
        const submitted =
          item.submittedValue ??
          item.submitted ??
          item.customerProvided ??
          item.customerValue;
        const extracted =
          item.extractedValue ??
          item.extracted ??
          item.documentExtracted ??
          item.docExtracted ??
          item.documentValue;
        const status =
          item.status ??
          item.comparisonResult ??
          item.result ??
          item.matchStatus;
        const explanation =
          item.explanation ??
          item.remarks ??
          item.details ??
          item.reason;

        return {
          field: safeRenderText(item.field || item.fieldName || item.name, 'Field'),
          submittedValue: safeRenderText(submitted, '—'),
          extractedValue: safeRenderText(extracted, '—'),
          status: safeRenderText(status, 'Pass'),
          explanation: safeRenderText(explanation, ''),
        };
      });
    }

    // Fallback if structured as object by field keys
    const extractFromObj = (
      fieldName: string,
      fieldObj?: any,
      fallbackSubmitted?: string
    ): CustomerComparisonRow => {
      const submittedValue =
        fieldObj?.submittedValue != null
          ? safeRenderText(fieldObj.submittedValue)
          : fieldObj?.customerProvided != null
          ? safeRenderText(fieldObj.customerProvided)
          : safeRenderText(fallbackSubmitted);

      const extractedValue =
        fieldObj?.extractedValue != null
          ? safeRenderText(fieldObj.extractedValue)
          : fieldObj?.documentExtracted != null
          ? safeRenderText(fieldObj.documentExtracted)
          : typeof fieldObj === 'string'
          ? safeRenderText(fieldObj)
          : '—';

      const status = safeRenderText(fieldObj?.status || fieldObj?.comparisonResult || overallStatus, 'Pass');
      const explanation = safeRenderText(fieldObj?.explanation || fieldObj?.remarks || fieldObj?.reason, '');

      return {
        field: fieldName,
        submittedValue,
        extractedValue,
        status,
        explanation,
      };
    };

    const detailsObj = (parsedDetails as any) || {};
    const nameObj =
      rawVal?.fullName ||
      rawVal?.name ||
      rawVal?.CustomerName ||
      rawVal?.['Full Name'] ||
      detailsObj?.fullName ||
      detailsObj?.name ||
      detailsObj?.['Full Name'] ||
      detailsObj?.extractedFullName;
    const dobObj =
      rawVal?.dob ||
      rawVal?.dateOfBirth ||
      rawVal?.DOB ||
      rawVal?.['Date of Birth'] ||
      detailsObj?.dob ||
      detailsObj?.dateOfBirth ||
      detailsObj?.['Date of Birth'] ||
      detailsObj?.extractedDOB;
    const natObj =
      rawVal?.nationality ||
      rawVal?.Nationality ||
      detailsObj?.nationality ||
      detailsObj?.Nationality ||
      detailsObj?.extractedNationality;
    const addrObj =
      rawVal?.address ||
      rawVal?.Address ||
      detailsObj?.address ||
      detailsObj?.Address ||
      detailsObj?.extractedAddress;

    return [
      extractFromObj('Full Name', nameObj, customerData.name),
      extractFromObj('Date of birth', dobObj, customerData.dob),
      extractFromObj('Nationality', natObj, customerData.nationality),
      extractFromObj('Address', addrObj, customerData.address),
    ];
  }, [parsedDetails, customerData, overallStatus]);

  // Check if manual customer data was submitted or if this is document-only
  const hasSubmittedCustomerData = React.useMemo(() => {
    if (isDocumentOnly === true) return false;
    if (isDocumentOnly === false) return true;
    // Check if customerComparisons have valid submitted values
    const validSubmitted = customerComparisons.filter((c) => {
      const v = (c.submittedValue || '').trim();
      return (
        v !== '' &&
        v !== '—' &&
        v !== '-' &&
        v !== 'Not available' &&
        v !== 'null' &&
        v !== 'undefined' &&
        !v.startsWith('KYC-')
      );
    });
    return validSubmitted.length > 0;
  }, [isDocumentOnly, customerComparisons]);

  // 3. Cross-Document Validation Details
  const crossDocValidation = React.useMemo(() => {
    let raw: any = parsedDetails?.crossDocumentValidation || (parsedDetails as any)?.CrossDocumentValidation;
    if (!raw) return null;
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as any).item) {
      raw = (raw as any).item;
    }
    if (Array.isArray(raw) && raw.length > 0) {
      raw = raw[0];
    }

    if (typeof raw === 'string') {
      return {
        status: safeRenderText(overallStatus, 'Pass'),
        remarks: raw,
      };
    }

    const rawStatus = raw?.status || raw?.validationStatus || overallStatus || 'Pass';
    const rawRemarks = raw?.remarks || raw?.details || (Array.isArray(raw?.checks) ? raw.checks.join(', ') : raw?.item) || 'Consistent across documents';

    return {
      status: safeRenderText(rawStatus, 'Pass'),
      remarks: safeRenderText(rawRemarks, 'Consistent across documents'),
    };
  }, [parsedDetails, overallStatus]);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '22px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* 1. Header with Title & Overall Status Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#FAF4FB',
              color: '#831B84',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCheck2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              Document Validation Results
            </h3>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#6B7280' }}>
              AI document extraction and cross-verification against customer data
              {validationDate ? ` · Evaluated ${(() => {
                try {
                  const rawStr = typeof validationDate === 'object' && validationDate !== null
                    ? (validationDate as any).Value || String(validationDate)
                    : String(validationDate);
                  const d = new Date(rawStr);
                  return isNaN(d.getTime()) ? rawStr : d.toLocaleString();
                } catch {
                  return String(validationDate);
                }
              })()}` : ''}
            </p>
          </div>
        </div>

        {/* Overall Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Overall Status:</span>
          {renderStatusBadge(overallStatus)}
        </div>
      </div>

      {/* 2. Uploaded Documents Validation Cards / Table */}
      <div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FileText size={15} color="#831B84" />
          <span>Uploaded Documents ({docList.length})</span>
        </div>

        {docList.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FAFAFA',
              border: '1px dashed #E5E7EB',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#6B7280',
            }}
          >
            No individual document extraction records available.
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Document Name</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Validation Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Details / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {docList.map((doc, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx < docList.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}
                  >
                    <td style={{ padding: '10px 14px', color: '#111827', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} color="#6B7280" />
                        <span>{safeRenderText(doc.name)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#4B5563' }}>
                      <span
                        style={{
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        {safeRenderText(doc.type)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {renderStatusBadge(doc.status)}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: '12px' }}>
                      {safeRenderText(doc.remarks, 'Document verified by extraction engine.')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Customer Data Comparison Results (Rendered ONLY when NOT document-only AND submitted data exists) */}
      {!isDocumentOnly && hasSubmittedCustomerData && (
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={15} color="#831B84" />
            <span>Customer Data vs Document Extraction</span>
          </div>

          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Field</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Customer Provided</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Document Extracted</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Comparison Result</th>
                </tr>
              </thead>
              <tbody>
                {customerComparisons.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx < customerComparisons.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}
                  >
                    <td style={{ padding: '10px 14px', color: '#111827', fontWeight: 500 }}>
                      {safeRenderText(row.field)}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#1F2937' }}>
                      {safeRenderText(row.submittedValue)}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#1F2937' }}>
                      {safeRenderText(row.extractedValue)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {renderStatusBadge(row.status, row.status === 'Pass' ? 'Match' : row.status === 'Fail' ? 'Mismatch' : row.status)}
                      {row.explanation && (
                        <span style={{ display: 'block', fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                          {safeRenderText(row.explanation)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Cross-Document Validation Results */}
      {crossDocValidation && (
        <div
          style={{
            backgroundColor: '#FAF5FF',
            border: '1px solid #F3E8FF',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: '240px' }}>
            <Layers size={16} color="#831B84" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#581C87', marginBottom: '2px' }}>
                Cross-Document Consistency
              </div>
              <div style={{ fontSize: '12px', color: '#6B21A8', lineHeight: 1.4 }}>
                {safeRenderText(crossDocValidation.remarks)}
              </div>
            </div>
          </div>
          <div>
            {renderStatusBadge(crossDocValidation.status)}
          </div>
        </div>
      )}
    </div>
  );
};
