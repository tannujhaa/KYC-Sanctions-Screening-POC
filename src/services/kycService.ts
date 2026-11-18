import type {
  KycCase,
  SanctionsEntry,
  AuditLogEntry,
  DashboardStats,
  DayScreeningStat,
} from '../types/kyc';

export interface IKycService {
  getCases(): Promise<KycCase[]>;
  getCaseById(caseId: string): Promise<KycCase | null>;
  getAuditLogs(caseId?: string): Promise<AuditLogEntry[]>;
  getSanctionsList(): Promise<SanctionsEntry[]>;
  screenCustomer(customer: {
    customerName: string;
    dob: string;
    nationality: string;
    address: string;
    documentNames?: string[];
  }): Promise<{
    caseId: string;
    checkResult: 'No Match' | 'Potential Match';
    matchedEntry?: string | null;
    matchReason?: string | null;
  }>;
  recordDecision(
    caseId: string,
    decision: 'Approved' | 'Rejected' | 'Escalated',
    comment: string,
    reviewer: string
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
    customerName: 'Elena Varga',
    dob: '1990-02-14',
    nationality: 'Hungarian',
    address: 'Debrecen, Hungary',
    checkResult: 'Potential Match',
    matchedEntry: 'Lena Varga (SANC-004)',
    matchReason: "Matched alias 'Elena Varga' · DOB confirmed (1990-02-14)",
    reviewerDecision: 'Rejected',
    reviewerComment: 'Asset concealment risk confirmed.',
    reviewer: 'Demo Reviewer',
    checkedOn: '2026-11-06T15:20:00Z',
    decidedOn: '2026-11-06T15:45:00Z',
    createdAt: '2026-11-06T15:20:00Z',
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

  async screenCustomer(customer: {
    customerName: string;
    dob: string;
    nationality: string;
    address: string;
    documentNames?: string[];
  }): Promise<{
    caseId: string;
    checkResult: 'No Match' | 'Potential Match';
    matchedEntry?: string | null;
    matchReason?: string | null;
  }> {
    const newCaseNumber = this.cases.length + 1;
    const caseId = `KYC-${String(newCaseNumber).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    const screeningResult = screenAgainstSanctions(
      customer.customerName,
      customer.dob,
      customer.nationality,
      this.sanctionsList
    );

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
      documentNames: customer.documentNames || [],
      documentsLink: `/documents/${caseId}`,
    };

    this.cases.unshift(newCase);

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}-1`,
      caseId,
      event: 'Case Created',
      details: `Customer ${customer.customerName} submitted for screening.`,
      performedBy: 'System Intake',
      timestamp: nowIso,
    });

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}-2`,
      caseId,
      event: 'Screening Completed',
      details: `${screeningResult.checkResult}: ${screeningResult.matchReason}`,
      performedBy: 'Screening Engine',
      timestamp: nowIso,
    });

    return {
      caseId,
      checkResult: screeningResult.checkResult,
      matchedEntry: screeningResult.matchedEntry,
      matchReason: screeningResult.matchReason,
    };
  }

  async recordDecision(
    caseId: string,
    decision: 'Approved' | 'Rejected' | 'Escalated',
    comment: string,
    reviewer: string
  ): Promise<KycCase> {
    const idx = this.cases.findIndex((c) => c.caseId.toLowerCase() === caseId.toLowerCase());
    if (idx === -1) {
      throw new Error(`Case ${caseId} not found`);
    }

    const nowIso = new Date().toISOString();
    const updatedCase: KycCase = {
      ...this.cases[idx],
      reviewerDecision: decision,
      reviewerComment: comment,
      reviewer,
      decidedOn: nowIso,
    };

    this.cases[idx] = updatedCase;

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
    const allCases = await this.getCases();

    // Baseline reference: Wed 18 Nov 2026, 10:45 AM
    const now = new Date('2026-11-18T10:45:00Z');

    // 14 days window (Nov 5 to Nov 18, 2026)
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const filteredCases = allCases.filter((c) => {
      const caseDate = new Date(c.createdAt);
      return caseDate >= startDate && caseDate <= now;
    });

    const total = filteredCases.length;
    const potentialMatches = filteredCases.filter((c) => c.checkResult === 'Potential Match').length;
    const cleared = total - potentialMatches;
    const hitRate = total > 0 ? Math.round((potentialMatches / total) * 100) : 0;

    const pendingCases = filteredCases.filter((c) => c.reviewerDecision === 'Pending review');
    const pendingReview = pendingCases.length;

    // Calculate oldest pending minutes
    let oldestPendingMinutes = 0;
    let oldestPendingCaseId: string | undefined = undefined;

    if (pendingCases.length > 0) {
      // Sort oldest first (smallest timestamp)
      const sortedPending = [...pendingCases].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const oldest = sortedPending[0];
      oldestPendingCaseId = oldest.caseId;
      const oldestTime = new Date(oldest.createdAt).getTime();
      const diffMs = Math.max(0, now.getTime() - oldestTime);
      oldestPendingMinutes = Math.floor(diffMs / (1000 * 60));
    }

    // Today's stats (Nov 18, 2026)
    const todayCases = filteredCases.filter((c) => {
      const d = new Date(c.createdAt);
      return (
        d.getUTCFullYear() === now.getUTCFullYear() &&
        d.getUTCMonth() === now.getUTCMonth() &&
        d.getUTCDate() === now.getUTCDate()
      );
    });
    const todayTotal = todayCases.length;
    const todayPotential = todayCases.filter((c) => c.checkResult === 'Potential Match').length;

    // Build day-by-day stats for the last 14 days
    const perDay: DayScreeningStat[] = [];
    for (let i = 0; i < days; i++) {
      const targetDate = new Date(startDate);
      targetDate.setUTCDate(startDate.getUTCDate() + i);

      const dayNumber = targetDate.getUTCDate();
      const isToday = i === days - 1;
      const dayLabel = isToday ? 'Today' : String(dayNumber);

      const targetIsoDate = targetDate.toISOString().split('T')[0];

      const dayCases = filteredCases.filter((c) => {
        const cDate = new Date(c.createdAt);
        return (
          cDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
          cDate.getUTCMonth() === targetDate.getUTCMonth() &&
          cDate.getUTCDate() === targetDate.getUTCDate()
        );
      });

      const dayTotal = dayCases.length;
      const dayPotential = dayCases.filter((c) => c.checkResult === 'Potential Match').length;
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

    for (const c of filteredCases) {
      if (c.checkResult === 'Potential Match') {
        const reason = c.matchReason || '';
        const normReason = reason.toLowerCase();

        if (normReason.includes('alias')) {
          aliasHits++;
        }

        const hasDob = normReason.includes('dob');
        const hasNat = normReason.includes('nationality');

        if (hasDob) {
          dobConfirmed++;
        } else if (hasNat) {
          nationalityOnly++;
        }
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
}

/**
 * Power Apps / SharePoint implementation (production / live connector ready)
 */
export class PowerKycService implements IKycService {
  private mockFallback = new MockKycService();

  async getCases(): Promise<KycCase[]> {
    // Falls back to mock or calls Power Apps connector when running in Power Apps container
    return this.mockFallback.getCases();
  }

  async getCaseById(caseId: string): Promise<KycCase | null> {
    return this.mockFallback.getCaseById(caseId);
  }

  async getAuditLogs(caseId?: string): Promise<AuditLogEntry[]> {
    return this.mockFallback.getAuditLogs(caseId);
  }

  async getSanctionsList(): Promise<SanctionsEntry[]> {
    return this.mockFallback.getSanctionsList();
  }

  async screenCustomer(customer: {
    customerName: string;
    dob: string;
    nationality: string;
    address: string;
    documentNames?: string[];
  }) {
    return this.mockFallback.screenCustomer(customer);
  }

  async recordDecision(
    caseId: string,
    decision: 'Approved' | 'Rejected' | 'Escalated',
    comment: string,
    reviewer: string
  ): Promise<KycCase> {
    return this.mockFallback.recordDecision(caseId, decision, comment, reviewer);
  }

  async getDashboardStats(days = 14): Promise<DashboardStats> {
    return this.mockFallback.getDashboardStats(days);
  }
}

// Singleton instances
export const mockKycService = new MockKycService();
export const powerKycService = new PowerKycService();
export const kycService: IKycService = mockKycService;
