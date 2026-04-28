import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import TopBar from './components/TopBar';
import FindingsPanel from './components/FindingsPanel';
import GraphView from './components/GraphView';
import DetailsPanel from './components/DetailsPanel';
import ConnectAccountModal from './components/ConnectAccountModal';

const API = 'http://localhost:8081';
const POLL_MS = 15000;

// ── Map backend node types → display types understood by CustomNode ──────────
const TYPE_MAP = {
  internet: 'Network', compute: 'Compute', identity: 'Identity',
  data: 'Data', secret: 'Identity', vulnerability: 'Compute',
  resource: 'Compute', runtime: 'Compute',
};

// ── Build a "finding-like" object from a raw backend finding ─────────────────
function enrichFinding(f, idx) {
  return {
    ...f,
    id: f.id || `finding-${f.asset_id}-${idx}`,
    title:             f.title || 'Security Finding',
    severity:          f.severity || 'MEDIUM',
    riskScore:         f.risk_score ?? f.riskScore ?? 0,
    summary:           f.description || '',
    whyItMatters:      f.description || 'This finding indicates a potential security risk in your cloud environment.',
    attackPathSummary: f.asset_id
      ? `Internet → compute-${f.asset_id} → identity-${f.asset_id} → data-${f.asset_id}`
      : undefined,
    fixSteps:          f.fixSteps || [
      'Review and restrict IAM permissions for the affected resource.',
      'Enable VPC flow logs and CloudTrail for audit visibility.',
      'Apply least-privilege access controls.',
    ],
    tags:              f.tags || [f.severity],
    blastRadius:       f.blastRadius ?? (f.risk_score > 15 ? 4 : 2),
    provider:          f.provider || 'aws',
    compliance:        (f.compliance || []).map(c => ({
      id:     c.id,
      title:  c.title,
      status: c.status?.toLowerCase(),
    })),
    // Which graph node IDs belong to this finding
    pathNodeIds: f.asset_id ? [
      'internet',
      `compute-${f.asset_id}`,
      `identity-${f.asset_id}`,
      `data-${f.asset_id}`,
      ...(f.has_secret        ? [`secret-${f.asset_id}`]        : []),
      ...(f.has_vulnerability ? [`vuln-${f.asset_id}`]          : []),
    ] : [],
  };
}

// ── Build a filtered graph: only nodes in pathNodeIds, dimmed = everything else
function buildPathGraph(fullGraph, pathNodeIds) {
  if (!fullGraph?.nodes?.length) return { nodes: [], edges: [] };

  const idSet = new Set(pathNodeIds);

  // Nodes that belong to this path
  const nodes = fullGraph.nodes
    .filter(n => idSet.has(n.id))
    .map(n => ({
      ...n,
      type: TYPE_MAP[n.type] || 'Compute',
      data: {
        label: n.label || n.id,
        type:  TYPE_MAP[n.type] || 'Compute',
        highlighted: true,
        dimmed: false,
        attackPath: true,
      },
    }));

  // Edges where BOTH endpoints are in the path
  const edges = fullGraph.edges.filter(
    e => idSet.has(e.source) && idSet.has(e.target)
  ).map((e, idx) => ({
    ...e,
    id: e.id || `pe-${idx}`,
    isAttackPath: true,
  }));

  return { nodes, edges };
}

// ── Build highlighted sets for the existing GraphView highlight system ────────
function buildHighlightSets(pathNodeIds, pathEdges) {
  const nodeIds    = new Set(pathNodeIds);
  const edgeKeys   = new Set();
  (pathEdges || []).forEach(e => edgeKeys.add(`${e.source}-${e.target}`));
  return { nodeIds, edgeKeys };
}

export default function App() {
  // ── raw data ────────────────────────────────────────────────────────────
  const [fullGraph,   setFullGraph]   = useState({ nodes: [], edges: [] });
  const [findings,    setFindings]    = useState([]);
  const [attackPaths, setAttackPaths] = useState([]);
  const [compliance,  setCompliance]  = useState([]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [hoveredFindingId,  setHoveredFindingId]  = useState(null);
  const [selectedNode,      setSelectedNode]      = useState(null);
  const [isConnectOpen,     setIsConnectOpen]     = useState(false);
  const [scanStatus,        setScanStatus]        = useState('idle');
  const [lastScanTime,      setLastScanTime]      = useState(null);

  const richFindings = findings.map(enrichFinding);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [gRes, fRes, pRes] = await Promise.allSettled([
        axios.get(`${API}/graph`),
        axios.get(`${API}/findings`),
        axios.get(`${API}/attack-paths`),
      ]);

      if (gRes.status === 'fulfilled') {
        setFullGraph(gRes.value.data);
      }
      if (fRes.status === 'fulfilled') {
        const raw = fRes.value.data;
        setFindings(raw.findings  || []);
        setCompliance(raw.compliance || []);
        setLastScanTime(new Date().toISOString());
        setScanStatus('connected');
      }
      if (pRes.status === 'fulfilled') {
        setAttackPaths(pRes.value.data.paths || []);
      }
    } catch (err) {
      console.error('[hawkeye] fetch error:', err);
      setScanStatus('idle');
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  // Auto-select first finding once loaded
  useEffect(() => {
    if (richFindings.length > 0 && !selectedFindingId) {
      setSelectedFindingId(richFindings[0].id);
    }
  }, [richFindings.length]);  // eslint-disable-line

  // ── Active finding + path resolution ─────────────────────────────────────
  // Hovered finding takes preview precedence
  const activeId = hoveredFindingId || selectedFindingId;
  const activeFinding = richFindings.find(f => f.id === activeId) || richFindings[0];

  // Build path node IDs: prefer backend attack-path nodes that match the finding's asset_id,
  // fall back to the finding's own pathNodeIds
  const pathNodeIds = (() => {
    if (!activeFinding) return [];

    // Try to find a matching attack path from the backend
    if (attackPaths.length > 0) {
      const assetId = activeFinding.asset_id;
      const match = attackPaths.find(p =>
        p.nodes?.some(n => n.includes(assetId))
      ) || attackPaths[0]; // fallback: first attack path
      if (match?.nodes) return match.nodes;
    }

    return activeFinding.pathNodeIds || [];
  })();

  const pathGraph = buildPathGraph(fullGraph, pathNodeIds);
  const { nodeIds: hlNodeIds, edgeKeys: hlEdgeKeys } = buildHighlightSets(pathNodeIds, pathGraph.edges);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectFinding = (id) => {
    setSelectedFindingId(id);
    setSelectedNode(null);
  };

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleConnectSuccess = useCallback(() => {
    setScanStatus('scanning');
    setTimeout(() => {
      fetchAll();
      setScanStatus('connected');
    }, 800);
  }, [fetchAll]);

  const selectedFinding = richFindings.find(f => f.id === selectedFindingId) || null;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-dark-bg text-white font-sans bg-grid-pattern vignette-effect">

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <TopBar
        onConnectClick={() => setIsConnectOpen(true)}
        lastScanTime={lastScanTime}
        scanStatus={scanStatus}
      />

      {/* ── SUMMARY STRIP ──────────────────────────────────────────────────── */}
      <SummaryStrip
        findings={richFindings}
        compliance={compliance}
        attackPaths={attackPaths}
        graph={fullGraph}
        onRunScan={fetchAll}
      />

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT: Findings panel */}
        <FindingsPanel
          findings={richFindings}
          selectedFindingId={selectedFindingId}
          onSelectFinding={handleSelectFinding}
          onHoverFinding={setHoveredFindingId}
        />

        {/* CENTER: Graph — filtered to active attack path only */}
        <div className="flex-1 flex flex-col relative z-0 overflow-hidden">
          {/* Path label */}
          {activeFinding && pathNodeIds.length > 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                Attack Path · {pathNodeIds.length} nodes
              </span>
            </div>
          )}
          <GraphView
            graph={pathGraph}
            highlightedNodeIds={hlNodeIds}
            highlightedEdgeKeys={hlEdgeKeys}
            onNodeSelect={handleNodeSelect}
          />
        </div>

        {/* RIGHT: Details panel */}
        {(selectedFinding || selectedNode) && (
          <DetailsPanel
            finding={selectedFinding}
            selectedNode={selectedNode}
            onClose={() => { setSelectedNode(null); setSelectedFindingId(null); }}
          />
        )}
      </div>

      {/* ── CONNECT MODAL ──────────────────────────────────────────────────── */}
      {isConnectOpen && (
        <ConnectAccountModal
          onClose={() => setIsConnectOpen(false)}
          onSuccess={handleConnectSuccess}
        />
      )}
    </div>
  );
}

// ── Summary strip (replaces TopSummaryBar) ───────────────────────────────────
function SummaryStrip({ findings, compliance, attackPaths, graph, onRunScan }) {
  const critCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const failCount = (compliance || []).filter(c => c.status === 'FAIL').length;
  const totalAssets = (graph?.nodes || []).filter(n => n.type === 'compute').length;

  return (
    <div className="h-10 border-b border-white/6 bg-black/30 backdrop-blur-sm flex items-center gap-6 px-6 shrink-0 text-xs">
      <Metric label="Assets" value={totalAssets || '—'} color="text-blue-400" />
      <Metric label="Critical" value={critCount} color="text-red-400" />
      <Metric label="High" value={highCount} color="text-orange-400" />
      <Metric label="Attack Paths" value={attackPaths.length} color="text-pink-400" />
      <Metric label="Compliance Fails" value={failCount} color={failCount > 0 ? 'text-red-400' : 'text-green-400'} />

      <div className="ml-auto">
        <button
          onClick={onRunScan}
          className="glass-button text-xs flex items-center gap-1.5 py-1 px-3"
        >
          <span className="text-neon-blue">↺</span> Run Scan
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-600">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}