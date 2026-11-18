import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { KycCase } from '../../types/kyc';

interface RecentCasesTableProps {
  cases: KycCase[];
}

function formatCaseDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = d.getUTCDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getUTCMonth()];
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${month}, ${hours}:${mins}`;
  } catch {
    return isoString;
  }
}

export const RecentCasesTable: React.FC<RecentCasesTableProps> = ({ cases }) => {
  const navigate = useNavigate();

  // Top 6 newest cases (sorted descending by createdAt)
  const recent6 = [...cases]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          Recent cases
        </h3>

        <button
          onClick={() => navigate('/cases')}
          style={{
            background: 'none',
            border: 'none',
            color: '#831B84',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          All screening cases
        </button>
      </div>

      {/* Table */}
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
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              <th style={{ padding: '8px 12px 10px 0' }}>Case ID</th>
              <th style={{ padding: '8px 12px 10px 12px' }}>Customer</th>
              <th style={{ padding: '8px 12px 10px 12px' }}>Date</th>
              <th style={{ padding: '8px 12px 10px 12px' }}>Screening Result</th>
              <th style={{ padding: '8px 0 10px 12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent6.map((c) => {
              const isPotential = c.checkResult === 'Potential Match';

              return (
                <tr
                  key={c.caseId}
                  onClick={() => navigate(`/result/${c.caseId}`)}
                  style={{
                    borderBottom: '1px solid #F3F4F6',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Case ID */}
                  <td style={{ padding: '12px 12px 12px 0', fontWeight: 600, color: '#111827' }}>
                    {c.caseId}
                  </td>

                  {/* Customer Name */}
                  <td style={{ padding: '12px', color: '#1F2937' }}>
                    {c.customerName}
                  </td>

                  {/* Date */}
                  <td style={{ padding: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {formatCaseDate(c.createdAt)}
                  </td>

                  {/* Screening Result */}
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: isPotential ? '#FEE2E2' : '#DCFCE7',
                        color: isPotential ? '#DC2626' : '#15803D',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.checkResult}
                    </span>
                  </td>

                  {/* Reviewer Decision Status */}
                  <td style={{ padding: '12px 0 12px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        backgroundColor:
                          c.reviewerDecision === 'Approved'
                            ? '#DCFCE7'
                            : c.reviewerDecision === 'Escalated'
                            ? '#FEF3C7'
                            : c.reviewerDecision === 'Rejected'
                            ? '#FEE2E2'
                            : '#F1F5F9',
                        color:
                          c.reviewerDecision === 'Approved'
                            ? '#15803D'
                            : c.reviewerDecision === 'Escalated'
                            ? '#B45309'
                            : c.reviewerDecision === 'Rejected'
                            ? '#DC2626'
                            : '#475569',
                      }}
                    >
                      {c.reviewerDecision}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
