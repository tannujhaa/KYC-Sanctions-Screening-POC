import type {
  KycCase,
  SanctionsEntry,
  AuditLogEntry,
  DashboardStats,
  DayScreeningStat,
  ScreeningProgress,
  CheckResult,
  ReviewerDecision,
  DocumentPayloadItem,
  DocumentValidationStatus,
  DocumentValidationDetails,
} from '../types/kyc';
import { getContext } from '@microsoft/power-apps/app';
import { KYC_ScreenCustomerService } from '../generated/services/KYC_ScreenCustomerService';
import { KYC_RecordDecisionService } from '../generated/services/KYC_RecordDecisionService';
import { KYC_AuditLogService } from '../generated/services/KYC_AuditLogService';
import type { KYC_AuditLogRead } from '../generated/models/KYC_AuditLogModel';
import { KYC_CasesService } from '../generated/services/KYC_CasesService';
import type { KYC_CasesRead } from '../generated/models/KYC_CasesModel';

export async function getCurrentUserEmail(): Promise<string> {
  try {
    const context = await getContext();
    if (context?.user?.userPrincipalName) {
      return context.user.userPrincipalName;
    }
    if (context?.user?.fullName) {
      return context.user.fullName;
    }
  } catch (err) {
    console.warn('[Power Apps] getContext() unavailable or running outside Power Apps host:', err);
  }
  return 'demo.reviewer@xebia.com';
}

/**
 * Normalizes any date value directly into strict YYYY-MM-DD format.
 * Guarantees standard HTML5 date format (YYYY-MM-DD) without timezone shifts or month/day inversion.
 */
export function normalizeDobToYmd(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();

  // Already standard ISO YYYY-MM-DD (e.g. "1997-12-05" or "1997-12-05T00:00:00Z")
  const ymdMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(trimmed);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If provided as DD-MM-YYYY or DD/MM/YYYY (e.g. "05-12-1997")
  const dmyMatch = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/**
 * Safely parses DocumentValidationDetails JSON string from Power Automate or SharePoint.
 * Handles null, empty strings, objects, and malformed JSON gracefully without throwing.
 */
export function parseDocumentValidationDetails(
  rawDetails?: string | DocumentValidationDetails | null
): DocumentValidationDetails | null {
  if (!rawDetails) return null;
  if (typeof rawDetails === 'object') return rawDetails;
  if (typeof rawDetails !== 'string') return null;

  const trimmed = rawDetails.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      if (typeof parsed === 'string') {
        try {
          const secondParse = JSON.parse(parsed);
          if (typeof secondParse === 'object' && secondParse !== null) {
            return secondParse as DocumentValidationDetails;
          }
        } catch {
          return { overallRemarks: parsed };
        }
      }
      return parsed as DocumentValidationDetails;
    }
    return { overallRemarks: String(parsed) };
  } catch (err) {
    console.warn('[KYC] Failed to parse DocumentValidationDetails JSON gracefully:', err, trimmed);
    return {
      overallRemarks: trimmed,
    };
  }
}

export interface IKycService {
  getCases(): Promise<KycCase[]>;
  getCaseById(caseId: string): Promise<KycCase | null>;
  getAuditLogs(caseId?: string): Promise<AuditLogEntry[]>;
  getSanctionsList(): Promise<SanctionsEntry[]>;
  screenCustomer(
    customer: {
      customerName: string;
      dob: string;
      nationality: string;
      address: string;
      documents?: DocumentPayloadItem[];
      documentNames?: string[];
    },
    onProgress?: (progress: ScreeningProgress) => void
  ): Promise<{
    caseId: string;
    checkResult: 'No Match' | 'Potential Match';
    matchedEntry?: string | null;
    matchReason?: string | null;
    matchType?: string;
    documentsLink?: string | null;
    documentValidationStatus?: DocumentValidationStatus | string | null;
    documentValidationDetails?: DocumentValidationDetails | string | null;
  }>;
  recordDecision(
    caseId: string,
    decision: 'Approved' | 'Rejected' | 'Escalated',
    comment: string,
    reviewer: string,
    customerData?: {
      customerName?: string;
      dob?: string;
      nationality?: string;
      address?: string;
      documents?: DocumentPayloadItem[];
    }
  ): Promise<KycCase>;
  getDashboardStats(days?: number): Promise<DashboardStats>;
}

// 7 Fictional Sanctions Entries
export const MOCK_SANCTIONS_LIST: SanctionsEntry[] = [
  {
    id: 'SANC-001',
    fullName: 'Selim Arcadius',
    aliases: ['Salim Arkadi', 'S. Arcadius'],
    dob: '1978-04-12',
    nationality: 'Syrian',
    source: 'Mock Sanctions List',
    reason: 'Suspected trade embargo diversion & high-risk entity affiliation',
  },
  {
    id: 'SANC-002',
    fullName: 'Markus Thorn',
    aliases: ['Marc Thorn', 'Marcus Thorne'],
    dob: '1982-11-03',
    nationality: 'German',
    source: 'Mock Sanctions List',
    reason: 'Financial fraud, illicit transaction facilitation, shell company control',
  },
  {
    id: 'SANC-003',
    fullName: 'Anika Brandvold',
    aliases: ['Annika Brand', 'A. Brandvold'],
    dob: '1985-07-29',
    nationality: 'Norwegian',
    source: 'Mock Sanctions List',
    reason: 'Prohibited corporate ownership & sanctioned maritime logistics',
  },
  {
    id: 'SANC-004',
    fullName: 'Lena Varga',
    aliases: ['Elena Varga', 'L. Varga'],
    dob: '1990-02-14',
    nationality: 'Hungarian',
    source: 'Mock Sanctions List',
    reason: 'Sanctioned entity association & designated asset concealment',
  },
  {
    id: 'SANC-005',
    fullName: 'Rafael Quintero',
    aliases: ['Rafa Quintero', 'R. Quintero'],
    dob: '1975-09-19',
    nationality: 'Colombian',
    source: 'Mock Sanctions List',
    reason: 'Dual-use export control violation & cross-border illicit transfers',
  },
  {
    id: 'SANC-006',
    fullName: 'Tariq Mansoor',
    aliases: ['Tareq Mansur', 'T. Mansoor'],
    dob: '1980-06-25',
    nationality: 'Lebanese',
    source: 'Mock Sanctions List',
    reason: 'Designated high-risk financial intermediary',
  },
  {
    id: 'SANC-007',
    fullName: 'Dmitri Volkov',
    aliases: ['Dmitry Volkoff', 'D. Volkov'],
    dob: '1972-12-08',
    nationality: 'Russian',
    source: 'Mock Sanctions List',
    reason: 'Asset freeze restriction & international sanctions evasion network',
  },
];

// Helper to normalize strings for screening
export function normalizeStr(str: string): string {
  return (str || '').toLowerCase().trim();
}

/**
 * Deterministic Screening Engine:
 * Potential Match if (name matches/contains OR alias matches/contains)
 * AND (DOB matches OR nationality matches).
 * Otherwise No Match.
 */
export function screenAgainstSanctions(
  customerName: string,
  dob: string,
  nationality: string,
  sanctionsList: SanctionsEntry[] = MOCK_SANCTIONS_LIST
): {
  checkResult: 'No Match' | 'Potential Match';
  matchedEntry: string | null;
  matchReason: string | null;
  matchCriteria: {
    matchedAlias: boolean;
    dobConfirmed: boolean;
    nationalityOnly: boolean;
  };
} {
  const normName = normalizeStr(customerName);
  const normDob = normalizeStr(dob);
  const normNat = normalizeStr(nationality);

  for (const entry of sanctionsList) {
    const entryNormName = normalizeStr(entry.fullName);
    const directNameMatch =
      entryNormName.includes(normName) || normName.includes(entryNormName);

    let matchedAliasString: string | null = null;
    for (const alias of entry.aliases) {
      const normAlias = normalizeStr(alias);
      if (normAlias.includes(normName) || normName.includes(normAlias)) {
        matchedAliasString = alias;
        break;
      }
    }

    const nameMatched = directNameMatch || matchedAliasString !== null;

    if (nameMatched) {
      const dobMatch = normDob && normalizeStr(entry.dob) === normDob;
      const natMatch = normNat && normalizeStr(entry.nationality) === normNat;

      if (dobMatch || natMatch) {
        const aliasUsed = matchedAliasString !== null;
        const dobConfirmed = !!dobMatch;
        const nationalityOnly = !dobMatch && !!natMatch;

        let reasonDetails = '';
        if (aliasUsed) {
          reasonDetails += `Matched alias '${matchedAliasString}'`;
        } else {
          reasonDetails += `Matched primary name '${entry.fullName}'`;
        }

        if (dobConfirmed && natMatch) {
          reasonDetails += ` · DOB confirmed (${entry.dob}) · Nationality matched (${entry.nationality})`;
        } else if (dobConfirmed) {
          reasonDetails += ` · DOB confirmed (${entry.dob})`;
        } else if (nationalityOnly) {
          reasonDetails += ` · Nationality matched (${entry.nationality})`;
        }

        return {
          checkResult: 'Potential Match',
          matchedEntry: `${entry.fullName} (${entry.id})`,
          matchReason: reasonDetails,
          matchCriteria: {
            matchedAlias: aliasUsed,
            dobConfirmed,
            nationalityOnly,
          },
        };
      }
    }
  }

  return {
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    matchCriteria: {
      matchedAlias: false,
      dobConfirmed: false,
      nationalityOnly: false,
    },
  };
}

/**
 * 42 Seed Cases across the last 14 days (Nov 5 - Nov 18, 2026, weekdays only)
 * Exactly reproduces the artboard figures:
 * - Total: 42
 * - Potential Matches: 11 (26% hit rate)
 * - Cleared: 31
 * - Pending Review: 4 (KYC-0042, KYC-0040, KYC-0037, KYC-0034)
 * - Oldest pending: KYC-0034 open 2 h 10 min
 * - Today Total: 6 (1 potential match, 5 cleared)
 * - Match Basis: 5 alias hits, 7 DOB confirmed, 4 nationality only
 */
const SEED_CASES: KycCase[] = [
  // 18 Nov 2026 (Today) - 6 cases
  {
    caseId: 'KYC-0042',
    customerName: 'Lena Varga',
    dob: '1990-02-14',
    nationality: 'Hungarian',
    address: 'Andrássy út 45, Budapest, Hungary',
    checkResult: 'Potential Match',
    matchedEntry: 'Lena Varga (SANC-004)',
    matchReason: "Matched primary name 'Lena Varga' · DOB confirmed (1990-02-14)",
    reviewerDecision: 'Pending review',
    checkedOn: '2026-11-18T10:27:00Z',
    createdAt: '2026-11-18T10:27:00Z',
    documentsLink: '/documents/KYC-0042',
    documentNames: ['Passport_LenaVarga.pdf', 'ProofOfAddress.pdf'],
  },
  {
    caseId: 'KYC-0041',
    customerName: 'Priya Raman',
    dob: '1992-08-14',
    nationality: 'Indian',
    address: 'Indiranagar 100ft Rd, Bengaluru, India',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean identity verification and address proof verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-18T10:12:00Z',
    decidedOn: '2026-11-18T10:18:00Z',
    createdAt: '2026-11-18T10:12:00Z',
    documentsLink: '/documents/KYC-0041',
    documentNames: ['National_ID.pdf'],
  },
  {
    caseId: 'KYC-0040',
    customerName: 'Anika Brandvold',
    dob: '1987-03-11',
    nationality: 'Norwegian',
    address: 'Karl Johans gate 22, Oslo, Norway',
    checkResult: 'Potential Match',
    matchedEntry: 'Anika Brandvold (SANC-003)',
    matchReason: "Matched primary name 'Anika Brandvold' · Nationality matched (Norwegian)",
    reviewerDecision: 'Pending review',
    checkedOn: '2026-11-18T09:53:00Z',
    createdAt: '2026-11-18T09:53:00Z',
    documentsLink: '/documents/KYC-0040',
    documentNames: ['Norwegian_Passport.pdf'],
  },
  {
    caseId: 'KYC-0039',
    customerName: 'Tobias Renwick',
    dob: '1988-05-19',
    nationality: 'British',
    address: '14 Kensington Square, London, UK',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Standard tier onboarding passed.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-18T09:40:00Z',
    decidedOn: '2026-11-18T09:44:00Z',
    createdAt: '2026-11-18T09:40:00Z',
    documentsLink: '/documents/KYC-0039',
    documentNames: ['UK_DrivingLicence.pdf'],
  },
  {
    caseId: 'KYC-0038',
    customerName: 'Markus Thorn',
    dob: '1982-11-03',
    nationality: 'German',
    address: 'Friedrichstraße 112, Berlin, Germany',
    checkResult: 'Potential Match',
    matchedEntry: 'Markus Thorn (SANC-002)',
    matchReason: "Matched alias 'Marcus Thorne' · DOB confirmed (1982-11-03) · Nationality matched (German)",
    reviewerDecision: 'Escalated',
    reviewerComment: 'High confidence match on German sanctions watchlist. Escalated to Compliance Head.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-18T09:21:00Z',
    decidedOn: '2026-11-18T09:29:00Z',
    createdAt: '2026-11-18T09:21:00Z',
    documentsLink: '/documents/KYC-0038',
    documentNames: ['ID_Card_Front.pdf', 'CorporateRegistry.pdf'],
  },
  {
    caseId: 'KYC-0037',
    customerName: 'Rafael Quintero',
    dob: '1975-09-19',
    nationality: 'Colombian',
    address: 'Carrera 7 #71-21, Bogotá, Colombia',
    checkResult: 'Potential Match',
    matchedEntry: 'Rafael Quintero (SANC-005)',
    matchReason: "Matched alias 'Rafa Quintero' · DOB confirmed (1975-09-19)",
    reviewerDecision: 'Pending review',
    checkedOn: '2026-11-18T09:10:00Z',
    createdAt: '2026-11-18T09:10:00Z',
    documentsLink: '/documents/KYC-0037',
    documentNames: ['Passport_Scan.pdf'],
  },

  // 17 Nov 2026 (Tue) - 5 cases (2 potential, 3 cleared)
  {
    caseId: 'KYC-0036',
    customerName: 'Daniel Okafor',
    dob: '1984-12-05',
    nationality: 'Nigerian',
    address: 'Victoria Island, Lagos, Nigeria',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Cleared against international watchlists.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-17T16:48:00Z',
    decidedOn: '2026-11-17T17:01:00Z',
    createdAt: '2026-11-17T16:48:00Z',
  },
  {
    caseId: 'KYC-0035',
    customerName: 'Sarah Jenkins',
    dob: '1995-04-18',
    nationality: 'Australian',
    address: 'George St, Sydney, Australia',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Passport verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-17T15:20:00Z',
    decidedOn: '2026-11-17T15:32:00Z',
    createdAt: '2026-11-17T15:20:00Z',
  },
  {
    caseId: 'KYC-0034',
    customerName: 'Selim Arcadius',
    dob: '1978-04-12',
    nationality: 'Syrian',
    address: 'Al-Mazzeh, Damascus, Syria',
    checkResult: 'Potential Match',
    matchedEntry: 'Selim Arcadius (SANC-001)',
    matchReason: "Matched primary name 'Selim Arcadius' · DOB confirmed (1978-04-12) · Nationality matched (Syrian)",
    reviewerDecision: 'Pending review',
    checkedOn: '2026-11-18T08:35:00Z', // 2 h 10 min ago from 10:45 AM
    createdAt: '2026-11-18T08:35:00Z',
    documentsLink: '/documents/KYC-0034',
    documentNames: ['Syrian_ID_Card.pdf'],
  },
  {
    caseId: 'KYC-0033',
    customerName: 'Marc Thorn',
    dob: '1989-01-20',
    nationality: 'German',
    address: 'Mönckebergstraße 8, Hamburg, Germany',
    checkResult: 'Potential Match',
    matchedEntry: 'Markus Thorn (SANC-002)',
    matchReason: "Matched alias 'Marc Thorn' · Nationality matched (German)",
    reviewerDecision: 'Escalated',
    reviewerComment: 'Escalated for enhanced due diligence.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-17T11:45:00Z',
    decidedOn: '2026-11-17T12:05:00Z',
    createdAt: '2026-11-17T11:45:00Z',
  },
  {
    caseId: 'KYC-0032',
    customerName: 'Camilla Rossi',
    dob: '1991-07-02',
    nationality: 'Italian',
    address: 'Via Montenapoleone 18, Milan, Italy',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-17T09:15:00Z',
    decidedOn: '2026-11-17T09:20:00Z',
    createdAt: '2026-11-17T09:15:00Z',
  },

  // 16 Nov 2026 (Mon) - 4 cases (1 potential, 3 cleared)
  {
    caseId: 'KYC-0031',
    customerName: 'Dmitry Volkoff',
    dob: '1972-12-08',
    nationality: 'Russian',
    address: 'Tverskaya St, Moscow, Russia',
    checkResult: 'Potential Match',
    matchedEntry: 'Dmitri Volkov (SANC-007)',
    matchReason: "Matched alias 'Dmitry Volkoff' · DOB confirmed (1972-12-08)",
    reviewerDecision: 'Rejected',
    reviewerComment: 'Confirmed match with asset freeze target.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-16T14:10:00Z',
    decidedOn: '2026-11-16T14:40:00Z',
    createdAt: '2026-11-16T14:10:00Z',
  },
  {
    caseId: 'KYC-0030',
    customerName: 'Alexandre Dupont',
    dob: '1986-09-12',
    nationality: 'French',
    address: 'Rue de Rivoli 88, Paris, France',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean record.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-16T11:20:00Z',
    decidedOn: '2026-11-16T11:28:00Z',
    createdAt: '2026-11-16T11:20:00Z',
  },
  {
    caseId: 'KYC-0029',
    customerName: 'Chloe Bennett',
    dob: '1994-03-22',
    nationality: 'Canadian',
    address: 'Bay Street 100, Toronto, Canada',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Approved.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-16T10:05:00Z',
    decidedOn: '2026-11-16T10:12:00Z',
    createdAt: '2026-11-16T10:05:00Z',
  },
  {
    caseId: 'KYC-0028',
    customerName: 'Liam O’Connor',
    dob: '1990-11-17',
    nationality: 'Irish',
    address: 'Grafton St, Dublin, Ireland',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Approved automatically.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-16T09:30:00Z',
    decidedOn: '2026-11-16T09:35:00Z',
    createdAt: '2026-11-16T09:30:00Z',
  },

  // 13 Nov 2026 (Fri) - 5 cases (1 potential, 4 cleared)
  {
    caseId: 'KYC-0027',
    customerName: 'Tareq Mansur',
    dob: '1980-06-25',
    nationality: 'Lebanese',
    address: 'Hamra St, Beirut, Lebanon',
    checkResult: 'Potential Match',
    matchedEntry: 'Tariq Mansoor (SANC-006)',
    matchReason: "Matched alias 'Tareq Mansur' · DOB confirmed (1980-06-25)",
    reviewerDecision: 'Rejected',
    reviewerComment: 'Sanctioned intermediary match.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-13T16:00:00Z',
    decidedOn: '2026-11-13T16:25:00Z',
    createdAt: '2026-11-13T16:00:00Z',
  },
  {
    caseId: 'KYC-0026',
    customerName: 'Oliver Smith',
    dob: '1988-02-14',
    nationality: 'British',
    address: 'Manchester, UK',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean check.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-13T14:15:00Z',
    decidedOn: '2026-11-13T14:20:00Z',
    createdAt: '2026-11-13T14:15:00Z',
  },
  {
    caseId: 'KYC-0025',
    customerName: 'Sofia Lindqvist',
    dob: '1993-06-19',
    nationality: 'Swedish',
    address: 'Stockholm, Sweden',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Approved.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-13T11:40:00Z',
    decidedOn: '2026-11-13T11:45:00Z',
    createdAt: '2026-11-13T11:40:00Z',
  },
  {
    caseId: 'KYC-0024',
    customerName: 'Kenji Sato',
    dob: '1987-10-30',
    nationality: 'Japanese',
    address: 'Shibuya, Tokyo, Japan',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-13T10:10:00Z',
    decidedOn: '2026-11-13T10:15:00Z',
    createdAt: '2026-11-13T10:10:00Z',
  },
  {
    caseId: 'KYC-0023',
    customerName: 'Maria Fernandez',
    dob: '1996-01-15',
    nationality: 'Spanish',
    address: 'Gran Via, Madrid, Spain',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-13T09:05:00Z',
    decidedOn: '2026-11-13T09:10:00Z',
    createdAt: '2026-11-13T09:05:00Z',
  },

  // 12 Nov 2026 (Thu) - 3 cases (1 potential, 2 cleared)
  {
    caseId: 'KYC-0022',
    customerName: 'Salim Arkadi',
    dob: '1978-04-12',
    nationality: 'Syrian',
    address: 'Aleppo, Syria',
    checkResult: 'Potential Match',
    matchedEntry: 'Selim Arcadius (SANC-001)',
    matchReason: "Matched alias 'Salim Arkadi' · DOB confirmed (1978-04-12)",
    reviewerDecision: 'Rejected',
    reviewerComment: 'Matched known arms embargo entity.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-12T15:30:00Z',
    decidedOn: '2026-11-12T15:55:00Z',
    createdAt: '2026-11-12T15:30:00Z',
  },
  {
    caseId: 'KYC-0021',
    customerName: 'Lucas Meyer',
    dob: '1991-03-25',
    nationality: 'Swiss',
    address: 'Bahnhofstrasse, Zurich, Switzerland',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Passed verification.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-12T11:20:00Z',
    decidedOn: '2026-11-12T11:25:00Z',
    createdAt: '2026-11-12T11:20:00Z',
  },
  {
    caseId: 'KYC-0020',
    customerName: 'Grace Hopper',
    dob: '1993-12-09',
    nationality: 'American',
    address: 'Arlington, VA, USA',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-12T09:40:00Z',
    decidedOn: '2026-11-12T09:45:00Z',
    createdAt: '2026-11-12T09:40:00Z',
  },

  // 11 Nov 2026 (Wed) - 4 cases (1 potential, 3 cleared)
  {
    caseId: 'KYC-0019',
    customerName: 'Dmitri Volkov',
    dob: '1979-05-14',
    nationality: 'Russian',
    address: 'Nevsky Prospekt, St Petersburg, Russia',
    checkResult: 'Potential Match',
    matchedEntry: 'Dmitri Volkov (SANC-007)',
    matchReason: "Matched primary name 'Dmitri Volkov' · Nationality matched (Russian)",
    reviewerDecision: 'Escalated',
    reviewerComment: 'Name matched list entry; nationality matches, DOB differs.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-11T16:10:00Z',
    decidedOn: '2026-11-11T16:30:00Z',
    createdAt: '2026-11-11T16:10:00Z',
  },
  {
    caseId: 'KYC-0018',
    customerName: 'Amina Al-Hassan',
    dob: '1989-07-04',
    nationality: 'Jordanian',
    address: 'Amman, Jordan',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean check.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-11T14:00:00Z',
    decidedOn: '2026-11-11T14:05:00Z',
    createdAt: '2026-11-11T14:00:00Z',
  },
  {
    caseId: 'KYC-0017',
    customerName: 'Gabriel Silva',
    dob: '1992-11-11',
    nationality: 'Brazilian',
    address: 'Avenida Paulista, São Paulo, Brazil',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Standard check complete.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-11T11:15:00Z',
    decidedOn: '2026-11-11T11:20:00Z',
    createdAt: '2026-11-11T11:15:00Z',
  },
  {
    caseId: 'KYC-0016',
    customerName: 'Astrid Nygard',
    dob: '1995-02-28',
    nationality: 'Norwegian',
    address: 'Bergen, Norway',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-11T09:30:00Z',
    decidedOn: '2026-11-11T09:35:00Z',
    createdAt: '2026-11-11T09:30:00Z',
  },

  // 10 Nov 2026 (Tue) - 5 cases (2 potential, 3 cleared)
  {
    caseId: 'KYC-0015',
    customerName: 'Tariq Mansoor',
    dob: '1980-06-25',
    nationality: 'Lebanese',
    address: 'Verdun, Beirut, Lebanon',
    checkResult: 'Potential Match',
    matchedEntry: 'Tariq Mansoor (SANC-006)',
    matchReason: "Matched primary name 'Tariq Mansoor' · DOB confirmed (1980-06-25)",
    reviewerDecision: 'Rejected',
    reviewerComment: 'Direct match on high risk financial facilitator.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-10T15:45:00Z',
    decidedOn: '2026-11-10T16:15:00Z',
    createdAt: '2026-11-10T15:45:00Z',
  },
  {
    caseId: 'KYC-0014',
    customerName: 'Annika Brand',
    dob: '1983-09-15',
    nationality: 'Norwegian',
    address: 'Trondheim, Norway',
    checkResult: 'Potential Match',
    matchedEntry: 'Anika Brandvold (SANC-003)',
    matchReason: "Matched alias 'Annika Brand' · Nationality matched (Norwegian)",
    reviewerDecision: 'Escalated',
    reviewerComment: 'Alias match confirmed for offshore entity owner.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-10T13:20:00Z',
    decidedOn: '2026-11-10T13:40:00Z',
    createdAt: '2026-11-10T13:20:00Z',
  },
  {
    caseId: 'KYC-0013',
    customerName: 'Ethan Wright',
    dob: '1990-04-12',
    nationality: 'New Zealander',
    address: 'Wellington, NZ',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean identity verification.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-10T11:00:00Z',
    decidedOn: '2026-11-10T11:05:00Z',
    createdAt: '2026-11-10T11:00:00Z',
  },
  {
    caseId: 'KYC-0012',
    customerName: 'Fatima Zahra',
    dob: '1994-08-30',
    nationality: 'Moroccan',
    address: 'Casablanca, Morocco',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-10T10:15:00Z',
    decidedOn: '2026-11-10T10:20:00Z',
    createdAt: '2026-11-10T10:15:00Z',
  },
  {
    caseId: 'KYC-0011',
    customerName: 'Leon Schneider',
    dob: '1987-01-19',
    nationality: 'Austrian',
    address: 'Vienna, Austria',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-10T09:00:00Z',
    decidedOn: '2026-11-10T09:05:00Z',
    createdAt: '2026-11-10T09:00:00Z',
  },

  // 09 Nov 2026 (Mon) - 3 cases (0 potential, 3 cleared)
  {
    caseId: 'KYC-0010',
    customerName: 'Hannah Davies',
    dob: '1992-05-17',
    nationality: 'British',
    address: 'Edinburgh, UK',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean passport check.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-09T14:30:00Z',
    decidedOn: '2026-11-09T14:35:00Z',
    createdAt: '2026-11-09T14:30:00Z',
  },
  {
    caseId: 'KYC-0009',
    customerName: 'Mateo Morales',
    dob: '1988-10-02',
    nationality: 'Mexican',
    address: 'Monterrey, Mexico',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Approved.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-09T11:15:00Z',
    decidedOn: '2026-11-09T11:20:00Z',
    createdAt: '2026-11-09T11:15:00Z',
  },
  {
    caseId: 'KYC-0008',
    customerName: 'Zoe Martin',
    dob: '1996-03-21',
    nationality: 'French',
    address: 'Lyon, France',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Verified.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-09T09:10:00Z',
    decidedOn: '2026-11-09T09:15:00Z',
    createdAt: '2026-11-09T09:10:00Z',
  },

  // 06 Nov 2026 (Fri) - 4 cases (1 potential, 3 cleared)
  {
    caseId: 'KYC-0007',
    customerName: 'Markus Thorn',
    dob: '1971-08-22',
    nationality: 'German',
    address: '14 Harbour Lane, Eastmere',
    checkResult: 'Potential Match',
    matchedEntry: 'Marcus Thorne',
    matchReason: "Matched alias 'Markus Thorn' · DOB confirmed (1971-08-22)",
    reviewerDecision: 'Escalated',
    reviewerComment: 'Alias and DOB match; nationality differs. Route to L2 for enhanced due diligence.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-18T10:42:00Z',
    decidedOn: '2026-11-18T10:45:00Z',
    createdAt: '2026-11-18T10:42:00Z',
  },
  {
    caseId: 'KYC-0006',
    customerName: 'Benjamin Scott',
    dob: '1985-11-19',
    nationality: 'American',
    address: 'Austin, TX, USA',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean screening.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-06T13:40:00Z',
    decidedOn: '2026-11-06T13:45:00Z',
    createdAt: '2026-11-06T13:40:00Z',
  },
  {
    caseId: 'KYC-0005',
    customerName: 'Lin Chen',
    dob: '1993-07-28',
    nationality: 'Singaporean',
    address: 'Marina Bay, Singapore',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Pass.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-06T11:00:00Z',
    decidedOn: '2026-11-06T11:05:00Z',
    createdAt: '2026-11-06T11:00:00Z',
  },
  {
    caseId: 'KYC-0004',
    customerName: 'Freja Hansen',
    dob: '1991-09-03',
    nationality: 'Danish',
    address: 'Copenhagen, Denmark',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Clean passport record.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-06T09:15:00Z',
    decidedOn: '2026-11-06T09:20:00Z',
    createdAt: '2026-11-06T09:15:00Z',
  },

  // 05 Nov 2026 (Thu) - 3 cases (1 potential, 2 cleared)
  {
    caseId: 'KYC-0003',
    customerName: 'Marcus Thorne',
    dob: '1982-11-03',
    nationality: 'German',
    address: 'Frankfurt, Germany',
    checkResult: 'Potential Match',
    matchedEntry: 'Markus Thorn (SANC-002)',
    matchReason: "Matched alias 'Marcus Thorne' · DOB confirmed (1982-11-03)",
    reviewerDecision: 'Rejected',
    reviewerComment: 'High confidence shell company fraud link.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-05T14:10:00Z',
    decidedOn: '2026-11-05T14:40:00Z',
    createdAt: '2026-11-05T14:10:00Z',
  },
  {
    caseId: 'KYC-0002',
    customerName: 'Arjun Mehta',
    dob: '1989-06-14',
    nationality: 'Indian',
    address: 'Mumbai, India',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Cleared.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-05T11:30:00Z',
    decidedOn: '2026-11-05T11:35:00Z',
    createdAt: '2026-11-05T11:30:00Z',
  },
  {
    caseId: 'KYC-0001',
    customerName: 'Emma Watson',
    dob: '1994-10-22',
    nationality: 'British',
    address: 'Oxford, UK',
    checkResult: 'No Match',
    matchedEntry: null,
    matchReason: 'No match on any list entry',
    reviewerDecision: 'Approved',
    reviewerComment: 'Standard screening complete.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-05T09:00:00Z',
    decidedOn: '2026-11-05T09:05:00Z',
    createdAt: '2026-11-05T09:00:00Z',
  },
];

// Seed Audit Logs
const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'LOG-007-1',
    caseId: 'KYC-0007',
    event: 'Case Created',
    details: 'Case created for markus thorn with 2 document(s).',
    performedBy: 'reviewer@demo.local',
    timestamp: '2026-11-18T10:42:05Z',
  },
  {
    id: 'LOG-007-2',
    caseId: 'KYC-0007',
    event: 'Screening Completed',
    details:
      'Potential Match: Alias match (markus thorn is a listed alias of Marcus Thorne); DOB match (1971-08-22); Nationality differs (german vs british). Source: Mock Sanctions List.',
    performedBy: 'System (screening flow)',
    timestamp: '2026-11-18T10:42:09Z',
  },
  {
    id: 'LOG-007-3',
    caseId: 'KYC-0007',
    event: 'Decision Recorded',
    details:
      'Escalated: Alias and DOB match; nationality differs. Route to L2 for enhanced due diligence.',
    performedBy: 'reviewer@demo.local',
    timestamp: '2026-11-18T10:45:31Z',
  },
  {
    id: 'LOG-001',
    caseId: 'KYC-0042',
    event: 'Case Created',
    details: 'Customer Lena Varga submitted with 2 documents.',
    performedBy: 'System / Customer Intake',
    timestamp: '2026-11-18T10:27:00Z',
  },
  {
    id: 'LOG-002',
    caseId: 'KYC-0042',
    event: 'Screening Completed',
    details: "Flagged Potential Match against SANC-004: Matched primary name 'Lena Varga' · DOB confirmed (1990-02-14)",
    performedBy: 'Screening Engine',
    timestamp: '2026-11-18T10:27:05Z',
  },
  {
    id: 'LOG-003',
    caseId: 'KYC-0041',
    event: 'Case Created',
    details: 'Customer Priya Raman submitted.',
    performedBy: 'System / Customer Intake',
    timestamp: '2026-11-18T10:12:00Z',
  },
  {
    id: 'LOG-004',
    caseId: 'KYC-0041',
    event: 'Screening Completed',
    details: 'No match on any list entry. Cleared.',
    performedBy: 'Screening Engine',
    timestamp: '2026-11-18T10:12:04Z',
  },
  {
    id: 'LOG-005',
    caseId: 'KYC-0041',
    event: 'Decision Recorded',
    details: 'Reviewer Demo Reviewer approved the case. Comment: Clean identity verification and address proof verified.',
    performedBy: 'Demo Reviewer',
    timestamp: '2026-11-18T10:18:00Z',
  },
  {
    id: 'LOG-006',
    caseId: 'KYC-0034',
    event: 'Case Created',
    details: 'Customer Selim Arcadius submitted.',
    performedBy: 'System / Customer Intake',
    timestamp: '2026-11-18T08:35:00Z',
  },
  {
    id: 'LOG-007',
    caseId: 'KYC-0034',
    event: 'Screening Completed',
    details: "Flagged Potential Match against SANC-001: Matched primary name 'Selim Arcadius' · DOB confirmed (1978-04-12) · Nationality matched (Syrian)",
    performedBy: 'Screening Engine',
    timestamp: '2026-11-18T08:35:05Z',
  },
];

/**
 * Mock KYC Service Implementation
 */
export class MockKycService implements IKycService {
  private cases: KycCase[] = [...SEED_CASES];
  private auditLogs: AuditLogEntry[] = [...SEED_AUDIT_LOGS];
  private sanctionsList: SanctionsEntry[] = [...MOCK_SANCTIONS_LIST];

  addCaseDirectly(newCase: KycCase) {
    const existingIdx = this.cases.findIndex(
      (c) => c.caseId.toLowerCase() === newCase.caseId.toLowerCase()
    );
    if (existingIdx >= 0) {
      this.cases[existingIdx] = newCase;
    } else {
      this.cases.unshift(newCase);
    }
  }

  async getCases(): Promise<KycCase[]> {
    return [...this.cases];
  }

  async getCaseById(caseId: string): Promise<KycCase | null> {
    const found = this.cases.find((c) => c.caseId.toLowerCase() === caseId.toLowerCase());
    return found ? { ...found } : null;
  }

  async getAuditLogs(caseId?: string): Promise<AuditLogEntry[]> {
    if (!caseId) {
      return [...this.auditLogs];
    }
    return this.auditLogs.filter((l) => l.caseId.toLowerCase() === caseId.toLowerCase());
  }

  async getSanctionsList(): Promise<SanctionsEntry[]> {
    return [...this.sanctionsList];
  }

  async screenCustomer(
    customer: {
      customerName: string;
      dob: string;
      nationality: string;
      address: string;
      documents?: DocumentPayloadItem[];
      documentNames?: string[];
    },
    onProgress?: (progress: ScreeningProgress) => void
  ): Promise<{
    caseId: string;
    checkResult: 'No Match' | 'Potential Match';
    matchedEntry?: string | null;
    matchReason?: string | null;
    matchType?: string;
    documentsLink?: string | null;
    documentValidationStatus?: DocumentValidationStatus | string | null;
    documentValidationDetails?: DocumentValidationDetails | string | null;
  }> {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const newCaseNumber = this.cases.length + 1;
    const caseId = `KYC-${String(newCaseNumber).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();
    const docCount = customer.documents?.length ?? customer.documentNames?.length ?? 0;
    const resolvedDocNames =
      customer.documentNames ||
      (customer.documents ? customer.documents.map((d) => d.name) : []);

    // Stage 1: Creating case
    onProgress?.({ stage: 'creating_case' });
    await delay(750);

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}-1`,
      caseId,
      event: 'Case Created',
      details: `Customer ${customer.customerName} submitted for screening with ${docCount} documents.`,
      performedBy: 'System Intake',
      timestamp: nowIso,
    });

    // Stage 2: Filing documents to case folder
    onProgress?.({ stage: 'filing_documents', caseId });
    await delay(850);

    // Stage 3: Screening against Mock Sanctions List
    onProgress?.({ stage: 'screening', caseId });
    await delay(900);

    const screeningResult = screenAgainstSanctions(
      customer.customerName,
      customer.dob,
      customer.nationality,
      this.sanctionsList
    );

    const matchType = screeningResult.matchCriteria.matchedAlias
      ? 'Alias Hit'
      : screeningResult.matchCriteria.dobConfirmed
        ? 'Direct Hit'
        : screeningResult.matchCriteria.nationalityOnly
          ? 'Nationality Match'
          : 'None';

    const newCase: KycCase = {
      caseId,
      customerName: customer.customerName,
      dob: customer.dob,
      nationality: customer.nationality,
      address: customer.address,
      checkResult: screeningResult.checkResult,
      matchedEntry: screeningResult.matchedEntry,
      matchReason: screeningResult.matchReason,
      reviewerDecision: screeningResult.checkResult === 'Potential Match' ? 'Pending review' : 'Approved',
      reviewer: screeningResult.checkResult === 'No Match' ? 'System / Auto-cleared' : null,
      checkedOn: nowIso,
      decidedOn: screeningResult.checkResult === 'No Match' ? nowIso : null,
      createdAt: nowIso,
      documentNames: resolvedDocNames,
      documentsLink: `/documents/${caseId}`,
    };

    this.cases.unshift(newCase);

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}-2`,
      caseId,
      event: 'Screening Completed',
      details: `${screeningResult.checkResult}: ${screeningResult.matchReason}`,
      performedBy: 'Screening Engine',
      timestamp: nowIso,
    });

    // Stage 4: Preparing result
    onProgress?.({ stage: 'preparing_result', caseId });
    await delay(600);

    onProgress?.({ stage: 'completed', caseId });

    return {
      caseId,
      checkResult: screeningResult.checkResult,
      matchedEntry: screeningResult.matchedEntry,
      matchReason: screeningResult.matchReason,
      matchType,
      documentsLink: `/documents/${caseId}`,
      documentValidationStatus: null,
      documentValidationDetails: null,
    };
  }

  async recordDecision(
    caseId: string,
    decision: 'Approved' | 'Rejected' | 'Escalated',
    comment: string,
    reviewer: string,
    _customerData?: {
      customerName?: string;
      dob?: string;
      nationality?: string;
      address?: string;
      documents?: DocumentPayloadItem[];
    }
  ): Promise<KycCase> {
    const idx = this.cases.findIndex((c) => c.caseId.toLowerCase() === caseId.toLowerCase());
    const nowIso = new Date().toISOString();
    let updatedCase: KycCase;

    if (idx !== -1) {
      updatedCase = {
        ...this.cases[idx],
        reviewerDecision: decision,
        reviewerComment: comment,
        reviewer,
        decidedOn: nowIso,
      };
      this.cases[idx] = updatedCase;
    } else {
      updatedCase = {
        caseId,
        customerName: _customerData?.customerName || 'Customer',
        dob: _customerData?.dob || '',
        nationality: _customerData?.nationality || '',
        address: _customerData?.address || '',
        checkResult: 'Potential Match',
        reviewerDecision: decision,
        reviewerComment: comment,
        reviewer,
        checkedOn: nowIso,
        decidedOn: nowIso,
        createdAt: nowIso,
        documents: _customerData?.documents,
        documentNames: _customerData?.documents?.map((d) => d.name) || [],
      };
      this.cases.unshift(updatedCase);
    }

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}-3`,
      caseId,
      event: 'Decision Recorded',
      details: `Reviewer ${reviewer} recorded decision: ${decision}. Comment: ${comment}`,
      performedBy: reviewer,
      timestamp: nowIso,
    });

    return updatedCase;
  }

  /**
   * Computes dashboard statistics over the last `days` (default 14):
   * total, potentialMatches, hitRate, cleared, pendingReview, oldestPendingMinutes,
   * todayTotal, todayPotential, perDay [{date, dayNumber, dayLabel, total, potential, cleared, isToday}],
   * and matchBasis {aliasHits, dobConfirmed, nationalityOnly} parsed from matchReason.
   */
  async getDashboardStats(days = 14): Promise<DashboardStats> {
    return calculateDashboardStats(this.cases, days);
  }
}

export function calculateDashboardStats(allCases: KycCase[], days = 14): DashboardStats {
  const now = new Date();

  // Helper to parse case date cleanly
  const getCaseDate = (c: KycCase): Date | null => {
    const raw = c.createdAt || c.checkedOn;
    if (!raw) return null;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(raw.replace(/,/g, ''));
    if (!isNaN(d2.getTime())) return d2;
    return null;
  };

  const isSameCalendarDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isPotCase = (c: KycCase): boolean => {
    if (c.checkResult === 'Potential Match') return true;
    const rawEntry = (c.matchedEntry || '').trim().toLowerCase();
    return Boolean(rawEntry && rawEntry !== 'none' && rawEntry !== 'null' && rawEntry !== '—' && rawEntry !== '-');
  };

  const total = allCases.length;
  const potentialMatches = allCases.filter(isPotCase).length;
  const cleared = total - potentialMatches;
  const hitRate = total > 0 ? Math.round((potentialMatches / total) * 100) : 0;

  const pendingCases = allCases.filter((c) => c.reviewerDecision === 'Pending review');
  const pendingReview = pendingCases.length;

  // Calculate oldest pending minutes
  let oldestPendingMinutes = 0;
  let oldestPendingCaseId: string | undefined = undefined;

  if (pendingCases.length > 0) {
    const sortedPending = [...pendingCases].sort((a, b) => {
      const timeA = getCaseDate(a)?.getTime() || 0;
      const timeB = getCaseDate(b)?.getTime() || 0;
      return timeA - timeB;
    });
    const oldest = sortedPending[0];
    oldestPendingCaseId = oldest.caseId;
    const oldestTime = getCaseDate(oldest)?.getTime();
    if (oldestTime) {
      const diffMs = Math.max(0, now.getTime() - oldestTime);
      oldestPendingMinutes = Math.floor(diffMs / (1000 * 60));
    }
  }

  // Today's stats
  const todayCases = allCases.filter((c) => {
    const cDate = getCaseDate(c);
    return cDate ? isSameCalendarDay(cDate, now) : false;
  });
  const todayTotal = todayCases.length;
  const todayPotential = todayCases.filter(isPotCase).length;

  // Build day-by-day stats for the last N days
  const perDay: DayScreeningStat[] = [];
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1), 0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const targetDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const dayNumber = targetDate.getDate();
    const isToday = i === days - 1;
    const dayLabel = isToday ? 'Today' : String(dayNumber);
    const targetIsoDate = targetDate.toISOString().split('T')[0];

    const dayCases = allCases.filter((c) => {
      const cDate = getCaseDate(c);
      return cDate ? isSameCalendarDay(cDate, targetDate) : false;
    });

    const dayTotal = dayCases.length;
    const dayPotential = dayCases.filter(isPotCase).length;
    const dayCleared = dayTotal - dayPotential;

    perDay.push({
      date: targetIsoDate,
      dayNumber,
      dayLabel,
      total: dayTotal,
      potential: dayPotential,
      cleared: dayCleared,
      isToday,
    });
  }

  // Parse matchBasis {aliasHits, dobConfirmed, nationalityOnly} from matchReason
  let aliasHits = 0;
  let dobConfirmed = 0;
  let nationalityOnly = 0;

  for (const c of allCases) {
    if (isPotCase(c)) {
      const reason = (c.matchReason || '').toLowerCase();
      if (reason.includes('alias')) aliasHits++;
      const hasDob = reason.includes('dob');
      const hasNat = reason.includes('nationality');
      if (hasDob) dobConfirmed++;
      else if (hasNat) nationalityOnly++;
    }
  }

  return {
    total,
    potentialMatches,
    hitRate,
    cleared,
    pendingReview,
    oldestPendingMinutes,
    oldestPendingCaseId,
    todayTotal,
    todayPotential,
    perDay,
    matchBasis: {
      aliasHits,
      dobConfirmed,
      nationalityOnly,
    },
  };
}

export function mapKycCaseReadToKycCase(item: KYC_CasesRead): KycCase {
  const caseId = item.Title || (item.ID ? `KYC-${String(item.ID).padStart(4, '0')}` : `KYC-${Date.now().toString().slice(-4)}`);
  const rawResult =
    (item.CheckResult as any)?.Value ||
    (typeof item.CheckResult === 'string' ? item.CheckResult : '') ||
    '';
  const rawMatchedEntry = (item.MatchedEntry || '').trim();
  const hasMatchedEntry = Boolean(
    rawMatchedEntry &&
    rawMatchedEntry.toLowerCase() !== 'none' &&
    rawMatchedEntry.toLowerCase() !== 'null' &&
    rawMatchedEntry.toLowerCase() !== '—' &&
    rawMatchedEntry.toLowerCase() !== '-'
  );
  const rawReason = (item.MatchReason || '').toLowerCase();
  const hasMatchReason = Boolean(
    rawReason &&
    !rawReason.includes('no match') &&
    (rawReason.includes('matched') || rawReason.includes('hit') || rawReason.includes('sanction') || rawReason.includes('embargo') || rawReason.includes('flagged'))
  );

  const isPotMatch =
    rawResult.toLowerCase().includes('potential') ||
    (rawResult.toLowerCase().includes('match') && !rawResult.toLowerCase().includes('no')) ||
    hasMatchedEntry ||
    hasMatchReason;

  const checkResult: CheckResult = isPotMatch ? 'Potential Match' : 'No Match';

  let reviewerDecision: ReviewerDecision = 'Pending review';
  if (item.ReviewerDecision) {
    const rd = item.ReviewerDecision.toLowerCase();
    if (rd.includes('approved') || rd === 'approve') reviewerDecision = 'Approved';
    else if (rd.includes('rejected') || rd === 'reject') reviewerDecision = 'Rejected';
    else if (rd.includes('escalated') || rd === 'escalate') reviewerDecision = 'Escalated';
  }

  const reviewer =
    item.Reviewer?.DisplayName ||
    item.Reviewer?.Email ||
    item.Author?.DisplayName ||
    item.Author?.Email ||
    item['Reviewer#Claims'] ||
    null;

  // Document Validation SharePoint columns
  const rawDocStatus =
    (item as any).DocumentValidationStatus ||
    (item as any).DocumentStatus ||
    (item as any)['Document status'] ||
    (item as any)['Document_x0020_status'] ||
    (item as any)['Document_x0020_Status'] ||
    null;

  const rawDocDetails =
    (item as any).DocumentValidationDetails ||
    (item as any).Validation ||
    (item as any)['validation'] ||
    (item as any)['Validation'] ||
    (item as any)['Validation Details'] ||
    (item as any)['ValidationDetails'] ||
    null;

  const rawDocDate =
    (item as any).DocumentValidationDate ||
    (item as any).DatetimeOfValidation ||
    (item as any)['datetime of validaton'] ||
    (item as any)['Datetime of validation'] ||
    (item as any)['Datetime_x0020_of_x0020_validaton'] ||
    (item as any)['Datetime_x0020_of_x0020_validation'] ||
    null;

  const parsedDocDetails = parseDocumentValidationDetails(rawDocDetails);
  const docStatus = (rawDocStatus || parsedDocDetails?.overallValidationStatus || null) as DocumentValidationStatus | null;

  return {
    caseId,
    customerName: item.CustomerName || item.Title || 'Unknown Customer',
    dob: item.DOB || '',
    nationality: item.Nationality || '',
    address: item.Address || '',
    checkResult,
    matchedEntry: item.MatchedEntry || null,
    matchReason: item.MatchReason || null,
    reviewerDecision,
    reviewerComment: item.ReviewerComment || null,
    reviewer,
    checkedOn: item.CheckedOn || item.Created || new Date().toISOString(),
    decidedOn: item.DecidedOn || null,
    documentsLink: item.DocumentsLink || `/documents/${caseId}`,
    documentNames: [],
    documentValidationStatus: docStatus,
    documentValidationDetails: parsedDocDetails,
    documentValidationDate: rawDocDate,
    createdAt: item.Created || item.CheckedOn || new Date().toISOString(),
  };
}

/**
 * Power Apps / SharePoint implementation (production / live connector ready)
 */
export class PowerKycService implements IKycService {
  private mockFallback = new MockKycService();

  addCaseDirectly(newCase: KycCase) {
    this.mockFallback.addCaseDirectly(newCase);
  }

  async getCases(): Promise<KycCase[]> {
    try {
      console.log('[SharePoint] Fetching live cases from KYC_Cases via KYC_CasesService.getAll()...');
      const response = await KYC_CasesService.getAll();
      console.log('[SharePoint] KYC_CasesService.getAll() response:', response);

      const items: KYC_CasesRead[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray((response?.data as any)?.value)
        ? (response.data as any).value
        : [];

      if (response && (response.success || items.length > 0)) {
        console.log(`[SharePoint] Retrieved ${items.length} live cases from KYC_Cases SharePoint list.`);
        const liveCases = items.map(mapKycCaseReadToKycCase);
        // Sort newest first by Created or CheckedOn
        liveCases.sort((a, b) => new Date(b.createdAt || b.checkedOn).getTime() - new Date(a.createdAt || a.checkedOn).getTime());
        return liveCases;
      }
    } catch (spErr) {
      console.warn('[SharePoint] Live KYC_CasesService fetch failed or running standalone, falling back to mock cases:', spErr);
    }
    return this.mockFallback.getCases();
  }

  async getCaseById(caseId: string): Promise<KycCase | null> {
    try {
      const all = await this.getCases();
      const match = all.find((c) => c.caseId.toLowerCase() === caseId.toLowerCase());
      if (match) return match;
    } catch (err) {
      console.warn('[SharePoint] Live getCaseById failed, falling back to mock:', err);
    }
    return this.mockFallback.getCaseById(caseId);
  }

  async getAuditLogs(caseId?: string): Promise<AuditLogEntry[]> {
    try {
      console.log(`[SharePoint] Fetching live audit logs from KYC_AuditLog list via KYC_AuditLogService.getAll()...`);
      const response = await KYC_AuditLogService.getAll();
      console.log('[SharePoint] KYC_AuditLogService.getAll() response:', response);

      const items: KYC_AuditLogRead[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray((response?.data as any)?.value)
        ? (response.data as any).value
        : [];

      if (response && (response.success || items.length > 0)) {
        console.log(`[SharePoint] Successfully retrieved ${items.length} audit logs from SharePoint.`);
        const mappedLogs: AuditLogEntry[] = items.map((item: KYC_AuditLogRead) => {
          const performedBy =
            item.PerformedBy?.DisplayName ||
            item.PerformedBy?.Email ||
            item.Author?.DisplayName ||
            item.Author?.Email ||
            item['PerformedBy#Claims'] ||
            'System';

          const resolvedCaseId = (item.CaseID || (item.Title?.startsWith('KYC-') ? item.Title : '') || '').trim();
          let event = item.Title || 'Audit Log';
          if (event.startsWith('KYC-')) {
            event = item.ReviewerDecision ? 'Decision Recorded' : 'Screening Completed';
          }

          return {
            id: String(item.ID || Math.random()),
            caseId: resolvedCaseId,
            event: event as any,
            details: item.Details || item.ReviewerComments || 'Action recorded.',
            performedBy,
            timestamp: item.Timestamp || item.Created || new Date().toISOString(),
          };
        });

        mappedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (caseId) {
          const cid = caseId.toLowerCase();
          const filtered = mappedLogs.filter(
            (l) => l.caseId.toLowerCase() === cid || (l.details && l.details.toLowerCase().includes(cid))
          );
          return filtered;
        }

        return mappedLogs;
      }
    } catch (spErr) {
      console.warn('[SharePoint] Live KYC_AuditLogService fetch failed or running standalone, falling back to local audit logs:', spErr);
    }
    return this.mockFallback.getAuditLogs(caseId);
  }

  async getSanctionsList(): Promise<SanctionsEntry[]> {
    return this.mockFallback.getSanctionsList();
  }

  async screenCustomer(
    customer: {
      customerName: string;
      dob: string;
      nationality: string;
      address: string;
      documents?: DocumentPayloadItem[];
      documentNames?: string[];
    },
    onProgress?: (progress: ScreeningProgress) => void
  ) {
    console.log('[Power Automate] Initiating screening flow execution for:', customer.customerName);
    onProgress?.({ stage: 'creating_case' });
    const resolvedDocNames =
      customer.documentNames ||
      (customer.documents ? customer.documents.map((d) => d.name) : []);

    try {
      // Document JSON payload matching Power Automate Parse JSON action:
      // Exact structure: Array of { name: string, contentBytes: string }
      // If no documents are attached, send empty array []
      const docPayload: DocumentPayloadItem[] = (customer.documents || []).map((doc) => ({
        name: doc.name,
        contentBytes: doc.contentBytes,
      }));
      const docJson = JSON.stringify(docPayload);

      console.log(
        `[Power Automate] Prepared DocumentsJson payload (${docPayload.length} documents):`,
        docPayload.map((d) => ({ name: d.name, base64Length: d.contentBytes?.length || 0 }))
      );

      const userEmail = await getCurrentUserEmail();
      console.log(`[Power Automate] Calling KYC_ScreenCustomerService.Run with PerformedByEmail (${userEmail})...`);
      const flowPromise = KYC_ScreenCustomerService.Run({
        text: customer.customerName,
        text_1: customer.dob,
        text_2: customer.nationality,
        text_3: customer.address,
        text_4: docJson,
        text_5: userEmail,
      });

      // Visual progress transition for stage 1 & 2 while flow executes
      await new Promise((r) => setTimeout(r, 700));
      onProgress?.({ stage: 'filing_documents' });

      const flowResult = await flowPromise;
      console.log('[Power Automate] Flow response received:', flowResult);

      onProgress?.({ stage: 'screening' });
      await new Promise((r) => setTimeout(r, 700));

      onProgress?.({ stage: 'preparing_result' });
      await new Promise((r) => setTimeout(r, 400));

      if (!flowResult || !flowResult.data) {
        const errorMsg =
          (flowResult as any)?.error?.message ||
          (flowResult as any)?.errorMessage ||
          'Power Automate screening flow returned an empty response or failed to complete.';
        console.error('[Power Automate] Flow execution returned unsuccessful result:', errorMsg, flowResult);
        onProgress?.({ stage: 'failed', error: errorMsg });
        throw new Error(errorMsg);
      }

      const data = flowResult.data;
      const caseId = data.caseid || (data as any).CaseID || `KYC-${Date.now().toString().slice(-4)}`;
      const checkResult = ((data.checkresult || (data as any).CheckResult) as CheckResult) || 'Potential Match';
      const matchedEntry = data.matchedentry || (data as any).MatchedEntry || null;
      const matchReason = data.matchreason || (data as any).MatchReason || null;
      const matchType = data.matchtype || (data as any).MatchType || 'Screening Complete';
      const documentsLink = data.documentslink || (data as any).DocumentsLink || `/documents/${caseId}`;

      // Capture DocumentValidationStatus and DocumentValidationDetails from flow response
      const rawDocValidationStatus =
        data.documentvalidationstatus ||
        (data as any).DocumentValidationStatus ||
        (data as any)['DocumentValidationStatus'] ||
        null;

      const rawDocValidationDetails =
        data.documentvalidationdetails ||
        (data as any).DocumentValidationDetails ||
        (data as any)['DocumentValidationDetails'] ||
        null;

      console.log('[Power Automate] Captured DocumentValidationStatus:', rawDocValidationStatus);
      console.log('[Power Automate] Captured DocumentValidationDetails:', rawDocValidationDetails);

      const parsedValidationDetails = parseDocumentValidationDetails(rawDocValidationDetails);
      const docValidationStatus = (rawDocValidationStatus || parsedValidationDetails?.overallValidationStatus || null) as DocumentValidationStatus | null;

      const newCase: KycCase = {
        caseId,
        customerName: customer.customerName,
        dob: customer.dob,
        nationality: customer.nationality,
        address: customer.address,
        checkResult,
        matchedEntry,
        matchReason,
        reviewerDecision: 'Pending review',
        checkedOn: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        documentNames: resolvedDocNames,
        documents: customer.documents,
        documentsLink,
        documentValidationStatus: docValidationStatus,
        documentValidationDetails: parsedValidationDetails,
        documentValidationDate: new Date().toISOString(),
      };

      this.mockFallback.addCaseDirectly(newCase);
      onProgress?.({ stage: 'completed', caseId });

      return {
        caseId,
        checkResult,
        matchedEntry,
        matchReason,
        matchType,
        documentsLink,
        documentValidationStatus: docValidationStatus,
        documentValidationDetails: parsedValidationDetails,
      };
    } catch (flowErr: any) {
      console.error('[Power Automate] Live screening flow failed:', flowErr);
      const errorMsg =
        flowErr?.message ||
        (typeof flowErr === 'string' ? flowErr : 'Power Automate screening flow execution failed.');
      onProgress?.({ stage: 'failed', error: errorMsg });
      throw new Error(errorMsg);
    }
  }

  async recordDecision(
    caseId: string,
    decision: 'Approved' | 'Rejected' | 'Escalated',
    comment: string,
    reviewer: string,
    customerData?: {
      customerName?: string;
      dob?: string;
      nationality?: string;
      address?: string;
      documents?: DocumentPayloadItem[];
    }
  ): Promise<KycCase> {
    const userEmail = await getCurrentUserEmail();
    const reviewerEmail = userEmail || reviewer;

    console.log(`[Power Automate] Recording reviewer decision:`, {
      caseId,
      decision,
      comment,
      reviewer: reviewerEmail,
    });

    // 1. Flow: KYC - Record Decision (KYC_RecordDecisionService.Run)
    // Parameter Schema:
    // text: CaseID (title of KYC Cases, e.g. "KYC-20261118-194444")
    // text_1: ReviewerDecision ("Approved" | "Rejected" | "Escalated")
    // text_2: ReviewerComment (reviewer comment)
    // text_3: ReviewerEmail (logged-in user email)
    let flowCreatedAudit = false;
    try {
      const payload: any = {
        text: caseId,
        text_1: decision,
        text_2: comment,
        text_3: reviewerEmail,
        // Named parameter aliases for Power Automate triggers
        CaseID: caseId,
        ReviewerDecision: decision,
        ReviewerDec: decision,
        ReviewerComment: comment,
        ReviewerCom: comment,
        ReviewerEmail: reviewerEmail,
        ReviewerEma: reviewerEmail,
      };

      console.log(`[Power Automate] Invoking KYC_RecordDecisionService.Run with:`, payload);
      const recordResult = await KYC_RecordDecisionService.Run(payload);
      console.log('[Power Automate] KYC_RecordDecisionService.Run response:', recordResult);
      if (recordResult) {
        flowCreatedAudit = true;
      }
    } catch (recordErr) {
      console.warn('[Power Automate] KYC_RecordDecisionService execution failed or running standalone:', recordErr);
    }

    // 2. Direct SharePoint update to KYC_Cases to ensure ReviewerComment & Decision are saved
    // CRITICAL: Preserve CheckResult so SharePoint never resets a Potential Match to No Match upon decision recording!
    let preservedCheckResult: CheckResult = 'Potential Match';
    let matchedCaseRead: KYC_CasesRead | undefined;
    try {
      const casesRes = await KYC_CasesService.getAll();
      const items: KYC_CasesRead[] = Array.isArray(casesRes?.data) ? casesRes.data : [];
      const match = items.find((it) => (it.Title || '').toLowerCase() === caseId.toLowerCase());
      if (match && match.ID) {
        matchedCaseRead = match;
        const rawResult =
          (match.CheckResult as any)?.Value ||
          (typeof match.CheckResult === 'string' ? match.CheckResult : '') ||
          '';
        const rawMatchedEntry = (match.MatchedEntry || '').trim();
        const hasMatchedEntry = Boolean(
          rawMatchedEntry &&
          rawMatchedEntry.toLowerCase() !== 'none' &&
          rawMatchedEntry.toLowerCase() !== 'null' &&
          rawMatchedEntry.toLowerCase() !== '—' &&
          rawMatchedEntry.toLowerCase() !== '-'
        );
        const rawReason = (match.MatchReason || '').toLowerCase();
        const hasMatchReason = Boolean(
          rawReason &&
          !rawReason.includes('no match') &&
          (rawReason.includes('matched') || rawReason.includes('hit') || rawReason.includes('sanction') || rawReason.includes('embargo') || rawReason.includes('flagged'))
        );

        const isPotMatch =
          rawResult.toLowerCase().includes('potential') ||
          (rawResult.toLowerCase().includes('match') && !rawResult.toLowerCase().includes('no')) ||
          hasMatchedEntry ||
          hasMatchReason;

        preservedCheckResult = isPotMatch ? 'Potential Match' : 'No Match';

        console.log(`[SharePoint] Updating live KYC_Cases ID ${match.ID} with decision: ${decision}, comment: ${comment}, CheckResult: ${preservedCheckResult}`);
        await KYC_CasesService.update(String(match.ID), {
          CheckResult: preservedCheckResult,
          ReviewerDecision: decision,
          ReviewerComment: comment,
          DecidedOn: new Date().toISOString(),
        });
      }
    } catch (spCasesErr) {
      console.warn('[SharePoint] Direct KYC_Cases update notice:', spCasesErr);
    }

    // 3. Fallback only: If flow didn't run or failed, write directly to KYC_AuditLog
    // (Prevents creating duplicate audit log entries when the Power Automate flow already creates one)
    if (!flowCreatedAudit) {
      try {
        console.log(`[SharePoint] Flow did not run; creating fallback live audit log entry for case ${caseId}...`);
        await KYC_AuditLogService.create({
          Title: 'Decision Recorded',
          CaseID: caseId,
          ReviewerDecision: decision,
          ReviewerComments: comment,
          Details: `Reviewer decision: ${decision}. Comment: ${comment || 'Decision recorded by reviewer.'}`,
          Timestamp: new Date().toISOString(),
        });
      } catch (spAuditErr) {
        console.warn('[SharePoint] Fallback KYC_AuditLog creation notice:', spAuditErr);
      }
    }

    const fallbackCase = await this.mockFallback.recordDecision(caseId, decision, comment, reviewer, customerData);
    if (matchedCaseRead) {
      const mapped = mapKycCaseReadToKycCase(matchedCaseRead);
      return {
        ...mapped,
        checkResult: preservedCheckResult,
        reviewerDecision: decision,
        reviewerComment: comment,
        reviewer: reviewerEmail,
        decidedOn: new Date().toISOString(),
      };
    }
    fallbackCase.checkResult = preservedCheckResult;
    return fallbackCase;
  }

  async getDashboardStats(days = 14): Promise<DashboardStats> {
    const allCases = await this.getCases();
    return calculateDashboardStats(allCases, days);
  }
}

// Singleton instances - active KYC Service is PowerKycService (which calls KYC_ScreenCustomerService.Run)
export const mockKycService = new MockKycService();
export const powerKycService = new PowerKycService();
export const kycService: IKycService = powerKycService;
