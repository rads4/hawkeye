import { ShieldAlert, PlusCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TopBar({ onConnectClick, lastScanTime, scanStatus }) {
  const [secondsAgo, setSecondsAgo] = useState(null);

  useEffect(() => {
    if (!lastScanTime) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(lastScanTime).getTime()) / 1000);
      setSecondsAgo(diff);
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [lastScanTime]);

  const statusConfig = {
    connected: { color: 'text-success', dot: 'bg-success', label: 'Connected', Icon: Wifi },
    scanning:  { color: 'text-neon-blue', dot: 'bg-neon-blue animate-pulse', label: 'Scanning...', Icon: RefreshCw },
    idle:      { color: 'text-gray-500', dot: 'bg-gray-600', label: 'Not connected', Icon: WifiOff },
  };
  const { color, dot, label, Icon } = statusConfig[scanStatus] || statusConfig.idle;

  const scanLabel = secondsAgo !== null
    ? secondsAgo < 60
      ? `Last scan: ${secondsAgo}s ago`
      : `Last scan: ${Math.floor(secondsAgo / 60)}m ago`
    : null;

  return (
    <div className="h-16 border-b border-white/10 bg-dark-bg/80 backdrop-blur-md flex items-center justify-between px-6 z-10 w-full shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_20px_rgba(179,102,255,0.4)]">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-wider text-gradient">HAWKEYE</span>
          <span className="ml-2 text-[10px] text-gray-500 font-medium uppercase tracking-widest">Cloud Security</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Scan status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dot}`} />
          <span className={`text-xs font-semibold ${color}`}>{label}</span>
          {scanLabel && <span className="text-xs text-gray-500">· {scanLabel}</span>}
        </div>

        <button
          onClick={onConnectClick}
          className="glass-button flex items-center gap-2 text-sm font-medium"
        >
          <PlusCircle className="w-4 h-4 text-neon-blue" />
          Connect Environment
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-xs font-bold cursor-pointer border border-white/20 shadow-[0_0_10px_rgba(179,102,255,0.3)]">
          JD
        </div>
      </div>
    </div>
  );
}
