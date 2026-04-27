import { ShieldAlert, Activity, Cloud, AlertTriangle, CheckCircle } from 'lucide-react';
import MetricCard from './MetricCard';

export default function TopSummaryBar({ findings, graphData, trends = {} }) {
  const totalNodes  = graphData?.nodes?.length ?? 0;
  const totalFindings = findings.length;
  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount     = findings.filter(f => f.severity === 'HIGH').length;

  const providers = new Set(findings.map(f => f.provider?.toUpperCase()).filter(Boolean));
  const providerText = providers.size > 0 ? Array.from(providers).join(' + ') : '—';

  const allCompliance = findings.flatMap(f => f.compliance || []);
  const totalChecks   = new Set(allCompliance.map(c => c.id)).size;
  const failedChecks  = new Set(allCompliance.filter(c => c.status === 'fail').map(c => c.id)).size;
  const passedChecks  = totalChecks - failedChecks;
  const complianceText = totalChecks > 0 ? `${passedChecks}/${totalChecks}` : '—';

  return (
    <div className="w-full px-4 py-2.5 flex gap-3 border-b border-white/5 bg-black/25 shrink-0 z-10">
      <MetricCard
        title="Total Assets"
        value={totalNodes || 0}
        icon={Activity}
        colorClass="text-neon-blue"
        delay={0.05}
        trend={trends.assets}
      />
      <MetricCard
        title="Active Findings"
        value={totalFindings || 0}
        icon={ShieldAlert}
        colorClass="text-neon-pink"
        delay={0.1}
        trend={trends.findings}
      />
      <MetricCard
        title="Critical / High"
        value={totalFindings > 0 ? `${criticalCount} / ${highCount}` : '—'}
        icon={AlertTriangle}
        colorClass="text-critical"
        delay={0.15}
      />
      <MetricCard
        title="Environments"
        value={providerText}
        icon={Cloud}
        colorClass="text-neon-purple"
        delay={0.2}
      />
      <MetricCard
        title="CIS Passing"
        value={complianceText}
        icon={CheckCircle}
        colorClass={failedChecks > 0 ? 'text-high' : 'text-success'}
        delay={0.25}
      />
    </div>
  );
}
