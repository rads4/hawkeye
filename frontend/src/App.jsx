import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import TopBar from './components/TopBar';
import FindingsPanel from './components/FindingsPanel';
import GraphView from './components/GraphView';
import DetailsPanel from './components/DetailsPanel';
import ConnectAccountModal from './components/ConnectAccountModal';

const API = 'http://localhost:8082';
const POLL_MS = 15000;

// ── Map backend node types → display types understood by CustomNode ──────────
const TYPE_MAP = {
  internet: 'Network', compute: 'Compute', identity: 'Identity',
  data: 'Data', secret: 'Identity', vulnerability: 'vulnerability',
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

// ── Build a filtered graph: only nodes in pathNodeIds
function buildPathGraph(fullGraph, pathNodeIds) {
  if (!fullGraph?.nodes?.length) return { nodes: [], edges: [] };
  const idSet = new Set(pathNodeIds);

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

  const edges = fullGraph.edges.filter(
    e => idSet.has(e.source) && idSet.has(e.target)
  ).map((e, idx) => ({
    ...e,
    id: e.id || `pe-${idx}`,
    isAttackPath: true,
  }));

  return { nodes, edges };
}

function buildHighlightSets(pathNodeIds, pathEdges) {
  const nodeIds    = new Set(pathNodeIds);
  const edgeKeys   = new Set();
  (pathEdges || []).forEach(e => edgeKeys.add(`${e.source}-${e.target}`));
  return { nodeIds, edgeKeys };
}

export default function App() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [fullGraph,   setFullGraph]   = useState({ nodes: [], edges: [] });
  const [findings,    setFindings]    = useState([]);
  const [attackPaths, setAttackPaths] = useState([]);
  const [compliance,  setCompliance]  = useState([]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [hoveredFindingId,  setHoveredFindingId]  = useState(null);
  const [selectedNode,      setSelectedNode]      = useState(null);
  const [isConnectOpen,     setIsConnectOpen]     = useState(false);
  const [isScanning,        setIsScanning]        = useState(false);
  const [cloudFilter,       setCloudFilter]       = useState('aws');

  const richFindings = findings
    .map(enrichFinding)
    .filter(f => f.provider === cloudFilter);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsScanning(true);
    try {
      const [gRes, fRes, pRes] = await Promise.allSettled([
        axios.get(`${API}/graph`),
        axios.get(`${API}/findings`),
        axios.get(`${API}/attack-paths`),
      ]);

      if (gRes.status === 'fulfilled') setFullGraph(gRes.value.data);
      if (fRes.status === 'fulfilled') {
        const raw = fRes.value.data;
        setFindings(raw.findings || []);
        setCompliance(raw.compliance || []);
      }
      if (pRes.status === 'fulfilled') setAttackPaths(pRes.value.data.paths || []);
    } catch (err) {
      console.error('[hawkeye] fetch error:', err);
    } finally {
      setTimeout(() => setIsScanning(false), 800);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  useEffect(() => {
    if (richFindings.length > 0 && !selectedFindingId) {
      setSelectedFindingId(richFindings[0].id);
    }
  }, [richFindings.length, selectedFindingId]);

  // ── Active finding + path resolution ─────────────────────────────────────
  const activeId = hoveredFindingId || selectedFindingId;
  const activeFinding = richFindings.find(f => f.id === activeId);

  const pathNodeIds = (() => {
    if (!activeFinding) return [];
    let baseNodes = [];
    if (attackPaths.length > 0) {
      const assetId = activeFinding.asset_id;
      const match = attackPaths.find(p => p.nodes?.some(n => n.includes(assetId)));
      if (match?.nodes) baseNodes = [...match.nodes];
    }
    
    if (baseNodes.length === 0) {
      baseNodes = activeFinding.pathNodeIds || [];
    }

    // ── STEP 3: ENHANCED FILTERING ──────────────────────────────────────────
    const enhancedIds = new Set(baseNodes);
    
    // Find any vulnerability nodes connected to the compute nodes in our path
    fullGraph.edges.forEach(edge => {
      const sourceNode = fullGraph.nodes.find(n => n.id === edge.source);
      const targetNode = fullGraph.nodes.find(n => n.id === edge.target);

      // If source is a compute node in our path, and target is a vulnerability, include it
      if (
        enhancedIds.has(edge.source) &&
        sourceNode?.type === 'compute' &&
        targetNode?.type === 'vulnerability'
      ) {
        enhancedIds.add(edge.target);
      }
    });

    const finalPathIds = Array.from(enhancedIds);
    
    // ── STEP 5: DEBUG LOGS ──────────────────────────────────────────────────
    console.log("[hawkeye] FINAL PATH IDS:", finalPathIds);
    console.log("[hawkeye] FULL GRAPH NODES:", fullGraph.nodes.length);
    
    return finalPathIds;
  })();

  const pathGraph = buildPathGraph(fullGraph, pathNodeIds);
  const { nodeIds: hlNodeIds, edgeKeys: hlEdgeKeys } = buildHighlightSets(pathNodeIds, pathGraph.edges);

  const handleSelectFinding = (id) => {
    setSelectedFindingId(id);
    setSelectedNode(null);
  };

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleConnectSuccess = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  const selectedFinding = richFindings.find(f => f.id === selectedFindingId) || null;
  const totalAssets = fullGraph.nodes.filter(n => n.type === 'compute' && (n.cloud || 'aws') === cloudFilter).length;
  const criticalCount = richFindings.filter(f => f.severity === 'CRITICAL').length;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-dark-bg text-white font-sans bg-grid-pattern vignette-effect">
      <TopBar
        onConnectClick={() => setIsConnectOpen(true)}
        onRunScan={fetchAll}
        totalAssets={totalAssets}
        criticalCount={criticalCount}
        cloudFilter={cloudFilter}
        setCloudFilter={setCloudFilter}
        isScanning={isScanning}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <FindingsPanel
          findings={richFindings}
          selectedFindingId={selectedFindingId}
          onSelectFinding={handleSelectFinding}
          onHoverFinding={setHoveredFindingId}
        />

        <div className="flex-1 flex flex-col relative z-0 overflow-hidden">
          {activeFinding && pathNodeIds.length > 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm shadow-xl">
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

        {(selectedFinding || selectedNode) && (
          <DetailsPanel
            finding={selectedFinding}
            selectedNode={selectedNode}
            onClose={() => { setSelectedNode(null); setSelectedFindingId(null); }}
          />
        )}
      </div>

      {isConnectOpen && (
        <ConnectAccountModal
          onClose={() => setIsConnectOpen(false)}
          onSuccess={handleConnectSuccess}
        />
      )}
    </div>
  );
}