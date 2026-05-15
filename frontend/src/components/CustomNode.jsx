import { Handle, Position } from 'reactflow';
import { Globe, Server, User, Database, ShieldAlert, Network, Box, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const iconMap = { Globe, Server, User, Database, ShieldAlert, Network, AlertTriangle };

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
  Network: { border: 'border-[#00f0ff]/50', bg: 'bg-[#00f0ff]/8', icon: 'text-[#00f0ff]', glow: '0 0 25px rgba(0,240,255,0.25)' },
  Compute: { border: 'border-[#3b82f6]/50', bg: 'bg-[#3b82f6]/8', icon: 'text-[#60a5fa]', glow: '0 0 25px rgba(59,130,246,0.25)' },
  Identity: { border: 'border-[#b366ff]/50', bg: 'bg-[#b366ff]/8', icon: 'text-[#b366ff]', glow: '0 0 25px rgba(179,102,255,0.25)' },
  Data: { border: 'border-[#ffcc00]/50', bg: 'bg-[#ffcc00]/8', icon: 'text-[#ffcc00]', glow: '0 0 25px rgba(255,204,0,0.25)' },

  // 🔥 ADD THIS BLOCK
  vulnerability: {
    border: 'border-[#ff4d4f]/60',
    bg: 'bg-[#ff4d4f]/10',
    icon: 'text-[#ff4d4f]',
    glow: '0 0 35px rgba(255,77,79,0.35)'
  },
};

const CLOUD_BADGE = {
  aws: { label: 'AWS', cls: 'text-[#ff9900] bg-[#ff9900]/15 border-[#ff9900]/30 shadow-[0_0_8px_rgba(255,153,0,0.2)]' },
  gcp: { label: 'GCP', cls: 'text-[#4285f4] bg-[#4285f4]/15 border-[#4285f4]/30 shadow-[0_0_8px_rgba(66,133,244,0.2)]' },
  global: { label: '🌐', cls: 'text-gray-500 bg-white/5 border-white/10' },
};

export default function CustomNode({ data, selected }) {
  const [hovered, setHovered] = useState(false);

  // 🔥 fallback icon fix
  const Icon = iconMap[data.icon] || (data.type === 'vulnerability' ? AlertTriangle : Box);

  const colors = TYPE_COLORS[data.type] || {
    border: 'border-white/20',
    bg: 'bg-white/5',
    icon: 'text-gray-400',
    glow: 'none'
  };

  const badge = CLOUD_BADGE[data.cloud] || CLOUD_BADGE.global;
  const shortLabel = SHORT_LABELS[data.label] || data.label?.split('-').slice(-1)[0] || data.label;

  const isHighlighted = data.highlighted;
  const isDimmed = data.dimmed;
  const isAttackPath = data.attackPath;

  const showExpanded = (hovered || selected) && !isDimmed;

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{
        opacity: isDimmed ? 0.15 : 1,
        scale: (hovered || selected) && !isDimmed ? 1.05 : 1,
      }}
      transition={{ duration: 0.25 }}
      style={{
        boxShadow: isDimmed
          ? 'none'
          : (selected || hovered)
            ? `${colors.glow}, 0 0 0 1px rgba(255,255,255,0.2)`
            : undefined,
      }}
      className={[
        'rounded-2xl border backdrop-blur-xl cursor-pointer overflow-hidden transition-all duration-300',
        colors.border, colors.bg,
        isAttackPath && !isDimmed ? 'shadow-[0_0_30px_rgba(255,51,102,0.15)]' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'rgba(255,255,255,0.4)', width: 10, height: 10 }} />

      <div className="flex items-center gap-3.5 px-4 py-3.5 min-w-[180px]">
        <div className={`p-2.5 rounded-xl bg-black/50 border border-white/5 ${colors.icon}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase font-black tracking-[0.15em] text-gray-500">
              {data.type}
            </span>
            {data.cloud && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-black ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>

          <div className="text-[13px] font-bold text-white truncate">
            {shortLabel}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: 'rgba(255,255,255,0.4)', width: 10, height: 10 }} />
    </motion.div>
  );
}