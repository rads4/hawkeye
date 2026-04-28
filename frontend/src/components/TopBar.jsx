import { ShieldAlert, PlusCircle, RefreshCw } from 'lucide-react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

function Counter({ value, className }) {
  const countRef = useRef(null);

  useEffect(() => {
    const node = countRef.current;
    if (!node) return;
    
    const controls = animate(0, value, {
      duration: 1,
      ease: [0.33, 1, 0.68, 1], // easeOutExpo-like
      onUpdate(value) {
        node.textContent = Math.round(value);
      },
    });

    return () => controls.stop();
  }, [value]);

  return <span ref={countRef} className={className}>0</span>;
}

export default function TopBar({ 
  onConnectClick, 
  onRunScan,
  totalAssets = 0,
  criticalCount = 0,
  cloudFilter = 'aws',
  setCloudFilter,
  isScanning = false 
}) {
  return (
    <div className="h-16 border-b border-white/8 bg-[#0B0F17]/90 backdrop-blur-xl flex items-center justify-between px-8 z-30 w-full shrink-0 shadow-lg">
      {/* Brand */}
      <div className="flex items-center gap-4 group cursor-default">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b366ff] to-[#00f0ff] flex items-center justify-center shadow-[0_0_20px_rgba(179,102,255,0.3)] transition-shadow duration-300 group-hover:shadow-[0_0_25px_rgba(0,240,255,0.4)]">
          <ShieldAlert className="w-6 h-6 text-white drop-shadow-md" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold tracking-[0.03em] leading-none bg-clip-text text-transparent bg-gradient-to-r from-[#b366ff] to-[#00f0ff] filter drop-shadow-[0_0_10px_rgba(179,102,255,0.2)]">
            HAWKEYE
          </span>
          <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-[0.15em] mt-1 opacity-70">Cloud Security</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="hidden lg:flex items-center gap-12">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.1em]">Assets</span>
          <Counter value={totalAssets} className="text-xl font-bold text-[#00f0ff] tracking-tight" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.1em]">Critical</span>
          <Counter value={criticalCount} className="text-xl font-bold text-[#ff3366] tracking-tight" />
        </div>
        
        {/* Cloud Toggle */}
        <div className="flex bg-white/[0.03] p-1.5 rounded-xl border border-white/10 shadow-inner">
          <button 
            onClick={() => setCloudFilter('aws')}
            className={`px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all duration-200 ${cloudFilter === 'aws' ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            AWS
          </button>
          <button 
            onClick={() => setCloudFilter('gcp')}
            className={`px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all duration-200 ${cloudFilter === 'gcp' ? 'bg-[#b366ff]/15 text-[#b366ff] border border-[#b366ff]/30 shadow-[0_0_15px_rgba(179,102,255,0.1)]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            GCP
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        <button
          onClick={onRunScan}
          disabled={isScanning}
          className="glass-button flex items-center gap-2.5 text-[13px] font-semibold py-2.5 px-5 group hover:shadow-[0_0_15px_rgba(179,102,255,0.15)]"
        >
          <RefreshCw className={`w-4 h-4 text-[#b366ff] ${isScanning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {isScanning ? 'Scanning...' : 'Run Scan'}
        </button>

        <button
          onClick={onConnectClick}
          className="glass-button-primary flex items-center gap-2.5 text-[13px] font-bold py-2.5 px-6 shadow-lg hover:shadow-[0_0_20px_rgba(179,102,255,0.3)]"
        >
          <PlusCircle className="w-4 h-4" />
          Connect Environment
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#b366ff] to-[#ff007f] flex items-center justify-center text-[13px] font-bold cursor-pointer border border-white/20 shadow-md transition-transform hover:scale-110 active:scale-95">
          JD
        </div>
      </div>
    </div>
  );
}
