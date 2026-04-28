import { AlertTriangle, Globe, Server, User, Database, Network, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const SEV_STYLES = {
  CRITICAL: 'bg-critical/10 text-critical border-critical/25',
  HIGH:     'bg-high/10 text-high border-high/25',
  MEDIUM:   'bg-medium/10 text-medium border-medium/25',
  LOW:      'bg-low/10 text-low border-low/25',
};

const SEV_BAR = {
  CRITICAL: 'bg-critical w-full',
  HIGH:     'bg-high w-3/4',
  MEDIUM:   'bg-medium w-1/2',
  LOW:      'bg-low w-1/4',
};

// Node type icon mapping
const PATH_ICON = {
  Internet: Globe, Network: Network, Compute: Server,
  Identity: User, Data: Database, network: Network,
  compute: Server, identity: User, data: Database,
};

// Mini path hop preview
function MiniPathPreview({ summary }) {
  if (!summary) return null;
  const hops = summary.split(' → ');
  return (
    <div className="flex items-center gap-1 flex-wrap mt-2">
      {hops.map((hop, i) => {
        const type = hop.toLowerCase().includes('internet') ? 'Internet'
          : hop.toLowerCase().includes('iam') || hop.toLowerCase().includes('role') || hop.toLowerCase().includes('sa') ? 'Identity'
          : hop.toLowerCase().includes('sg') || hop.toLowerCase().includes('fw') || hop.toLowerCase().includes('vpc') ? 'Network'
          : hop.toLowerCase().includes('s3') || hop.toLowerCase().includes('data') || hop.toLowerCase().includes('pii') ? 'Data'
          : 'Compute';
        const Icon = PATH_ICON[type] || Server;
        const colors = {
          Internet: 'text-neon-blue', Network: 'text-neon-blue', Compute: 'text-neon-purple',
          Identity: 'text-neon-pink', Data: 'text-medium',
        };
        return (
          <span key={i} className="flex items-center gap-1">
            <Icon className={`w-3 h-3 ${colors[type]}`} />
            {i < hops.length - 1 && <span className="text-gray-600 text-[10px]">→</span>}
          </span>
        );
      })}
    </div>
  );
}

export default function FindingsPanel({
  findings, selectedFindingId, onSelectFinding, onHoverFinding,
}) {
  return (
    <div className="w-80 h-full border-r border-white/8 bg-black/45 backdrop-blur-md flex flex-col shrink-0 relative z-10">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8">
        <h2 className="text-base font-bold flex items-center gap-2 text-white">
          <AlertTriangle className="w-4 h-4 text-neon-pink" />
          Active Findings
        </h2>
        <div className="text-xs text-gray-500 mt-0.5">
          {findings.filter(f => f.severity === 'CRITICAL').length} critical ·{' '}
          {findings.filter(f => f.severity === 'HIGH').length} high
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {findings.map((finding, idx) => {
            const isActive = selectedFindingId === finding.id;
            return (
              <motion.button
                key={finding.id || idx}
                layout
                initial={{ opacity: 0, x: -24, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.96 }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                onClick={() => onSelectFinding(finding.id)}
                onMouseEnter={() => onHoverFinding?.(finding.id)}
                onMouseLeave={() => onHoverFinding?.(null)}
                className={clsx(
                  'w-full text-left rounded-xl border transition-all duration-250 relative overflow-hidden group',
                  isActive
                    ? 'bg-neon-purple/12 border-neon-purple/45 shadow-[0_0_24px_rgba(179,102,255,0.18)]'
                    : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15',
                  finding.isNew && 'ring-1 ring-neon-blue/60 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                )}
              >
                {/* Active bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeBar"
                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-neon-purple shadow-[0_0_8px_#b366ff]"
                  />
                )}

                {/* New badge */}
                {finding.isNew && (
                  <span className="absolute top-2 right-2 text-[9px] bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded px-1.5 py-0.5 font-bold uppercase tracking-wide animate-pulse">
                    New
                  </span>
                )}

                <div className="p-3 pl-4">
                  {/* Severity + risk score */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={clsx('text-[9px] px-2 py-0.5 rounded-full border font-bold tracking-widest uppercase', SEV_STYLES[finding.severity])}>
                      {finding.severity}
                    </span>
                    {finding.riskScore != null && (
                      <span className="text-[10px] font-bold text-gray-400">
                        Score <span className="text-white">{finding.riskScore}</span>
                      </span>
                    )}
                  </div>

                  {/* Severity bar */}
                  <div className="h-0.5 w-full bg-white/8 rounded-full mb-2.5 overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all duration-500', SEV_BAR[finding.severity])} />
                  </div>

                  {/* Title */}
                  <h3 className={clsx('font-semibold text-xs leading-snug mb-2 transition-colors', isActive ? 'text-white' : 'text-gray-300 group-hover:text-white')}>
                    {finding.title}
                  </h3>

                  {/* Asset label */}
                  {finding.asset_id && (
                    <div className="text-[10px] text-gray-600 font-mono truncate mb-1">
                      {finding.asset_id}
                    </div>
                  )}

                  {/* Mini path */}
                  <MiniPathPreview summary={finding.attackPathSummary} />

                  {/* Tags */}
                  <div className="flex gap-1 flex-wrap mt-2">
                    {(finding.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-black/40 border border-white/6 rounded text-gray-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {findings.length === 0 && (
          <div className="text-center text-gray-600 text-sm mt-12">
            <div className="text-3xl mb-3 opacity-30">🛡</div>
            <p className="text-gray-500 text-xs">No findings yet. Ingest cloud data to scan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
