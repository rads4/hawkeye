import { X, CheckCircle, ArrowRight, ShieldAlert, Activity, GitBranch, AlertTriangle, Award, Zap, Clock, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SEV_COLORS = {
  CRITICAL: 'text-[#ff3366] border-[#ff3366]/30 bg-[#ff3366]/10 shadow-[0_0_10px_rgba(255,51,102,0.1)]',
  HIGH:     'text-[#ff8800] border-[#ff8800]/30 bg-[#ff8800]/10 shadow-[0_0_10px_rgba(255,136,0,0.1)]',
  MEDIUM:   'text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/10 shadow-[0_0_10px_rgba(255,204,0,0.1)]',
  LOW:      'text-[#33ccff] border-[#33ccff]/30 bg-[#33ccff]/10 shadow-[0_0_10px_rgba(51,204,255,0.1)]',
};
const CIS_COLORS = {
  pass: 'text-[#00ff66] border-[#00ff66]/25 bg-[#00ff66]/8',
  fail: 'text-[#ff3366] border-[#ff3366]/25 bg-[#ff3366]/8',
};

function RiskGauge({ score }) {
  const max = 27;
  const pct = Math.min(score / max, 1);
  const r = 24;
  const circ = 2 * Math.PI * r;
  const color = score >= 16 ? '#ff3366' : score >= 11 ? '#ff8800' : score >= 6 ? '#ffcc00' : '#33ccff';
  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <motion.circle
          cx="32" cy="32" r={r} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${pct * circ} ${circ}` }}
          transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color}44)` }}
        />
      </svg>
      <span className="text-lg font-black text-white z-10 tracking-tighter">{score}</span>
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
    <div className="space-y-3">
      <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#00f0ff] mb-3 flex items-center gap-2.5 opacity-80">
        <Zap className="w-4 h-4" /> Why This Was Detected
      </h4>
      <div className="space-y-2.5">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-3 text-[13px] text-gray-300 bg-[#00f0ff]/5 border border-[#00f0ff]/15 p-3.5 rounded-xl shadow-sm hover:border-[#00f0ff]/30 transition-colors">
            <span className="w-5 h-5 rounded-lg bg-[#00f0ff]/20 text-[#00f0ff] flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">{i + 1}</span>
            <span className="leading-relaxed font-medium">{rule}</span>
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
    <div className="space-y-3">
      <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#b366ff] mb-3 flex items-center gap-2.5 opacity-80">
        <Link2 className="w-4 h-4" /> Attack Path Context
      </h4>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white/[0.03] p-4 rounded-xl border border-white/10 text-center shadow-inner group hover:border-[#b366ff]/30 transition-colors">
          <p className="text-2xl font-black text-white group-hover:text-[#b366ff] transition-colors">{chainLength}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Hop Chain</p>
        </div>
        <div className="bg-white/[0.03] p-4 rounded-xl border border-white/10 text-center shadow-inner group hover:border-[#b366ff]/30 transition-colors">
          <p className="text-sm font-black text-[#b366ff] truncate mt-1.5 uppercase tracking-tighter">Shortest Path</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">to Sensitive Data</p>
        </div>
      </div>
      {hops.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap bg-black/40 p-3.5 rounded-xl border border-white/8 shadow-md">
          {hops.map((hop, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-300 font-bold tracking-tight truncate max-w-[90px] hover:text-white transition-colors cursor-default" title={hop}>{hop}</span>
              {i < hops.length - 1 && <span className="text-gray-700 text-xs font-black">→</span>}
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
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[380px] h-full border-l border-white/8 bg-[#0B0F17]/95 backdrop-blur-2xl flex flex-col shrink-0 z-30 shadow-[-20px_0_60px_rgba(0,0,0,0.8)]"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/8 flex justify-between items-center bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-3">
          {selectedNode ? <ShieldAlert className="w-5 h-5 text-[#00f0ff]" /> : <AlertTriangle className="w-5 h-5 text-[#ff007f]" />}
          <h2 className="font-black text-white text-[15px] uppercase tracking-widest">{selectedNode ? 'Resource Details' : 'Finding Details'}</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all hover:rotate-90 duration-300">
          <X className="w-5 h-5 text-gray-500 hover:text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* ── FINDING VIEW ── */}
        {!selectedNode && finding && (
          <AnimatePresence mode="wait">
            <motion.div key={finding.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">

              {/* Risk score + severity */}
              <div className="flex items-center gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg group hover:border-white/20 transition-all">
                <RiskGauge score={finding.riskScore ?? 0} />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-500 uppercase tracking-[0.2em] font-black mb-2 opacity-60">Risk Profile</p>
                  <span className={`inline-flex px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border shadow-sm ${SEV_COLORS[finding.severity] || ''}`}>
                    {finding.severity}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white leading-tight tracking-tight">{finding.title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5 shadow-inner font-medium">{finding.summary}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/8 text-center group hover:border-[#b366ff]/30 transition-colors shadow-sm">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Activity className="w-4 h-4 text-[#b366ff] opacity-80" />
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Blast Radius</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-black text-white">{finding.blastRadius ?? '—'}</span>
                    <span className="text-[11px] text-gray-500 font-bold uppercase">nodes</span>
                  </div>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/8 text-center group hover:border-[#00f0ff]/30 transition-colors shadow-sm">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Clock className="w-4 h-4 text-[#00f0ff] opacity-80" />
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Provider</span>
                  </div>
                  <span className="text-sm font-black text-white uppercase tracking-wider">{finding.provider || '—'}</span>
                </div>
              </div>

              {/* Why detected */}
              <RuleEngine finding={finding} />

              {/* Attack path context */}
              {finding.attackPathSummary && <PathContext finding={finding} />}

              {/* CIS Compliance */}
              {finding.compliance?.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500 mb-3 flex items-center gap-2.5 opacity-80">
                    <Award className="w-4 h-4" /> CIS Compliance
                  </h4>
                  <div className="space-y-2.5">
                    {finding.compliance.map(c => (
                      <div key={c.id} className={`flex items-center gap-3 p-3.5 rounded-xl border text-[13px] shadow-sm transition-all hover:scale-[1.02] ${CIS_COLORS[c.status] || 'text-gray-400 border-white/8'}`}>
                        <span className="font-black shrink-0 w-14 text-[11px] tracking-tighter opacity-80">{c.id}</span>
                        <span className="flex-1 leading-snug font-bold text-[12px] opacity-90">{c.title}</span>
                        <span className="uppercase font-black text-[10px] shrink-0 tracking-widest">{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Why it matters */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#b366ff] mb-3 flex items-center gap-2.5 opacity-80">
                  <ArrowRight className="w-4 h-4" /> Why It Matters
                </h4>
                <p className="text-[13px] text-gray-400 leading-relaxed font-medium bg-black/20 p-4 rounded-xl border border-white/5">{finding.whyItMatters}</p>
              </div>

              {/* Remediation */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#ff3366] mb-3 flex items-center gap-2.5 opacity-80">
                  <CheckCircle className="w-4 h-4" /> Remediation
                </h4>
                <div className="space-y-3">
                  {(finding.fixSteps || []).map((step, idx) => (
                    <div key={idx} className="flex gap-4 bg-white/[0.03] border border-white/8 p-4 rounded-xl text-[13px] text-gray-300 shadow-sm hover:border-[#ff3366]/30 transition-colors">
                      <span className="w-6 h-6 rounded-lg bg-[#ff3366]/15 text-[#ff3366] flex items-center justify-center shrink-0 text-[11px] font-black shadow-inner">{idx + 1}</span>
                      <span className="pt-0.5 leading-relaxed font-medium">{step.replace(/^\d+\.\s*/, '')}</span>
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
            <motion.div key={selectedNode.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 flex items-start gap-4 shadow-xl">
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 shrink-0 shadow-inner">
                  <ShieldAlert className="w-6 h-6 text-white opacity-80" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1.5 flex items-center gap-2 opacity-70">
                    {selectedNode.data.type}
                    {selectedNode.data.cloud && (
                      <span className="px-2 py-0.5 border border-white/15 rounded-md text-[9px] text-[#00f0ff] font-black bg-[#00f0ff]/5">{selectedNode.data.cloud.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="text-[16px] font-black text-white break-all leading-tight tracking-tight">{selectedNode.data.label}</div>
                </div>
              </div>

              {selectedNode.data.description && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 opacity-60">Description</h4>
                  <p className="text-[13px] text-gray-400 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5 font-medium shadow-inner">{selectedNode.data.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/10 shadow-sm transition-all hover:scale-[1.02]">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block mb-2 opacity-60">Exposure</span>
                  <span className={selectedNode.data.public ? 'text-[#ff3366] font-black flex items-center gap-2' : 'text-[#00ff66] font-black flex items-center gap-2'}>
                    {selectedNode.data.public ? <><div className="w-1.5 h-1.5 rounded-full bg-[#ff3366] animate-pulse" /> ⚠ Public</> : <><div className="w-1.5 h-1.5 rounded-full bg-[#00ff66]" /> ✓ Private</>}
                  </span>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/10 shadow-sm transition-all hover:scale-[1.02]">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block mb-2 opacity-60">Sensitive</span>
                  <span className={selectedNode.data.sensitive ? 'text-[#ff8800] font-black flex items-center gap-2' : 'text-gray-500 font-black'}>
                    {selectedNode.data.sensitive ? <><div className="w-1.5 h-1.5 rounded-full bg-[#ff8800] animate-pulse" /> ⚠ Yes</> : 'No'}
                  </span>
                </div>
              </div>

              {selectedNode.data.attackPath && (
                <motion.div 
                  animate={{ boxShadow: ['0 0 0px rgba(255,51,102,0)', '0 0 20px rgba(255,51,102,0.2)', '0 0 0px rgba(255,51,102,0)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-[#ff3366]/10 border border-[#ff3366]/30 p-4 rounded-xl shadow-lg"
                >
                  <p className="text-[13px] text-[#ff3366] font-black flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff3366] animate-ping inline-block" />
                    Part of an active attack path
                  </p>
                </motion.div>
              )}

              {selectedNode.data.lastSeen && (
                <p className="text-[11px] text-gray-600 flex items-center gap-2 font-bold tracking-tight opacity-70">
                  <Clock className="w-3.5 h-3.5" />
                  Last seen: {new Date(selectedNode.data.lastSeen).toLocaleString()}
                </p>
              )}

              <button onClick={onClose} className="w-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 text-gray-400 hover:text-white shadow-md active:scale-95">
                ← Back to Overview
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {!selectedNode && (
        <div className="p-6 border-t border-white/8 bg-white/[0.02] shrink-0">
          <button className="w-full bg-gradient-to-r from-[#b366ff] to-[#ff007f] hover:shadow-[0_0_20px_rgba(179,102,255,0.4)] text-white font-black py-4 text-[12px] rounded-2xl uppercase tracking-[0.2em] transition-all duration-300 shadow-xl active:scale-95">
            Create Jira Ticket
          </button>
        </div>
      )}
    </motion.div>
  );
}
