import { AlertTriangle, Globe, Server, User, Database, Network, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const SEV_STYLES = {
  CRITICAL: 'bg-[#ff3366]/15 text-[#ff3366] border-[#ff3366]/30 shadow-[0_0_10px_rgba(255,51,102,0.1)]',
  HIGH:     'bg-[#ff8800]/15 text-[#ff8800] border-[#ff8800]/30 shadow-[0_0_10px_rgba(255,136,0,0.1)]',
  MEDIUM:   'bg-[#ffcc00]/15 text-[#ffcc00] border-[#ffcc00]/30 shadow-[0_0_10px_rgba(255,204,0,0.1)]',
  LOW:      'bg-[#33ccff]/15 text-[#33ccff] border-[#33ccff]/30 shadow-[0_0_10px_rgba(51,204,255,0.1)]',
};

const SEV_BAR = {
  CRITICAL: 'bg-[#ff3366]',
  HIGH:     'bg-[#ff8800]',
  MEDIUM:   'bg-[#ffcc00]',
  LOW:      'bg-[#33ccff]',
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
    <div className="flex items-center gap-1.5 flex-wrap mt-3">
      {hops.map((hop, i) => {
        const type = hop.toLowerCase().includes('internet') ? 'Internet'
          : hop.toLowerCase().includes('iam') || hop.toLowerCase().includes('role') || hop.toLowerCase().includes('sa') ? 'Identity'
          : hop.toLowerCase().includes('sg') || hop.toLowerCase().includes('fw') || hop.toLowerCase().includes('vpc') ? 'Network'
          : hop.toLowerCase().includes('s3') || hop.toLowerCase().includes('data') || hop.toLowerCase().includes('pii') ? 'Data'
          : 'Compute';
        const Icon = PATH_ICON[type] || Server;
        const colors = {
          Internet: 'text-[#00f0ff]', Network: 'text-[#00f0ff]', Compute: 'text-[#b366ff]',
          Identity: 'text-[#ff007f]', Data: 'text-[#ffcc00]',
        };
        return (
          <span key={i} className="flex items-center gap-1">
            <Icon className={`w-3.5 h-3.5 ${colors[type]} opacity-80`} />
            {i < hops.length - 1 && <span className="text-gray-700 text-[10px] font-bold">→</span>}
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
    <div className="w-[340px] h-full border-r border-white/8 bg-[#0B0F17]/95 backdrop-blur-xl flex flex-col shrink-0 relative z-20 shadow-2xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/8 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2.5 text-white tracking-tight">
            <AlertTriangle className="w-5 h-5 text-[#ff007f] filter drop-shadow-[0_0_8px_rgba(255,0,127,0.3)]" />
            Active Findings
          </h2>
          <span className="text-[11px] font-bold bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-400">
            {findings.length}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff3366]" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              {findings.filter(f => f.severity === 'CRITICAL').length} Critical
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff8800]" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              {findings.filter(f => f.severity === 'HIGH').length} High
            </span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
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
                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                onClick={() => onSelectFinding(finding.id)}
                onMouseEnter={() => onHoverFinding?.(finding.id)}
                onMouseLeave={() => onHoverFinding?.(null)}
                className={clsx(
                  'w-full text-left rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-lg',
                  isActive
                    ? 'bg-[#b366ff]/10 border-[#b366ff]/40 shadow-[0_0_30px_rgba(179,102,255,0.15)]'
                    : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]',
                  finding.isNew && 'ring-1 ring-[#00f0ff]/50 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                )}
              >
                {/* Active bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeBar"
                    className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#b366ff] shadow-[0_0_15px_#b366ff]"
                  />
                )}

                {/* New badge */}
                {finding.isNew && (
                  <span className="absolute top-3 right-3 text-[9px] bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 rounded-md px-2 py-0.5 font-black uppercase tracking-[0.1em] animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                    New
                  </span>
                )}

                <div className="p-5 pl-6">
                  {/* Severity + risk score */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={clsx('text-[10px] px-2.5 py-1 rounded-lg border font-black tracking-[0.1em] uppercase shadow-sm', SEV_STYLES[finding.severity])}>
                      {finding.severity}
                    </span>
                    {finding.riskScore != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score</span>
                        <span className="text-[12px] font-black text-white">{finding.riskScore}</span>
                      </div>
                    )}
                  </div>

                  {/* Severity bar */}
                  <div className="h-1 w-full bg-white/5 rounded-full mb-4 overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: SEV_BAR[finding.severity].includes('w-full') ? '100%' : SEV_BAR[finding.severity].includes('w-3/4') ? '75%' : '50%' }}
                      className={clsx('h-full rounded-full transition-all duration-700', SEV_BAR[finding.severity])} 
                    />
                  </div>

                  {/* Title */}
                  <h3 className={clsx('font-bold text-[14px] leading-tight mb-3 tracking-tight transition-colors', isActive ? 'text-white' : 'text-gray-200 group-hover:text-white')}>
                    {finding.title}
                  </h3>

                  {/* Asset label */}
                  {finding.asset_id && (
                    <div className="text-[11px] text-gray-500 font-mono truncate mb-2 opacity-80 bg-black/20 py-1 px-2 rounded-lg inline-block max-w-full">
                      {finding.asset_id}
                    </div>
                  )}

                  {/* Mini path */}
                  <MiniPathPreview summary={finding.attackPathSummary} />

                  {/* Tags */}
                  <div className="flex gap-1.5 flex-wrap mt-4">
                    {(finding.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-gray-400 group-hover:text-gray-300 transition-colors">
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
          <div className="text-center py-20 px-10">
            <div className="text-5xl mb-6 grayscale opacity-20 filter drop-shadow-[0_0_15px_white]">🛡</div>
            <p className="text-gray-400 font-bold text-sm tracking-tight">No findings yet</p>
            <p className="text-gray-600 text-[11px] mt-2 uppercase tracking-widest font-semibold">Ingest cloud data to scan</p>
          </div>
        )}
      </div>
    </div>
  );
}
