import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { kycService } from '../services/kycService';
import type { KycCase } from '../types/kyc';

export const ScreeningCasesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [cases, setCases] = useState<KycCase[]>([]);
  const [loading, setLoading] = useState(true);

  const query = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';

  useEffect(() => {
    kycService.getCases().then((all) => {
      let filtered = all;
      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.caseId.toLowerCase().includes(q) ||
            c.customerName.toLowerCase().includes(q)
        );
      }
      if (statusFilter === 'pending') {
        filtered = filtered.filter((c) => c.reviewerDecision === 'Pending review');
      }
      setCases(filtered);
      setLoading(false);
    });
  }, [query, statusFilter]);

  return (
    <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
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
            Screening Cases
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
            {statusFilter === 'pending'
              ? 'Showing cases pending your review'
              : query
              ? `Search results for "${query}"`
              : 'All historical and active KYC screening cases'}
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
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {loading ? (
          <div>Loading cases...</div>
        ) : cases.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
            No cases found matching your criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid #E5E7EB',
                    color: '#6B7280',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '10px 12px' }}>Case ID</th>
                  <th style={{ padding: '10px 12px' }}>Customer</th>
                  <th style={{ padding: '10px 12px' }}>Nationality</th>
                  <th style={{ padding: '10px 12px' }}>Check Result</th>
                  <th style={{ padding: '10px 12px' }}>Decision</th>
                  <th style={{ padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr
                    key={c.caseId}
                    style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                    onClick={() => navigate(`/result/${c.caseId}`)}
                  >
                    <td style={{ padding: '12px', fontWeight: 600 }}>{c.caseId}</td>
                    <td style={{ padding: '12px' }}>{c.customerName}</td>
                    <td style={{ padding: '12px' }}>{c.nationality}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: c.checkResult === 'Potential Match' ? '#FEE2E2' : '#DCFCE7',
                          color: c.checkResult === 'Potential Match' ? '#DC2626' : '#15803D',
                        }}
                      >
                        {c.checkResult}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{c.reviewerDecision}</td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/result/${c.caseId}`);
                        }}
                        style={{
                          backgroundColor: '#FAF4FB',
                          border: '1px solid #EDE0EE',
                          color: '#831B84',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
