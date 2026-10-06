import {
  evaluateAdvisories,
  parseAuditFindings,
  type AdvisoryException,
  type NpmAuditReport,
} from '../advisories';

const today = '2026-10-06';

const bracesException: AdvisoryException = {
  id: 'GHSA-vfj7-8cjw-p6xm',
  package: 'braces',
  severity: 'high',
  scope: 'development',
  rationale: 'No patched braces release; Tailwind 3 watch globbing only.',
  owner: 'Arrthurr',
  reviewBy: '2027-01-04',
};

const highDevAudit = (id = 'GHSA-vfj7-8cjw-p6xm'): NpmAuditReport => ({
  vulnerabilities: {
    braces: {
      severity: 'high',
      via: [{
        source: 1,
        name: 'braces',
        title: 'braces stack exhaustion',
        severity: 'high',
        url: `https://github.com/advisories/${id}`,
      }],
    },
  },
});

describe('parseAuditFindings', () => {
  it('flattens GHSA advisories and ignores package-only via edges', () => {
    const findings = parseAuditFindings({
      vulnerabilities: {
        tailwindcss: {
          severity: 'high',
          via: ['braces', {
            source: 99,
            name: 'braces',
            title: 'braces stack exhaustion',
            severity: 'high',
            url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
          }],
        },
      },
    }, 'development');

    expect(findings).toEqual([
      {
        id: 'GHSA-vfj7-8cjw-p6xm',
        package: 'braces',
        severity: 'high',
        title: 'braces stack exhaustion',
        url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
        scope: 'development',
      },
    ]);
  });
});

describe('evaluateAdvisories', () => {
  it('fails high and critical findings that have no matching exception', () => {
    const result = evaluateAdvisories({
      production: parseAuditFindings({ vulnerabilities: {} }, 'production'),
      development: parseAuditFindings(highDevAudit(), 'development'),
      exceptions: [],
      today,
    });

    expect(result.ok).toBe(false);
    expect(result.untriaged.map(finding => finding.id)).toEqual(['GHSA-vfj7-8cjw-p6xm']);
  });

  it('passes a high development finding covered by a current exception', () => {
    const result = evaluateAdvisories({
      production: [],
      development: parseAuditFindings(highDevAudit(), 'development'),
      exceptions: [bracesException],
      today,
    });

    expect(result).toEqual({
      ok: true,
      untriaged: [],
      stale: [],
      unused: [],
      mismatched: [],
    });
  });

  it('does not let a development exception cover a production finding', () => {
    const result = evaluateAdvisories({
      production: parseAuditFindings(highDevAudit(), 'production'),
      development: [],
      exceptions: [bracesException],
      today,
    });

    expect(result.ok).toBe(false);
    expect(result.untriaged[0]).toMatchObject({ id: 'GHSA-vfj7-8cjw-p6xm', scope: 'production' });
  });

  it('fails exceptions whose review date has passed', () => {
    const result = evaluateAdvisories({
      production: [],
      development: parseAuditFindings(highDevAudit(), 'development'),
      exceptions: [{ ...bracesException, reviewBy: '2026-10-05' }],
      today,
    });

    expect(result.ok).toBe(false);
    expect(result.stale.map(item => item.exception.id)).toEqual(['GHSA-vfj7-8cjw-p6xm']);
  });

  it('fails exceptions whose review date is more than 90 days out', () => {
    const result = evaluateAdvisories({
      production: [],
      development: parseAuditFindings(highDevAudit(), 'development'),
      exceptions: [{ ...bracesException, reviewBy: '2027-01-05' }],
      today,
    });

    expect(result.ok).toBe(false);
    expect(result.stale.map(item => item.exception.reviewBy)).toEqual(['2027-01-05']);
  });

  it('fails leftover exceptions that no longer match the audit', () => {
    const result = evaluateAdvisories({
      production: [],
      development: [],
      exceptions: [bracesException],
      today,
    });

    expect(result.ok).toBe(false);
    expect(result.unused.map(item => item.id)).toEqual(['GHSA-vfj7-8cjw-p6xm']);
  });

  it('does not gate moderate or low findings', () => {
    const result = evaluateAdvisories({
      production: [],
      development: parseAuditFindings({
        vulnerabilities: {
          ajv: {
            severity: 'moderate',
            via: [{
              source: 2,
              name: 'ajv',
              title: 'ajv ReDoS',
              severity: 'moderate',
              url: 'https://github.com/advisories/GHSA-2g4f-4pwh-qvx6',
            }],
          },
        },
      }, 'development'),
      exceptions: [],
      today,
    });

    expect(result.ok).toBe(true);
    expect(result.untriaged).toEqual([]);
  });

  it('rejects an exception whose package or severity does not match the finding', () => {
    const result = evaluateAdvisories({
      production: [],
      development: parseAuditFindings(highDevAudit(), 'development'),
      exceptions: [{ ...bracesException, package: 'micromatch', severity: 'low' }],
      today,
    });

    expect(result.ok).toBe(false);
    expect(result.mismatched[0]).toMatchObject({
      exception: { id: 'GHSA-vfj7-8cjw-p6xm' },
    });
  });
});
