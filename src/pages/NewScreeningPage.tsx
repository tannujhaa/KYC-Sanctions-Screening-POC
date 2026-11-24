import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  X,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Sparkles,
  User,
} from 'lucide-react';
import { kycService, normalizeDobToYmd } from '../services/kycService';
import type { ScreeningStage, DocumentPayloadItem, ScreeningMethod } from '../types/kyc';
import { ScreeningProgressModal } from '../components/common/ScreeningProgressModal';

interface UploadedDoc {
  id: string;
  name: string;
  sizeFormatted: string;
  sizeBytes: number;
  file?: File;
  contentBytes?: string;
}

/**
 * Reads a File object using the browser FileReader API and converts its
 * binary content into a raw Base64 string (stripping any data URL prefix).
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error(`Failed to read "${file.name}": result is not a string.`));
          return;
        }
        // Data URL format: "data:<mime-type>;base64,<base64-data>"
        // Strip data URL prefix to ensure only raw Base64 file content is returned
        const commaIndex = result.indexOf(',');
        const base64Content = commaIndex !== -1 ? result.substring(commaIndex + 1) : result;
        resolve(base64Content.trim());
      } catch (err) {
        reject(new Error(`Error processing Base64 for "${file.name}": ${err}`));
      }
    };

    reader.onerror = () => {
      reject(
        new Error(
          `Error reading file "${file.name}": ${reader.error?.message || 'FileReader error'}`
        )
      );
    };

    reader.onabort = () => {
      reject(new Error(`File read was aborted for "${file.name}".`));
    };

    reader.readAsDataURL(file);
  });
};

// Valid blank 1-page PDF Base64 string for demo/test shortcuts
const SAMPLE_PDF_BASE64 =
  'JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUgL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlIC9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNDwvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoxODMKJSVFT0Y=';

interface FormErrors {
  fullName?: string;
  dob?: string;
  nationality?: string;
  address?: string;
  documents?: string;
}

const NATIONALITIES = [
  'Pakistani',
  'German',
  'Syrian',
  'Norwegian',
  'Hungarian',
  'Colombian',
  'Lebanese',
  'Russian',
  'American',
  'British',
  'Indian',
  'Australian',
  'Canadian',
  'French',
  'Italian',
  'Spanish',
  'Swedish',
  'Swiss',
  'Japanese',
  'Singaporean',
  'Mexican',
  'Brazilian',
  'Bulgarian',
  'Ghanaian',
  'Serbian',
  'Other',
];

export const NewScreeningPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Method State (Default: 'manual')
  const [screeningMethod, setScreeningMethod] = useState<ScreeningMethod>('manual');

  // Form State (Manual Entry)
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');

  // Documents State (Document Upload)
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState<ScreeningStage>('creating_case');
  const [modalError, setModalError] = useState<string | undefined>();

  // Format bytes helper
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Quick fill helper for demo/testing
  const handleAutoFillAndRun = () => {
    if (screeningMethod === 'manual') {
      setFullName('Markus Thorn');
      setDob('1971-08-22');
      setNationality('German');
      setAddress('14 Harbour Lane, Eastmere');
      setErrors({});
      executeScreening('manual', 'Markus Thorn', '1971-08-22', 'German', '14 Harbour Lane, Eastmere', []);
    } else {
      const sampleDocs: UploadedDoc[] = [
        {
          id: 'doc-1',
          name: 'Specimen_Passport_Gourav_Kumar.pdf',
          sizeFormatted: '182 KB',
          sizeBytes: 182 * 1024,
          contentBytes: SAMPLE_PDF_BASE64,
        },
      ];
      setDocuments(sampleDocs);
      setErrors({});
      executeScreening('document', '', '', '', '', sampleDocs);
    }
  };

  // Handle files added via drag & drop or file picker
  const handleFilesAdded = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      const fileList = Array.from(files);
      const newDocs: UploadedDoc[] = [];

      for (let idx = 0; idx < fileList.length; idx++) {
        const file = fileList[idx];
        // Read file using browser FileReader API and convert to Base64
        const contentBytes = await readFileAsBase64(file);

        newDocs.push({
          id: `doc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          sizeFormatted: formatFileSize(file.size),
          sizeBytes: file.size,
          file,
          contentBytes,
        });
      }

      setDocuments((prev) => [...prev, ...newDocs]);
      if (errors.documents) {
        setErrors((prev) => ({ ...prev, documents: undefined }));
      }
    } catch (readErr: any) {
      console.error('[NewScreeningPage] Error reading uploaded file:', readErr);
      setErrors((prev) => ({
        ...prev,
        documents: `File upload error: ${readErr?.message || 'Unable to read file'}. Please try again.`,
      }));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Clear button resets selected method, form values, documents, and errors
  const handleClear = () => {
    setScreeningMethod('manual');
    setFullName('');
    setDob('');
    setNationality('');
    setAddress('');
    setDocuments([]);
    setErrors({});
    setModalError(undefined);
  };

  // Determine if form requirements are satisfied for the selected method
  const isFormValid = (() => {
    if (screeningMethod === 'manual') {
      const cleanDob = normalizeDobToYmd(dob);
      return (
        fullName.trim().length > 0 &&
        Boolean(cleanDob) &&
        /^\d{4}-\d{2}-\d{2}$/.test(cleanDob) &&
        nationality.trim().length > 0 &&
        address.trim().length > 0
      );
    }
    return documents.length > 0;
  })();

  // Form Validation: only validates the currently selected method
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (screeningMethod === 'manual') {
      if (!fullName.trim()) {
        newErrors.fullName = 'Full legal name is required.';
      }
      const cleanDob = normalizeDobToYmd(dob);
      if (!cleanDob) {
        newErrors.dob = 'Date of birth is required.';
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
        newErrors.dob = 'Date of birth must be a valid date in YYYY-MM-DD format.';
      }
      if (!nationality.trim()) {
        newErrors.nationality = 'Nationality is required.';
      }
      if (!address.trim()) {
        newErrors.address = 'Residential address is required.';
      }
    } else {
      // Document upload mode
      if (documents.length === 0) {
        newErrors.documents = 'At least one KYC document is required.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Central screening executor
  const executeScreening = async (
    method: ScreeningMethod,
    nameVal: string,
    dobVal: string,
    natVal: string,
    addrVal: string,
    docsVal: UploadedDoc[]
  ) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setModalError(undefined);
      setCurrentStage('creating_case');
      setIsModalOpen(true);

      let finalCustomerName = '';
      let finalDob = '';
      let finalNationality = '';
      let finalAddress = '';
      const payloadDocuments: DocumentPayloadItem[] = [];

      if (method === 'manual') {
        // Option 1: Manual Entry - send customer details and empty documents array
        finalCustomerName = nameVal.trim();
        finalDob = normalizeDobToYmd(dobVal);
        finalNationality = natVal.trim();
        finalAddress = addrVal.trim();
      } else {
        // Option 2: Document Upload - send empty customer detail values and uploaded documents
        finalCustomerName = '';
        finalDob = '';
        finalNationality = '';
        finalAddress = '';

        for (const doc of docsVal) {
          let base64 = doc.contentBytes;
          if (!base64 && doc.file) {
            try {
              base64 = await readFileAsBase64(doc.file);
            } catch (fileErr: any) {
              throw new Error(`Failed to read document "${doc.name}": ${fileErr?.message || 'File read error'}`);
            }
          }
          if (!base64) {
            throw new Error(`Document "${doc.name}" has no readable content.`);
          }
          payloadDocuments.push({
            name: doc.name,
            contentBytes: base64,
          });
        }
      }

      console.log(
        `[NewScreeningPage] Invoking Power Automate Flow (Method: ${method}) with:`,
        {
          customerName: finalCustomerName,
          dob: finalDob,
          nationality: finalNationality,
          address: finalAddress,
          documentsCount: payloadDocuments.length,
        }
      );

      const result = await kycService.screenCustomer(
        {
          customerName: finalCustomerName,
          dob: finalDob,
          nationality: finalNationality,
          address: finalAddress,
          documents: payloadDocuments,
          documentNames: payloadDocuments.map((d) => d.name),
          screeningMethod: method,
        },
        (progress) => {
          console.log('[NewScreeningPage] Stage progress update:', progress.stage);
          setCurrentStage(progress.stage);
          if (progress.error) {
            setModalError(progress.error);
          }
        }
      );

      console.log('[NewScreeningPage] Screening completed with result:', result);

      // Brief transition so reviewer sees all stages complete
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSubmitting(false);
        navigate(`/result/${result.caseId}`, {
          state: {
            screeningResult: {
              ...result,
              screeningMethod: method,
            },
            screeningMethod: method,
          },
        });
      }, 500);
    } catch (err: any) {
      console.error('[NewScreeningPage] Screening failed:', err);
      setCurrentStage('failed');
      setIsModalOpen(true);
      const rawMsg = err?.message || 'Power Automate flow execution encountered an error.';
      const friendlyMsg =
        rawMsg.toLowerCase().includes('forbidden') ||
        rawMsg.toLowerCase().includes('unauthorized') ||
        rawMsg.toLowerCase().includes('403') ||
        rawMsg.toLowerCase().includes('permission')
          ? 'Permission Denied: Your account does not have permission to run the KYC Screen Customer flow or access the SharePoint site. Please ensure the flow has been shared with you under Run-only users in Power Automate and you have access to the QA SharePoint site.'
          : rawMsg;
      setModalError(friendlyMsg);
      setIsSubmitting(false);
    }
  };

  // Submit button handler
  const handleRunCheck = () => {
    if (isSubmitting) return;

    if (!validateForm()) {
      console.warn('[NewScreeningPage] Form validation failed for method:', screeningMethod);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const cleanDob = normalizeDobToYmd(dob);
    executeScreening(screeningMethod, fullName, cleanDob, nationality, address, documents);
  };

  // Retry screening action from modal
  const handleRetryScreening = () => {
    setModalError(undefined);
    setCurrentStage('creating_case');
    const cleanDob = normalizeDobToYmd(dob);
    executeScreening(screeningMethod, fullName, cleanDob, nationality, address, documents);
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div
      style={{
        padding: '20px 24px 32px 24px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header (Clean, flush, no breadcrumbs) */}
      <div style={{ marginBottom: '16px' }}>
        <h1
          style={{
            margin: '0 0 3px 0',
            fontSize: '22px',
            fontWeight: 700,
            color: '#111827',
            letterSpacing: '-0.3px',
          }}
        >
          New KYC case
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
          Select a screening method and provide the required information to run a sanctions check.
        </p>
      </div>

      {/* Flow Execution Failure Alert Banner */}
      {modalError && !isModalOpen && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#B91C1C',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#DC2626" />
            <div>
              <strong style={{ display: 'block', fontSize: '13px', marginBottom: '2px' }}>
                Screening Flow Failed
              </strong>
              <span style={{ fontSize: '12px', color: '#991B1B' }}>{modalError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryScreening}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry flow
          </button>
        </div>
      )}

      {/* Global Validation Banner if form has errors */}
      {hasErrors && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#B91C1C',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>
              {screeningMethod === 'manual'
                ? 'Please complete all four customer details fields to run the sanctions check.'
                : 'Please upload at least one KYC document to run the sanctions check.'}
            </span>
          </div>

          {/* Quick Auto-fill button */}
          <button
            type="button"
            onClick={handleAutoFillAndRun}
            style={{
              backgroundColor: '#831B84',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} />
            Auto-fill demo data & run flow
          </button>
        </div>
      )}

      {/* 2. Screening Method Selection Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <h2
            style={{
              margin: '0 0 4px 0',
              fontSize: '15px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            Screening Method
          </h2>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#6B7280' }}>
            Choose how you would like to provide customer information for sanctions screening.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            width: '100%',
          }}
        >
          {/* Card 1: Manual Entry */}
          <div
            onClick={() => {
              setScreeningMethod('manual');
              setErrors({});
            }}
            role="radio"
            aria-checked={screeningMethod === 'manual'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                setScreeningMethod('manual');
                setErrors({});
              }
            }}
            style={{
              border: screeningMethod === 'manual' ? '2px solid #831B84' : '1px solid #E5E7EB',
              backgroundColor: screeningMethod === 'manual' ? '#FAF4FB' : '#FFFFFF',
              borderRadius: '10px',
              padding: '16px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              transition: 'all 0.15s ease',
              position: 'relative',
              boxShadow: screeningMethod === 'manual' ? '0 2px 6px rgba(131, 27, 132, 0.08)' : 'none',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: screeningMethod === 'manual' ? '#831B84' : '#F3F4F6',
                color: screeningMethod === 'manual' ? '#FFFFFF' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <User size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '3px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: screeningMethod === 'manual' ? '#831B84' : '#111827',
                  }}
                >
                  Manual Entry
                </span>
                {/* Radio Circle */}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: screeningMethod === 'manual' ? '5px solid #831B84' : '2px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
                Enter customer information manually.
              </p>
            </div>
          </div>

          {/* Card 2: Document Upload */}
          <div
            onClick={() => {
              setScreeningMethod('document');
              setErrors({});
            }}
            role="radio"
            aria-checked={screeningMethod === 'document'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                setScreeningMethod('document');
                setErrors({});
              }
            }}
            style={{
              border: screeningMethod === 'document' ? '2px solid #831B84' : '1px solid #E5E7EB',
              backgroundColor: screeningMethod === 'document' ? '#FAF4FB' : '#FFFFFF',
              borderRadius: '10px',
              padding: '16px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              transition: 'all 0.15s ease',
              position: 'relative',
              boxShadow: screeningMethod === 'document' ? '0 2px 6px rgba(131, 27, 132, 0.08)' : 'none',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: screeningMethod === 'document' ? '#831B84' : '#F3F4F6',
                color: screeningMethod === 'document' ? '#FFFFFF' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <UploadCloud size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '3px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: screeningMethod === 'document' ? '#831B84' : '#111827',
                  }}
                >
                  Document Upload
                </span>
                {/* Radio Circle */}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: screeningMethod === 'document' ? '5px solid #831B84' : '2px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
                Upload identity and address documents.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Form Area (Conditionally displays ONLY the selected method's card) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        {screeningMethod === 'manual' ? (
          /* OPTION 1: Manual Entry - ONLY Customer Details Card */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <h2
              style={{
                margin: '0 0 2px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Customer details
            </h2>
            <p
              style={{
                margin: '0 0 18px 0',
                fontSize: '12.5px',
                color: '#6B7280',
              }}
            >
              Fields marked * are required for manual screening.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              {/* Full legal name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Full legal name *
                </label>
                <input
                  type="text"
                  placeholder="Enter full legal name (e.g. Markus Thorn)"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: errors.fullName ? '1px solid #DC2626' : '1px solid #D1D5DB',
                    backgroundColor: errors.fullName ? '#FEF2F2' : '#FFFFFF',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = errors.fullName ? '#DC2626' : '#831B84')}
                  onBlur={(e) => (e.target.style.borderColor = errors.fullName ? '#DC2626' : '#D1D5DB')}
                />
                {errors.fullName && (
                  <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} />
                    <span>{errors.fullName}</span>
                  </div>
                )}
              </div>

              {/* DOB & Nationality (2-column row) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Date of Birth */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    Date of birth *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => {
                        setDob(e.target.value);
                        if (errors.dob) setErrors((prev) => ({ ...prev, dob: undefined }));
                      }}
                      placeholder="YYYY-MM-DD"
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: errors.dob ? '1px solid #DC2626' : '1px solid #D1D5DB',
                        backgroundColor: errors.dob ? '#FEF2F2' : '#FFFFFF',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = errors.dob ? '#DC2626' : '#831B84')}
                      onBlur={(e) => (e.target.style.borderColor = errors.dob ? '#DC2626' : '#D1D5DB')}
                    />
                    <Calendar
                      size={15}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        color: '#9CA3AF',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  {errors.dob && (
                    <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} />
                      <span>{errors.dob}</span>
                    </div>
                  )}
                </div>

                {/* Nationality */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    Nationality *
                  </label>
                  <select
                    value={nationality}
                    onChange={(e) => {
                      setNationality(e.target.value);
                      if (errors.nationality) setErrors((prev) => ({ ...prev, nationality: undefined }));
                    }}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: errors.nationality ? '1px solid #DC2626' : '1px solid #D1D5DB',
                      backgroundColor: errors.nationality ? '#FEF2F2' : '#FFFFFF',
                      color: nationality ? '#111827' : '#9CA3AF',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = errors.nationality ? '#DC2626' : '#831B84')}
                    onBlur={(e) => (e.target.style.borderColor = errors.nationality ? '#DC2626' : '#D1D5DB')}
                  >
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((nat) => (
                      <option key={nat} value={nat} style={{ color: '#111827' }}>
                        {nat}
                      </option>
                    ))}
                  </select>
                  {errors.nationality && (
                    <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} />
                      <span>{errors.nationality}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Residential address */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Residential address *
                </label>
                <textarea
                  placeholder="Enter residential address (street, city, postal code, country)"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: errors.address ? '1px solid #DC2626' : '1px solid #D1D5DB',
                    backgroundColor: errors.address ? '#FEF2F2' : '#FFFFFF',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = errors.address ? '#DC2626' : '#831B84')}
                  onBlur={(e) => (e.target.style.borderColor = errors.address ? '#DC2626' : '#D1D5DB')}
                />
                {errors.address && (
                  <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} />
                    <span>{errors.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* OPTION 2: Document Upload - ONLY Documents Upload Card */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <h2
              style={{
                margin: '0 0 2px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Document upload *
            </h2>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '12.5px',
                color: '#6B7280',
              }}
            >
              Upload one or more supporting documents. Customer information will be extracted from uploaded documents by the screening engine.
            </p>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              style={{ display: 'none' }}
              onChange={(e) => handleFilesAdded(e.target.files)}
            />

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesAdded(e.dataTransfer.files);
              }}
              style={{
                border: errors.documents
                  ? '2px dashed #DC2626'
                  : `2px dashed ${isDragging ? '#831B84' : '#E5E7EB'}`,
                backgroundColor: errors.documents
                  ? '#FEF2F2'
                  : isDragging
                  ? '#FAF4FB'
                  : '#FAFAFA',
                borderRadius: '10px',
                padding: '28px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '16px',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: errors.documents ? '#FEE2E2' : '#FAF4FB',
                  color: errors.documents ? '#DC2626' : '#831B84',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UploadCloud size={22} />
              </div>

              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                Drag and drop KYC documents
              </div>

              <div style={{ fontSize: '12px', color: '#4B5563', fontWeight: 500 }}>
                Supported document types: Utility Bill, Passport, Bank Statement, ID Card
              </div>

              <div style={{ fontSize: '11px', color: '#6B7280' }}>
                PDF, PNG or JPG · upload as many files as needed
              </div>

              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#831B84',
                  textDecoration: 'none',
                  marginTop: '4px',
                }}
              >
                Browse files
              </span>
            </div>

            {/* Document error alert */}
            {errors.documents && (
              <div
                style={{
                  color: '#DC2626',
                  fontSize: '12px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} />
                <span>{errors.documents}</span>
              </div>
            )}

            {/* Uploaded Documents List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '220px',
                overflowY: 'auto',
                width: '100%',
              }}
            >
              {documents.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: '#9CA3AF',
                    fontSize: '12.5px',
                    border: '1px dashed #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  No documents attached yet. Drop files above or click browse to upload.
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #F3F4F6',
                      backgroundColor: '#FAFAFA',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{ color: '#EF4444' }}>
                        <FileText size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {doc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {doc.sizeFormatted}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(doc.id)}
                      title="Remove file"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. Action Bar (Directly inside layout, tight and natural) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            flexWrap: 'wrap',
            gap: '12px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Helper message indicating completion status */}
          <div style={{ fontSize: '12px', color: isFormValid ? '#059669' : '#6B7280' }}>
            {isFormValid
              ? screeningMethod === 'manual'
                ? 'All required customer details provided.'
                : `${documents.length} ${documents.length === 1 ? 'document' : 'documents'} ready for extraction.`
              : screeningMethod === 'manual'
              ? 'Complete all 4 required fields to run check.'
              : 'Upload at least 1 document to run check.'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                color: '#374151',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handleRunCheck}
              disabled={isSubmitting || !isFormValid}
              style={{
                backgroundColor: isFormValid && !isSubmitting ? '#831B84' : '#9CA3AF',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting || !isFormValid ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isFormValid && !isSubmitting ? '0 1px 3px rgba(131, 27, 132, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && isFormValid) e.currentTarget.style.backgroundColor = '#6A146B';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && isFormValid) e.currentTarget.style.backgroundColor = '#831B84';
              }}
            >
              <ShieldCheck size={16} />
              <span>{isSubmitting ? 'Screening...' : 'Run sanctions check'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. KYC Screening Progress Modal */}
      <ScreeningProgressModal
        isOpen={isModalOpen}
        currentStage={currentStage}
        customerName={screeningMethod === 'manual' ? fullName : (documents[0]?.name || 'Document Screening')}
        dob={screeningMethod === 'manual' ? normalizeDobToYmd(dob) : 'Auto-extract'}
        nationality={screeningMethod === 'manual' ? nationality : `${documents.length} doc(s)`}
        docCount={screeningMethod === 'manual' ? 0 : documents.length}
        errorMessage={modalError}
        onRetry={handleRetryScreening}
        onCancel={() => {
          setIsModalOpen(false);
          setIsSubmitting(false);
        }}
      />
    </div>
  );
};
