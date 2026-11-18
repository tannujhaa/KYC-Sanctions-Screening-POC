import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  X,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { kycService } from '../services/kycService';

interface UploadedDoc {
  id: string;
  name: string;
  sizeFormatted: string;
  sizeBytes: number;
}

const NATIONALITIES = [
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
  'Other',
];

export const NewScreeningPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [fullName, setFullName] = useState('Markus Thorn');
  const [dob, setDob] = useState('1971-08-22');
  const [nationality, setNationality] = useState('German');
  const [address, setAddress] = useState('14 Harbour Lane, Eastmere');

  // Documents State (unlimited file uploads supported)
  const [documents, setDocuments] = useState<UploadedDoc[]>([
    {
      id: 'doc-1',
      name: 'Specimen_ID_Markus_Thorn.pdf',
      sizeFormatted: '182 KB',
      sizeBytes: 182 * 1024,
    },
    {
      id: 'doc-2',
      name: 'Proof_of_Address.pdf',
      sizeFormatted: '96 KB',
      sizeBytes: 96 * 1024,
    },
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Format bytes helper
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle files added (unlimited files supported)
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newDocs: UploadedDoc[] = Array.from(files).map((file, idx) => ({
      id: `doc-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      sizeFormatted: formatFileSize(file.size),
      sizeBytes: file.size,
    }));

    setDocuments((prev) => [...prev, ...newDocs]);
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
    setErrorMsg('');
  };

  // Submit & Screen
  const handleRunCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full legal name is required for screening.');
      return;
    }
    if (!dob.trim()) {
      setErrorMsg('Date of birth is required for screening.');
      return;
    }
    if (!nationality.trim()) {
      setErrorMsg('Nationality is required for screening.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const result = await kycService.screenCustomer({
        customerName: fullName.trim(),
        dob: dob.trim(),
        nationality: nationality.trim(),
        address: address.trim(),
        documentNames: documents.map((d) => d.name),
      });

      // Navigate to Result screen for this newly screened case
      navigate(`/result/${result.caseId}`);
    } catch (err) {
      console.error('Screening failed:', err);
      setErrorMsg('An error occurred during screening. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Total size of uploaded documents
  const totalSizeBytes = documents.reduce((acc, d) => acc + d.sizeBytes, 0);
  const totalSizeFormatted = formatFileSize(totalSizeBytes);

  return (
    <div
      style={{
        padding: '24px 32px 32px 32px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header & Breadcrumbs */}
      <div>
        <div
          style={{
            fontSize: '12px',
            color: '#6B7280',
            marginBottom: '4px',
          }}
        >
          Cases / New case
        </div>

        <h1
          style={{
            margin: '0 0 4px 0',
            fontSize: '24px',
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

      {errorMsg && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#B91C1C',
            fontSize: '13px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* 2. Main Split Tablet Layout: Customer Details (Left) & Documents (Right) */}
      <form onSubmit={handleRunCheck} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
            gap: '24px',
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
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
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
                margin: '0 0 20px 0',
                fontSize: '12px',
                color: '#6B7280',
              }}
            >
              Fields marked * are required for screening.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
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
                  placeholder="e.g. Markus Thorn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#831B84')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>

              {/* DOB & Nationality (2-column row) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
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
                      onChange={(e) => setDob(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#831B84')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
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
                    onChange={(e) => setNationality(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#831B84')}
                    onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  >
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((nat) => (
                      <option key={nat} value={nat}>
                        {nat}
                      </option>
                    ))}
                  </select>
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
                  Residential address
                </label>
                <textarea
                  placeholder="Street address, city, postal code, country"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: '84px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#831B84')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>
            </div>
          </div>

          {/* RIGHT CARD: Documents (Unlimited uploads supported) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
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
              Documents
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
                border: `2px dashed ${isDragging ? '#831B84' : '#E5E7EB'}`,
                backgroundColor: isDragging ? '#FAF4FB' : '#FAFAFA',
                borderRadius: '10px',
                padding: '22px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '16px',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#FAF4FB',
                  color: '#831B84',
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

            {/* Uploaded Documents List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '190px',
                overflowY: 'auto',
                marginBottom: '14px',
                flex: 1,
              }}
            >
              {documents.map((doc) => (
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
              ))}
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
                    width: `${Math.min(100, Math.max(15, documents.length * 20))}%`,
                    backgroundColor: '#831B84',
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom Action Bar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '14px 24px',
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
              padding: '9px 20px',
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
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: '#831B84',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '9px 22px',
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
      </form>
    </div>
  );
};
