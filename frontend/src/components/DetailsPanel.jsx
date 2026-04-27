import { X, CheckCircle, ArrowRight, ShieldAlert, Activity, GitBranch, AlertTriangle, Award, Zap, Clock, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SEV_COLORS = {
  CRITICAL: 'text-critical border-critical/30 bg-critical/10',
  HIGH:     'text-high border-high/30 bg-high/10',
  MEDIUM:   'text-medium border-medium/30 bg-medium/10',
  LOW:      'text-low border-low/30 bg-low/10',
};
const CIS_COLORS = {
  pass: 'text-success border-success/25 bg-success/8',
  fail: 'text-critical border-critical/25 bg-critical/8',
};

function RiskGauge({ score }) {
  const max = 27;
  const pct = Math.min(score / max, 1);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const color = score >= 16 ? '#ff3366' : score >= 11 ? '#ff8800' : score >= 6 ? '#ffcc00' : '#33ccff';
  return (
    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <motion.circle
          cx="24" cy="24" r={r} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${pct * circ} ${circ}` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="text-sm font-bold text-white z-10">{score}</span>
    </div>
  );
}

// "Why this was detected" — rule engine
function RuleEngine({ finding }) {
  const rules = [];
  if (finding.reasoning?.length) {
    finding.reasoning.forEach(r => rules.push(r));
  } else {
    // Derive from data
    if (finding.affectedResources?.some(r => String(r).includes('sg') || String(r).includes('fw'))) rules.push('Open firewall allows 0.0.0.0/0 inbound traffic');
    if (finding.tags?.includes('IAM') || finding.title?.includes('Role')) rules.push('IAM role with privileged (*:*) permissions attached');
    if (finding.title?.includes('Compute') || finding.title?.includes('EC2')) rules.push('Public compute instance reachable from Internet');
    if (finding.title?.includes('Data') || finding.tags?.includes('DataExposure')) rules.push('Sensitive data store transitively accessible via IAM role');
  }
  if (!rules.length) return null;
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-neon-blue mb-2 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" /> Why This Was Detected
      </h4>
      <div className="space-y-1.5">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-gray-300 bg-neon-blue/5 border border-neon-blue/12 p-2.5 rounded-lg">
            <span className="w-4 h-4 rounded-full bg-neon-blue/20 text-neon-blue flex items-center justify-center shrink-0 text-[9px] font-bold mt-px">{i + 1}</span>
            <span className="leading-snug">{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Path context panel
function PathContext({ finding }) {
  const hops = finding.attackPathSummary?.split(' → ') || [];
  const chainLength = hops.length;
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-neon-purple mb-2 flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5" /> Attack Path Context
      </h4>
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div className="bg-white/3 p-2.5 rounded-lg border border-white/8 text-center">
          <p className="text-lg font-bold text-white">{chainLength}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Hop Chain</p>
        </div>
        <div className="bg-white/3 p-2.5 rounded-lg border border-white/8 text-center">
          <p className="text-sm font-bold text-neon-purple truncate mt-0.5">Shortest Path</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">to Sensitive Data</p>
        </div>
      </div>
      {hops.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap bg-black/30 p-2.5 rounded-lg border border-white/6">
          {hops.map((hop, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-300 font-medium truncate max-w-[70px]" title={hop}>{hop}</span>
              {i < hops.length - 1 && <span className="text-gray-600 text-xs">→</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailsPanel({ finding, selectedNode, onClose }) {
  if (!finding && !selectedNode) return null;

  return (
    <motion.div
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="w-[22rem] h-full border-l border-white/8 bg-black/55 backdrop-blur-xl flex flex-col shrink-0 z-10 shadow-[-15px_0_50px_rgba(0,0,0,0.7)]"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8 flex justify-between items-center bg-white/3 shrink-0">
        <div className="flex items-center gap-2">
          {selectedNode ? <ShieldAlert className="w-4 h-4 text-neon-blue" /> : <AlertTriangle className="w-4 h-4 text-neon-pink" />}
          <h2 className="font-bold text-white text-sm">{selectedNode ? 'Resource Details' : 'Finding Details'}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4 text-gray-500 hover:text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ── FINDING VIEW ── */}
        {!selectedNode && finding && (
          <AnimatePresence mode="wait">
            <motion.div key={finding.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5">

              {/* Risk score + severity */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/3 border border-white/8">
                <RiskGauge score={finding.riskScore ?? 0} />
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Risk Score</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${SEV_COLORS[finding.severity] || ''}`}>
                    {finding.severity}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-sm font-bold text-white leading-snug mb-2">{finding.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed bg-white/3 p-3 rounded-lg border border-white/6">{finding.summary}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white/3 p-3 rounded-lg border border-white/8 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-1">
                    <Activity className="w-3.5 h-3.5 text-neon-purple" />
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Blast Radius</span>
                  </div>
                  <span className="text-lg font-bold text-white">{finding.blastRadius ?? '—'}</span>
                  <span className="text-xs text-gray-500 ml-1">nodes</span>
                </div>
                <div className="bg-white/3 p-3 rounded-lg border border-white/8 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-1">
                    <Clock className="w-3.5 h-3.5 text-neon-blue" />
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Provider</span>
                  </div>
                  <span className="text-sm font-bold text-white uppercase">{finding.provider || '—'}</span>
                </div>
              </div>

              {/* Why detected */}
              <RuleEngine finding={finding} />

              {/* Attack path context */}
              {finding.attackPathSummary && <PathContext finding={finding} />}

              {/* CIS Compliance */}
              {finding.compliance?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> CIS Compliance
                  </h4>
                  <div className="space-y-1.5">
                    {finding.compliance.map(c => (
                      <div key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${CIS_COLORS[c.status] || 'text-gray-400 border-white/8'}`}>
                        <span className="font-bold shrink-0 w-12">{c.id}</span>
                        <span className="flex-1 leading-tight text-[10px]">{c.title}</span>
                        <span className="uppercase font-bold text-[9px] shrink-0">{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Why it matters */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-neon-purple mb-2 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" /> Why It Matters
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">{finding.whyItMatters}</p>
              </div>

              {/* Remediation */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-neon-pink mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Remediation
                </h4>
                <div className="space-y-2">
                  {(finding.fixSteps || []).map((step, idx) => (
                    <div key={idx} className="flex gap-2.5 bg-white/3 border border-white/6 p-2.5 rounded-lg text-xs text-gray-400">
                      <span className="w-5 h-5 rounded-full bg-neon-pink/15 text-neon-pink flex items-center justify-center shrink-0 text-[9px] font-bold">{idx + 1}</span>
                      <span className="pt-0.5 leading-snug">{step.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── NODE VIEW ── */}
        {selectedNode && (
          <AnimatePresence mode="wait">
            <motion.div key={selectedNode.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-white/3 p-4 rounded-xl border border-white/8 flex items-start gap-3">
                <div className="p-2.5 bg-black/40 rounded-lg border border-white/8 shrink-0">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-2">
                    {selectedNode.data.type}
                    {selectedNode.data.cloud && (
                      <span className="px-1.5 border border-white/15 rounded text-[9px] text-gray-400">{selectedNode.data.cloud.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white break-all">{selectedNode.data.label}</div>
                </div>
              </div>

              {selectedNode.data.description && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Description</h4>
                  <p className="text-xs text-gray-400 leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">{selectedNode.data.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/3 p-2.5 rounded-lg border border-white/8">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Exposure</span>
                  <span className={selectedNode.data.public ? 'text-critical font-bold' : 'text-success font-bold'}>
                    {selectedNode.data.public ? '⚠ Public' : '✓ Private'}
                  </span>
                </div>
                <div className="bg-white/3 p-2.5 rounded-lg border border-white/8">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Sensitive</span>
                  <span className={selectedNode.data.sensitive ? 'text-high font-bold' : 'text-gray-400'}>
                    {selectedNode.data.sensitive ? '⚠ Yes' : 'No'}
                  </span>
                </div>
              </div>

              {selectedNode.data.attackPath && (
                <div className="bg-critical/8 border border-critical/25 p-3 rounded-lg">
                  <p className="text-xs text-critical font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-critical animate-pulse inline-block" />
                    Part of an active attack path
                  </p>
                </div>
              )}

              {selectedNode.data.lastSeen && (
                <p className="text-[10px] text-gray-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last seen: {new Date(selectedNode.data.lastSeen).toLocaleString()}
                </p>
              )}

              <button onClick={onClose} className="w-full bg-white/3 hover:bg-white/8 border border-white/8 py-2.5 rounded-lg text-xs font-semibold transition-colors text-gray-300">
                ← Back to Finding Overview
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {!selectedNode && (
        <div className="p-4 border-t border-white/8 bg-white/3 shrink-0">
          <button className="w-full glass-button-primary font-bold py-3 text-xs rounded-xl">
            Create Jira Ticket
          </button>
        </div>
      )}
    </motion.div>
  );
}
