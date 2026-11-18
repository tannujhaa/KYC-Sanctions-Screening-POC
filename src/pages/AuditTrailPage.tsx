import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kycService } from '../services/kycService';
import type { AuditLogEntry } from '../types/kyc';

export const AuditTrailPage: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [caseFilter, setCaseFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kycService.getAuditLogs(caseFilter || undefined).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, [caseFilter]);

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#111827' }}>
            Audit Trail
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
            Complete tamper-evident log of case creation, screening completions, and reviewer decisions
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter by Case ID (e.g. KYC-0042)..."
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              width: '260px',
              outline: 'none',
            }}
          />
          {caseFilter && (
            <button
              onClick={() => setCaseFilter('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#831B84',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear filter
            </button>
          )}
        </div>

        {loading ? (
          <div>Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
            No audit records found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #F3F4F6',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: '#EDE0EE',
                        color: '#831B84',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {log.caseId}
                    </span>
                    <strong style={{ fontSize: '13px', color: '#111827' }}>{log.event}</strong>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>by {log.performedBy}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151' }}>{log.details}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
