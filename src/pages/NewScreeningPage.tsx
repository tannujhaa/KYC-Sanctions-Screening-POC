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
} from 'lucide-react';
import { kycService, normalizeDobToYmd } from '../services/kycService';
import type { ScreeningStage, DocumentPayloadItem } from '../types/kyc';
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

  // Form State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');

  // Documents State
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
    const sampleDocs: UploadedDoc[] = [
      {
        id: 'doc-1',
        name: 'Specimen_ID_Markus_Thorn.pdf',
        sizeFormatted: '182 KB',
        sizeBytes: 182 * 1024,
        contentBytes: SAMPLE_PDF_BASE64,
      },
      {
        id: 'doc-2',
        name: 'Proof_of_Address.pdf',
        sizeFormatted: '96 KB',
        sizeBytes: 96 * 1024,
        contentBytes: SAMPLE_PDF_BASE64,
      },
    ];

    setFullName('Markus Thorn');
    setDob('1971-08-22');
    setNationality('German');
    setAddress('14 Harbour Lane, Eastmere');
    setDocuments(sampleDocs);
    setErrors({});

    // Trigger screening directly with sample data
    executeScreening('Markus Thorn', '1971-08-22', 'German', '14 Harbour Lane, Eastmere', sampleDocs);
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

  const handleClear = () => {
    setFullName('');
    setDob('');
    setNationality('');
    setAddress('');
    setDocuments([]);
    setErrors({});
  };

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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
    if (documents.length === 0) {
      newErrors.documents = 'At least one KYC document is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Central screening executor
  const executeScreening = async (
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

      // Verify and prepare document payload items with pure Base64 content
      const payloadDocuments: DocumentPayloadItem[] = [];

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

      const cleanDob = normalizeDobToYmd(dobVal);
      setCurrentStage('creating_case');
      setIsModalOpen(true);

      console.log('[NewScreeningPage] Invoking Power Automate Flow for:', nameVal, 'DOB (YYYY-MM-DD):', cleanDob, 'with documents:', payloadDocuments.map(d => d.name));

      const result = await kycService.screenCustomer(
        {
          customerName: nameVal.trim(),
          dob: cleanDob,
          nationality: natVal.trim(),
          address: addrVal.trim(),
          documents: payloadDocuments,
          documentNames: payloadDocuments.map((d) => d.name),
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
        navigate(`/result/${result.caseId}`);
      }, 500);
    } catch (err: any) {
      console.error('[NewScreeningPage] Screening failed:', err);
      setCurrentStage('failed');
      setModalError(err?.message || 'Power Automate flow execution encountered an error.');
      setIsSubmitting(false);
    }
  };

  // Submit button handler
  const handleRunCheck = () => {
    if (isSubmitting) return;

    if (!validateForm()) {
      console.warn('[NewScreeningPage] Form validation failed, please fill all fields.');
      return;
    }

    const cleanDob = normalizeDobToYmd(dob);
    executeScreening(fullName, cleanDob, nationality, address, documents);
  };

  // Retry screening action from modal
  const handleRetryScreening = () => {
    setModalError(undefined);
    setCurrentStage('creating_case');
    const cleanDob = normalizeDobToYmd(dob);
    executeScreening(fullName, cleanDob, nationality, address, documents);
  };

  // Total size of uploaded documents
  const totalSizeBytes = documents.reduce((acc, d) => acc + d.sizeBytes, 0);
  const totalSizeFormatted = formatFileSize(totalSizeBytes);
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
          Enter customer details and attach supporting documents to run a sanctions check.
        </p>
      </div>

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
            <span>Please complete all required fields and upload at least one document to run the flow.</span>
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

      {/* 2. Main Layout Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
            gap: '20px',
            alignItems: 'stretch',
            width: '100%',
          }}
        >
          {/* LEFT CARD: Customer Details */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2
              style={{
                margin: '0 0 2px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Customer details
            </h2>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '12px',
                color: '#6B7280',
              }}
            >
              Fields marked * are required for screening.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
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
                    height: '38px',
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
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
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
                        height: '38px',
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
                      height: '38px',
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: '80px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: errors.address ? '1px solid #DC2626' : '1px solid #D1D5DB',
                    backgroundColor: errors.address ? '#FEF2F2' : '#FFFFFF',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none',
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

          {/* RIGHT CARD: Documents (Unlimited uploads supported) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <h2
              style={{
                margin: '0 0 2px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Documents *
            </h2>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '12px',
                color: '#6B7280',
              }}
            >
              Filed to the case folder when the check runs.
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
                padding: '20px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '10px',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: errors.documents ? '#FEE2E2' : '#FAF4FB',
                  color: errors.documents ? '#DC2626' : '#831B84',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UploadCloud size={18} />
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                Drag and drop KYC documents
              </div>

              <div style={{ fontSize: '11px', color: '#6B7280' }}>
                PDF, PNG or JPG · upload as many files as needed
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#831B84',
                  textDecoration: 'none',
                  marginTop: '2px',
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
                  fontSize: '11px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AlertCircle size={12} />
                <span>{errors.documents}</span>
              </div>
            )}

            {/* Uploaded Documents List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '170px',
                overflowY: 'auto',
                marginBottom: '14px',
                flex: 1,
              }}
            >
              {documents.length === 0 ? (
                <div
                  style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    color: '#9CA3AF',
                    fontSize: '12px',
                    border: '1px dashed #F3F4F6',
                    borderRadius: '8px',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  No documents attached yet. Drop files above or click browse.
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
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
                            fontSize: '12px',
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
                      <X size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Document stats footer & progress bar */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid #F3F4F6',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#6B7280',
                }}
              >
                <span>{documents.length} {documents.length === 1 ? 'file' : 'files'} attached</span>
                <span>{totalSizeFormatted}</span>
              </div>
              <div
                style={{
                  height: '4px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, documents.length * 20)}%`,
                    backgroundColor: '#831B84',
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Action Bar (Directly inside layout, tight and natural) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            gap: '12px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
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
            disabled={isSubmitting}
            style={{
              backgroundColor: '#831B84',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '8px 22px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(131, 27, 132, 0.3)',
              transition: 'background-color 0.15s ease',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#6A146B';
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#831B84';
            }}
          >
            <ShieldCheck size={16} />
            <span>{isSubmitting ? 'Screening...' : 'Run sanctions check'}</span>
          </button>
        </div>
      </div>

      {/* 4. KYC Screening Progress Modal */}
      <ScreeningProgressModal
        isOpen={isModalOpen}
        currentStage={currentStage}
        customerName={fullName}
        dob={normalizeDobToYmd(dob)}
        nationality={nationality}
        docCount={documents.length}
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
