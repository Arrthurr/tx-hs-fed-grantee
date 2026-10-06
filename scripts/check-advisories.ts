/**
 * Gate high/critical npm advisories. Production must stay clean unless an
 * exception is explicitly recorded. Development high/critical findings need a
 * current, matching exception in docs/security/advisory-exceptions.json.
 *
 * Moderate and low findings are listed for review but do not fail the check.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  evaluateAdvisories,
  parseAuditFindings,
  type AdvisoryException,
  type NpmAuditReport,
} from './advisories';

const today = new Date().toISOString().slice(0, 10);
const exceptionsPath = 'docs/security/advisory-exceptions.json';

const runAudit = (omitDev: boolean): NpmAuditReport => {
  const args = ['audit', '--json'];
  if (omitDev) args.splice(1, 0, '--omit=dev');
  try {
    const stdout = execFileSync('npm', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(stdout) as NpmAuditReport;
  } catch (error) {
    const err = error as { stdout?: string; status?: number };
    if (typeof err.stdout === 'string' && err.stdout.trim()) {
      return JSON.parse(err.stdout) as NpmAuditReport;
    }
    throw error;
  }
};

const requiredExceptionFields = ['id', 'package', 'severity', 'scope', 'rationale', 'owner', 'reviewBy'] as const;

const exceptions = JSON.parse(readFileSync(exceptionsPath, 'utf8')) as AdvisoryException[];
if (!Array.isArray(exceptions)) {
  throw new Error(`${exceptionsPath} must be an array of exception objects`);
}
for (const [index, exception] of exceptions.entries()) {
  for (const field of requiredExceptionFields) {
    if (typeof exception[field] !== 'string' || exception[field].trim() === '') {
      throw new Error(`${exceptionsPath}[${index}].${field} must be a non-empty string`);
    }
  }
}
const production = parseAuditFindings(runAudit(true), 'production');
const productionKeys = new Set(production.map(finding => `${finding.id}:${finding.package}`));
const development = parseAuditFindings(runAudit(false), 'development').filter(
  finding => !productionKeys.has(`${finding.id}:${finding.package}`),
);
const result = evaluateAdvisories({ production, development, exceptions, today });

const formatFinding = (finding: { id: string; package: string; severity: string; scope: string; title?: string }) =>
  `${finding.severity} ${finding.scope} ${finding.package} ${finding.id}${finding.title ? ` (${finding.title})` : ''}`;

if (!result.ok) {
  const lines = ['Advisory check failed.'];
  if (result.untriaged.length) {
    lines.push('Untriaged high/critical findings:');
    lines.push(...result.untriaged.map(finding => `  - ${formatFinding(finding)}`));
  }
  if (result.stale.length) {
    lines.push('Expired exceptions (reviewBy has passed):');
    lines.push(...result.stale.map(({ exception }) =>
      `  - ${exception.id} ${exception.package} reviewBy=${exception.reviewBy} owner=${exception.owner}`));
  }
  if (result.mismatched.length) {
    lines.push('Exceptions that do not match the current finding package/severity:');
    lines.push(...result.mismatched.map(({ exception, finding }) =>
      `  - ${exception.id} recorded ${exception.package}/${exception.severity}, audit has ${finding.package}/${finding.severity}`));
  }
  if (result.unused.length) {
    lines.push('Exceptions with no matching high/critical finding (remove or update):');
    lines.push(...result.unused.map(exception => `  - ${exception.id} ${exception.package} ${exception.scope}`));
  }
  console.error(lines.join('\n'));
  process.exit(1);
}

const remaining = development.filter(finding => finding.severity === 'moderate' || finding.severity === 'low');
console.log('Advisory check passed.', {
  date: today,
  productionHighCritical: production.filter(finding => finding.severity === 'critical' || finding.severity === 'high').length,
  developmentExceptions: exceptions.length,
  remainingModerateOrLow: remaining.length,
});
