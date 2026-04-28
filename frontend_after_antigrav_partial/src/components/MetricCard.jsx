import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Smooth count-up hook
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof target !== 'number') { setVal(target); return; }
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return typeof target === 'number' ? val : target;
}

export default function MetricCard({ title, value, icon: Icon, colorClass, delay = 0, trend }) {
  const displayValue = useCountUp(typeof value === 'number' ? value : NaN, 900);
  const show = typeof value === 'number' ? displayValue : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.025, y: -2 }}
      className="glass-panel flex-1 px-4 py-3 flex items-center gap-3 relative overflow-hidden group cursor-default"
    >
      {/* Background glow */}
      <div className={`absolute -right-3 -top-3 w-14 h-14 opacity-8 blur-2xl rounded-full bg-current ${colorClass}`} />

      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-black/40 border border-white/8 group-hover:border-current transition-colors shrink-0 ${colorClass}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{title}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <p className="text-xl font-bold text-white leading-none">{show ?? '—'}</p>
          {trend != null && (
            <span className={`text-[10px] font-bold ${trend > 0 ? 'text-critical' : 'text-success'}`}>
              {trend > 0 ? `+${trend}` : trend}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
