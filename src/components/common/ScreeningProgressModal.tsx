import React from 'react';
import { Shield, Check, AlertCircle } from 'lucide-react';
import type { ScreeningStage } from '../../types/kyc';
import { normalizeDobToYmd } from '../../services/kycService';

interface ScreeningProgressModalProps {
  isOpen: boolean;
  currentStage: ScreeningStage;
  customerName: string;
  dob: string;
  nationality: string;
  docCount: number;
  errorMessage?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

export const ScreeningProgressModal: React.FC<ScreeningProgressModalProps> = ({
  isOpen,
  currentStage,
  customerName,
  dob,
  nationality,
  docCount,
  errorMessage,
  onRetry,
  onCancel,
}) => {
  if (!isOpen) return null;

  // Stages definition
  const stages: Array<{
    id: ScreeningStage;
    label: string;
  }> = [
    {
      id: 'creating_case',
      label: 'Creating case',
    },
    {
      id: 'filing_documents',
      label: `Filing ${docCount} ${docCount === 1 ? 'document' : 'documents'} to case folder`,
    },
    {
      id: 'screening',
      label: 'Screening against Mock Sanctions List',
    },
    {
      id: 'preparing_result',
      label: 'Preparing result',
    },
  ];

  // Stage sequence index helper
  const stageOrder: ScreeningStage[] = [
    'creating_case',
    'filing_documents',
    'screening',
    'preparing_result',
    'completed',
  ];

  const currentIdx = stageOrder.indexOf(currentStage);

  // Calculate progress bar percentage
  let progressPct = 0;
  if (currentStage === 'creating_case') progressPct = 25;
  else if (currentStage === 'filing_documents') progressPct = 50;
  else if (currentStage === 'screening') progressPct = 75;
  else if (currentStage === 'preparing_result') progressPct = 95;
  else if (currentStage === 'completed') progressPct = 100;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '28px 32px',
          width: '100%',
          maxWidth: '430px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        {/* Shield Icon in soft purple box */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#FAF4FB',
            color: '#831B84',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
          }}
        >
          <Shield size={22} strokeWidth={2.2} />
        </div>

        {/* Heading */}
        <h2
          style={{
            margin: '0 0 4px 0',
            fontSize: '20px',
            fontWeight: 700,
            color: '#111827',
            letterSpacing: '-0.3px',
          }}
        >
          Running sanctions check
        </h2>

        {/* Customer Information Subtitle */}
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '13px',
            color: '#6B7280',
          }}
        >
          {customerName || 'Customer'} · {normalizeDobToYmd(dob) || 'DOB'} · {nationality || 'Nationality'}
        </p>

        {/* 4 Progress Stage Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '22px' }}>
          {stages.map((stg, idx) => {
            const isCompleted = currentIdx > idx || currentStage === 'completed';
            const isInProgress = currentStage === stg.id;
            const isFailed = currentStage === 'failed' && currentIdx === idx;
            const isPending = !isCompleted && !isInProgress && !isFailed;

            return (
              <div
                key={stg.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                }}
              >
                {/* Left: Indicator & Stage Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Indicator Icon */}
                  {isCompleted && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}

                  {isInProgress && (
                    <div
                      className="animate-spin"
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2.5px solid #F3E8FF',
                        borderTopColor: '#831B84',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {isFailed && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <AlertCircle size={14} />
                    </div>
                  )}

                  {isPending && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid #E5E7EB',
                        backgroundColor: 'transparent',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Stage Label */}
                  <span
                    style={{
                      fontWeight: isInProgress ? 600 : isCompleted ? 500 : 400,
                      color: isInProgress ? '#831B84' : isCompleted ? '#1F2937' : '#6B7280',
                    }}
                  >
                    {stg.label}
                  </span>
                </div>

                {/* Right: Done indicator */}
                {isCompleted && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontWeight: 500,
                    }}
                  >
                    Done
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Error Message Box if Failed */}
        {currentStage === 'failed' && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#B91C1C',
              marginBottom: '16px',
            }}
          >
            {errorMessage || 'Screening operation failed. Please try again.'}
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Retry screening
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    color: '#374151',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Progress Bar */}
        <div
          style={{
            height: '4px',
            backgroundColor: '#E5E7EB',
            borderRadius: '9999px',
            overflow: 'hidden',
            width: '100%',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              backgroundColor: currentStage === 'failed' ? '#DC2626' : '#831B84',
              borderRadius: '9999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Footer Text */}
        <div
          style={{
            fontSize: '12px',
            color: '#6B7280',
            lineHeight: 1.4,
          }}
        >
          This usually takes 5–10 seconds. Please keep this window open.
        </div>
      </div>
    </div>
  );
};
