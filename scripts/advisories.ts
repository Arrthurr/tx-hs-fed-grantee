export type AdvisorySeverity = 'critical' | 'high' | 'moderate' | 'low' | 'info';
export type AdvisoryScope = 'production' | 'development';

export interface AdvisoryException {
  id: string;
  package: string;
  severity: AdvisorySeverity;
  scope: AdvisoryScope;
  rationale: string;
  owner: string;
  reviewBy: string;
}

export interface AuditFinding {
  id: string;
  package: string;
  severity: AdvisorySeverity;
  title: string;
  url: string;
  scope: AdvisoryScope;
}

export interface NpmAuditViaAdvisory {
  source?: number | string;
  name?: string;
  title?: string;
  severity?: AdvisorySeverity;
  url?: string;
}

export interface NpmAuditVulnerability {
  severity?: AdvisorySeverity;
  via?: Array<string | NpmAuditViaAdvisory>;
}

export interface NpmAuditReport {
  vulnerabilities?: Record<string, NpmAuditVulnerability>;
}

export interface EvaluateAdvisoriesInput {
  production: AuditFinding[];
  development: AuditFinding[];
  exceptions: AdvisoryException[];
  today: string;
}

export interface EvaluateAdvisoriesResult {
  ok: boolean;
  untriaged: AuditFinding[];
  stale: Array<{ exception: AdvisoryException; finding: AuditFinding }>;
  unused: AdvisoryException[];
  mismatched: Array<{ exception: AdvisoryException; finding: AuditFinding }>;
}

const GATED_SEVERITIES = new Set<AdvisorySeverity>(['critical', 'high']);

const ghsaFromUrl = (url: string | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i);
  return match ? match[0] : null;
};

const normalizeGhsa = (id: string): string => id.trim().toLowerCase();

const findingKey = (finding: Pick<AuditFinding, 'id' | 'scope'>): string =>
  `${normalizeGhsa(finding.id)}:${finding.scope}`;

export const parseAuditFindings = (
  report: NpmAuditReport,
  scope: AdvisoryScope,
): AuditFinding[] => {
  const findings = new Map<string, AuditFinding>();

  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via === 'string') continue;
      const id = ghsaFromUrl(via.url);
      if (!id || !via.name || !via.severity || !via.title || !via.url) continue;
      const finding: AuditFinding = {
        id,
        package: via.name,
        severity: via.severity,
        title: via.title,
        url: via.url,
        scope,
      };
      findings.set(`${finding.id}:${finding.package}:${finding.scope}`, finding);
    }
  }

  return [...findings.values()].sort((a, b) =>
    `${a.id}:${a.package}`.localeCompare(`${b.id}:${b.package}`),
  );
};

const addUtcDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const isCurrentReview = (reviewBy: string, today: string): boolean =>
  reviewBy >= today && reviewBy <= addUtcDays(today, 90);

export const evaluateAdvisories = ({
  production,
  development,
  exceptions,
  today,
}: EvaluateAdvisoriesInput): EvaluateAdvisoriesResult => {
  const findings = [...production, ...development].filter(finding =>
    GATED_SEVERITIES.has(finding.severity),
  );
  const findingsByKey = new Map(findings.map(finding => [findingKey(finding), finding]));
  const used = new Set<string>();
  const stale: EvaluateAdvisoriesResult['stale'] = [];
  const mismatched: EvaluateAdvisoriesResult['mismatched'] = [];

  for (const exception of exceptions) {
    const finding = findingsByKey.get(findingKey(exception));
    if (!finding) continue;
    used.add(findingKey(exception));
    if (exception.package !== finding.package || exception.severity !== finding.severity) {
      mismatched.push({ exception, finding });
      continue;
    }
    if (!isCurrentReview(exception.reviewBy, today)) {
      stale.push({ exception, finding });
    }
  }

  const untriaged = findings.filter(finding => !used.has(findingKey(finding)));
  const unused = exceptions.filter(exception => !findingsByKey.has(findingKey(exception)));

  return {
    ok: untriaged.length === 0 && stale.length === 0 && unused.length === 0 && mismatched.length === 0,
    untriaged,
    stale,
    unused,
    mismatched,
  };
};
