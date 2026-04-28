import { Handle, Position } from 'reactflow';
import { Globe, Server, User, Database, ShieldAlert, Network, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const iconMap = { Globe, Server, User, Database, ShieldAlert, Network };

const SHORT_LABELS = {
  Internet: 'Internet', 'web-server-prod': 'Web EC2',
  'app-server-internal': 'App EC2', AdminRole: 'Admin IAM',
  ReadOnlyRole: 'ReadOnly', 'prod-customer-data': 'PII S3',
  'application-logs': 'Logs S3', 'vpc-prod': 'VPC',
  'allow-all-sg': 'Open SG', 'allow-ingress-all': 'Open FW',
  'gke-node-pool-01': 'GKE VM', 'project-editor-sa': 'Editor SA',
  'customer-pii-bucket': 'PII GCS', 'default-subnet': 'Subnet',
};

const TYPE_COLORS = {
  Network:  { border: 'border-neon-blue/50',  bg: 'bg-neon-blue/8',   icon: 'text-neon-blue',   glow: '0 0 20px rgba(0,240,255,0.3)' },
  Compute:  { border: 'border-neon-purple/50', bg: 'bg-neon-purple/8', icon: 'text-neon-purple', glow: '0 0 20px rgba(179,102,255,0.3)' },
  Identity: { border: 'border-neon-pink/50',  bg: 'bg-neon-pink/8',   icon: 'text-neon-pink',   glow: '0 0 20px rgba(255,0,127,0.3)' },
  Data:     { border: 'border-medium/50',      bg: 'bg-medium/8',      icon: 'text-medium',      glow: '0 0 20px rgba(255,204,0,0.3)' },
};

const CLOUD_BADGE = {
  aws:    { label: 'AWS', cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  gcp:    { label: 'GCP', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  global: { label: '🌐',  cls: 'text-gray-500 bg-white/5 border-white/10' },
};

export default function CustomNode({ data, selected }) {
  const [hovered, setHovered] = useState(false);
  const Icon = iconMap[data.icon] || Box;
  const colors = TYPE_COLORS[data.type] || { border: 'border-white/20', bg: 'bg-white/5', icon: 'text-gray-400', glow: 'none' };
  const badge = CLOUD_BADGE[data.cloud] || CLOUD_BADGE.global;
  const shortLabel = SHORT_LABELS[data.label] || data.label?.split('-').slice(-1)[0] || data.label;

  const isHighlighted = data.highlighted;
  const isDimmed = data.dimmed;
  const isAttackPath = data.attackPath;

  const showExpanded = hovered || selected;

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{
        opacity: isDimmed ? 0.18 : 1,
        scale: hovered && !isDimmed ? 1.06 : 1,
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        boxShadow: isDimmed
          ? 'none'
          : isHighlighted || selected
          ? `${colors.glow}, 0 0 0 1px rgba(255,255,255,0.15)`
          : hovered
          ? colors.glow
          : undefined,
      }}
      className={[
        'rounded-xl border backdrop-blur-md cursor-pointer overflow-hidden',
        colors.border, colors.bg,
        isAttackPath && !isDimmed ? 'node-pulse' : '',
      ].join(' ')}
    >
      {/* Attack path hot indicator */}
      {isAttackPath && !isDimmed && (
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-critical z-10">
          <div className="absolute inset-0 rounded-full bg-critical animate-ping opacity-70" />
        </div>
      )}

      <Handle type="target" position={Position.Left} style={{ background: 'rgba(255,255,255,0.3)', border: 'none', width: 8, height: 8 }} />

      {/* LEVEL 1 — always visible compact layout */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 min-w-[160px]">
        <div className={`p-2 rounded-lg bg-black/40 flex-shrink-0 ${colors.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">{data.type}</span>
            {data.cloud && data.cloud !== 'global' && (
              <span className={`text-[8px] px-1 py-0 rounded border font-bold ${badge.cls}`}>{badge.label}</span>
            )}
          </div>
          <div className="text-xs font-bold text-white truncate leading-tight mt-0.5">{shortLabel}</div>
        </div>
      </div>

      {/* LEVEL 2 — expanded on hover/select */}
      <AnimatePresence>
        {showExpanded && !isDimmed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden border-t border-white/8"
          >
            <div className="px-3 pb-2.5 pt-2 space-y-1.5">
              {data.label !== shortLabel && (
                <p className="text-[10px] text-gray-300 font-medium leading-tight truncate">{data.label}</p>
              )}
              {data.description && (
                <p className="text-[10px] text-gray-500 leading-snug">{data.description}</p>
              )}
              <div className="flex gap-1 flex-wrap pt-0.5">
                {data.public !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${data.public ? 'text-critical border-critical/30 bg-critical/10' : 'text-success border-success/20 bg-success/5'}`}>
                    {data.public ? '⚠ Public' : '✓ Private'}
                  </span>
                )}
                {data.sensitive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold text-high border-high/30 bg-high/10">
                    Sensitive
                  </span>
                )}
                {data.attackPath && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold text-critical border-critical/40 bg-critical/10">
                    Attack Path
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Handle type="source" position={Position.Right} style={{ background: 'rgba(255,255,255,0.3)', border: 'none', width: 8, height: 8 }} />
    </motion.div>
  );
}
