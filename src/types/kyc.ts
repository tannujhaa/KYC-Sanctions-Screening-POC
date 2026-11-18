export interface SanctionsEntry {
  id: string;
  fullName: string;
  aliases: string[];
  dob: string;
  nationality: string;
  source: string;
  reason: string;
}

export type CheckResult = 'No Match' | 'Potential Match';
export type ReviewerDecision = 'Pending review' | 'Approved' | 'Rejected' | 'Escalated';

export interface KycCase {
  caseId: string;
  customerName: string;
  dob: string;
  nationality: string;
  address: string;
  checkResult: CheckResult;
  matchedEntry?: string | null;
  matchReason?: string | null;
  reviewerDecision: ReviewerDecision;
  reviewerComment?: string | null;
  reviewer?: string | null;
  checkedOn: string;
  decidedOn?: string | null;
  documentsLink?: string | null;
  documentNames?: string[];
  createdAt: string; // ISO format or date string
}

export interface AuditLogEntry {
  id: string;
  caseId: string;
  event: 'Case Created' | 'Screening Completed' | 'Decision Recorded' | 'Note Added';
  details: string;
  performedBy: string;
  timestamp: string;
}

export interface DayScreeningStat {
  date: string;
  dayNumber: number;
  dayLabel: string;
  total: number;
  potential: number;
  cleared: number;
  isToday?: boolean;
}

export interface MatchBasisStats {
  aliasHits: number;
  dobConfirmed: number;
  nationalityOnly: number;
}

export interface DashboardStats {
  total: number;
  potentialMatches: number;
  hitRate: number;
  cleared: number;
  pendingReview: number;
  oldestPendingMinutes: number;
  oldestPendingCaseId?: string;
  todayTotal: number;
  todayPotential: number;
  perDay: DayScreeningStat[];
  matchBasis: MatchBasisStats;
}
