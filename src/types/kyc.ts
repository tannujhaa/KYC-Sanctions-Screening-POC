export interface DocumentPayloadItem {
  name: string;
  contentBytes: string;
}

export interface ScreenCustomerInput {
  customerName: string;
  dob: string;
  nationality: string;
  address: string;
  documents?: DocumentPayloadItem[];
  documentNames?: string[];
}

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
export type DocumentValidationStatus = 'Pass' | 'Fail' | 'Needs Review';

export interface DocumentItemValidation {
  name?: string;
  fileName?: string;
  documentName?: string;
  type?: string;
  documentType?: string;
  status?: string; // 'Pass' | 'Fail' | 'Needs Review'
  validationStatus?: string;
  remarks?: string;
  confidence?: number;
  extractedFields?: Record<string, any>;
}

export interface CustomerFieldValidation {
  field?: string;
  submittedValue?: string;
  extractedValue?: string;
  status?: string; // 'Pass' | 'Fail' | 'Needs Review' | 'Match' | 'Mismatch'
  explanation?: string;
  expected?: string;
  extracted?: string;
  remarks?: string;
}

export interface CustomerDataValidation {
  fullName?: CustomerFieldValidation | string | any;
  dob?: CustomerFieldValidation | string | any;
  nationality?: CustomerFieldValidation | string | any;
  address?: CustomerFieldValidation | string | any;
  fields?: CustomerFieldValidation[];
  status?: string;
  remarks?: string;
  [key: string]: any;
}

export interface CrossDocumentValidation {
  status?: string;
  remarks?: string;
  details?: string;
  checks?: string[] | any[];
  [key: string]: any;
}

export interface DocumentValidationDetails {
  documents?: DocumentItemValidation[];
  crossDocumentValidation?: CrossDocumentValidation | string;
  customerDataValidation?: CustomerDataValidation | CustomerFieldValidation[];
  overallValidationStatus?: string;
  overallRemarks?: string;
  [key: string]: any;
}

export type ScreeningStage =
  | 'creating_case'
  | 'filing_documents'
  | 'screening'
  | 'preparing_result'
  | 'completed'
  | 'failed';

export interface ScreeningProgress {
  stage: ScreeningStage;
  caseId?: string;
  error?: string;
}

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
  documents?: DocumentPayloadItem[];
  documentValidationStatus?: DocumentValidationStatus | string | null;
  documentValidationDetails?: DocumentValidationDetails | string | null;
  documentValidationDate?: string | null;
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
