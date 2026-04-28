import { useState } from 'react';
import { X, Key, CheckCircle, AlertCircle, Activity, ShieldCheck, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import clsx from 'clsx';

const API = 'http://localhost:3001/api';

// Simple SVG AWS logo
function AWSLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 24" fill="currentColor">
      <path d="M11.2 10.3c0 .4.1.7.2.9.2.2.4.3.7.3.3 0 .6-.1.9-.3l.1.8c-.3.2-.7.3-1.2.3-.5 0-.9-.2-1.2-.5-.3-.3-.5-.8-.5-1.5 0-.6.2-1.1.5-1.5.4-.4.8-.6 1.4-.6.4 0 .8.1 1.1.3l-.1.8c-.3-.2-.6-.3-.9-.3-.3 0-.5.1-.7.3-.2.2-.3.5-.3.9zm3.3 2.2h-.9V7.8h.9v4.7zm1.7 0h-.9V9.2h.9v3.3zm0-4.1h-.9V7.5h.9v.9zm4.3 4.1h-.9v-1.8c0-.5-.2-.8-.6-.8-.2 0-.3.1-.4.2-.1.1-.2.3-.2.5v1.9h-.9V9.2h.9v.5c.1-.2.3-.3.5-.4.2-.1.4-.2.7-.2.3 0 .6.1.8.3.2.2.3.5.3.9v2.2h-.2z"/>
      <text x="20" y="17" fontSize="8" fontWeight="bold" fill="currentColor">AWS</text>
    </svg>
  );
}

// Simple GCP logo
function GCPLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 24" fill="none">
      <circle cx="20" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M14 12h12M20 6v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="10" y="22" fontSize="7" fontWeight="bold" fill="currentColor">GCP</text>
    </svg>
  );
}

export default function ConnectAccountModal({ onClose, onSuccess }) {
  const [provider, setProvider]     = useState('aws');
  const [awsRole, setAwsRole]       = useState('');
  const [awsExtId, setAwsExtId]     = useState('');
  const [gcpFile, setGcpFile]       = useState('');
  const [status, setStatus]         = useState('idle');
  const [result, setResult]         = useState(null);
  const [message, setMessage]       = useState('');

  const handleConnect = async () => {
    setStatus('loading'); setResult(null);
    try {
      const res = provider === 'aws'
        ? await axios.post(`${API}/connect/aws`, { roleArn: awsRole, externalId: awsExtId })
        : await axios.post(`${API}/connect/gcp`, { fileContent: gcpFile });
      setStatus('success');
      setResult(res.data);
      setMessage(res.data.message);
      onSuccess?.();
      setTimeout(onClose, 3500);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Connection failed. Please try again.');
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => setGcpFile(evt.target.result);
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 28 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 28 }}
          transition={{ type: 'spring', stiffness: 270, damping: 26 }}
          className="glass-panel w-full max-w-md flex flex-col relative overflow-hidden"
        >
          {/* Header gradient strip */}
          <div className="h-1 w-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink" />

          <div className="p-7">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Connect Cloud Environment</h2>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Lock className="w-3 h-3 text-success" />
                Credentials are used for <span className="text-success font-semibold">read-only scanning only</span> — never stored.
              </div>
            </div>

            {/* Provider toggle with icons */}
            <div className="flex gap-2 p-1.5 bg-black/50 rounded-xl border border-white/8 mb-6">
              {[
                { id: 'aws', label: 'Amazon Web Services', activeColor: 'bg-orange-500/20 shadow-[0_0_14px_rgba(251,146,60,0.2)]' },
                { id: 'gcp', label: 'Google Cloud Platform', activeColor: 'bg-blue-500/20 shadow-[0_0_14px_rgba(96,165,250,0.2)]' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-sm transition-all',
                    provider === p.id ? `${p.activeColor} text-white` : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  )}
                >
                  {p.id === 'aws'
                    ? <span className="text-[10px] font-black tracking-widest text-orange-400 border border-orange-400/40 rounded px-1.5 py-0.5">AWS</span>
                    : <span className="text-[10px] font-black tracking-widest text-blue-400 border border-blue-400/40 rounded px-1.5 py-0.5">GCP</span>
                  }
                  <span className="hidden sm:block text-xs">{p.id.toUpperCase()}</span>
                </button>
              ))}
            </div>

            {/* Form */}
            <AnimatePresence mode="wait">
              {provider === 'aws' ? (
                <motion.div key="aws" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">IAM Role ARN</label>
                    <input
                      type="text" placeholder="arn:aws:iam::123456789012:role/HawkeyeRole"
                      value={awsRole} onChange={e => setAwsRole(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">External ID</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-3.5 w-4 h-4 text-gray-600" />
                      <input
                        type="text" placeholder="hwk_abc123"
                        value={awsExtId} onChange={e => setAwsExtId(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all"
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="gcp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="mb-6">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Service Account JSON</label>
                  <label htmlFor="gcp-file" className={clsx(
                    'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all',
                    gcpFile ? 'border-success/40 bg-success/5' : 'border-white/12 bg-black/30 hover:border-blue-400/40 hover:bg-blue-400/5'
                  )}>
                    {gcpFile ? (
                      <><CheckCircle className="w-8 h-8 text-success" /><span className="text-sm font-semibold text-success">JSON loaded</span><span className="text-xs text-gray-500">Click to change</span></>
                    ) : (
                      <><ShieldCheck className="w-8 h-8 text-gray-600" /><span className="text-sm font-semibold text-gray-400">Upload Service Account JSON</span><span className="text-xs text-gray-600">Drag & drop or click to browse</span></>
                    )}
                    <input id="gcp-file" type="file" accept=".json" className="hidden" onChange={handleFile} />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status feedback */}
            <AnimatePresence mode="wait">
              {status === 'error' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 rounded-xl bg-critical/8 border border-critical/25 text-critical text-xs flex gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-px shrink-0" />
                  <p>{message}</p>
                </motion.div>
              )}
              {status === 'success' && result && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 rounded-xl bg-success/8 border border-success/25 space-y-3">
                  <div className="flex items-center gap-2 text-success text-xs font-bold">
                    <CheckCircle className="w-4 h-4" />
                    {result.source === 'demo' ? 'Demo environment loaded' : 'Environment connected!'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[['Resources', result.resourceCount], ['Findings', result.findingsCount]].map(([k, v]) => (
                      <div key={k} className="bg-black/30 rounded-lg p-2 text-center">
                        <p className="text-base font-bold text-white">{v}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{k}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            <button
              onClick={handleConnect}
              disabled={status === 'loading' || status === 'success'}
              className="w-full glass-button-primary py-4 font-bold text-sm flex items-center justify-center gap-2 rounded-xl disabled:opacity-60"
            >
              {status === 'loading' ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning…</>
              ) : status === 'success' ? (
                <><CheckCircle className="w-5 h-5" />Connected</>
              ) : (
                <><Activity className="w-5 h-5" />Start Scan</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
