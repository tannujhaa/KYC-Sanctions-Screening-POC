import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, MessageSquare, History } from 'lucide-react';
import { kycService } from '../services/kycService';
import type { KycCase } from '../types/kyc';

interface OutletContextType {
  openCopilot: () => void;
}

export const ScreeningResultPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { openCopilot } = useOutletContext<OutletContextType>();

  const [caseData, setCaseData] = useState<KycCase | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (caseId) {
      kycService.getCaseById(caseId).then((data) => {
        setCaseData(data);
        if (data?.reviewerComment) setComment(data.reviewerComment);
        setLoading(false);
      });
    }
  }, [caseId]);

  const handleDecision = async (decision: 'Approved' | 'Rejected' | 'Escalated') => {
    if (!caseId) return;
    const updated = await kycService.recordDecision(
      caseId,
      decision,
      comment || `${decision} by reviewer`,
      'Demo Reviewer'
    );
    setCaseData(updated);
  };

  if (loading) {
    return <div style={{ padding: '32px' }}>Loading case {caseId}...</div>;
  }

  if (!caseData) {
    return (
      <div style={{ padding: '32px' }}>
        <h3>Case not found: {caseId}</h3>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  const isPotential = caseData.checkResult === 'Potential Match';

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: '#6B7280',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Large Banner (Green for No Match, Red for Potential Match) */}
      <div
        style={{
          backgroundColor: isPotential ? '#FEF2F2' : '#F0FDF4',
          border: `2px solid ${isPotential ? '#EF4444' : '#22C55E'}`,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '9999px',
              backgroundColor: isPotential ? '#FEE2E2' : '#DCFCE7',
              color: isPotential ? '#DC2626' : '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPotential ? <AlertTriangle size={26} /> : <CheckCircle2 size={26} />}
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 700,
                color: isPotential ? '#991B1B' : '#166534',
              }}
            >
              {caseData.checkResult.toUpperCase()}
            </h2>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: isPotential ? '#B91C1C' : '#15803D',
              }}
            >
              {caseData.matchReason}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openCopilot}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <MessageSquare size={16} />
            Chat with Agent
          </button>
          <button
            onClick={() => navigate('/audit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <History size={16} />
            View Audit Trail
          </button>
        </div>
      </div>

      {/* Case Details & Decision Form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
        }}
      >
        {/* Customer Details */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>
            Customer Profile · {caseData.caseId}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#6B7280' }}>Customer Name: </span>
              <strong style={{ color: '#111827' }}>{caseData.customerName}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Date of Birth: </span>
              <strong>{caseData.dob}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Nationality: </span>
              <strong>{caseData.nationality}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Address: </span>
              <span>{caseData.address}</span>
            </div>
            {caseData.matchedEntry && (
              <div>
                <span style={{ color: '#DC2626' }}>Matched Sanctions Entry: </span>
                <strong style={{ color: '#DC2626' }}>{caseData.matchedEntry}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Reviewer Decision Panel */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>
            Reviewer Decision
          </h3>
          <div style={{ marginBottom: '12px', fontSize: '13px' }}>
            Current Decision: <strong>{caseData.reviewerDecision}</strong>
          </div>

          <textarea
            placeholder="Add reviewer comments for the audit log..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: '100%',
              height: '80px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              marginBottom: '16px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleDecision('Approved')}
              style={{
                flex: 1,
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Approve
            </button>
            <button
              onClick={() => handleDecision('Rejected')}
              style={{
                flex: 1,
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reject
            </button>
            <button
              onClick={() => handleDecision('Escalated')}
              style={{
                flex: 1,
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Escalate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
