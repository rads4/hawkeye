import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import GraphView from "./components/GraphView";
import Sidebar from "./components/Sidebar";
import RightPanel from "./components/RightPanel";

const API = "http://localhost:8081";
const POLL_MS = 12000;

export default function App() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [graph, setGraph]       = useState({ nodes: [], edges: [] });
  const [findings, setFindings] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [paths, setPaths]       = useState([]);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [selectedPath, setSelectedPath]       = useState(null);
  const [selectedNode, setSelectedNode]       = useState(null);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [gRes, fRes, pRes] = await Promise.allSettled([
        axios.get(`${API}/graph`),
        axios.get(`${API}/findings`),
        axios.get(`${API}/attack-paths`),
      ]);

      if (gRes.status === "fulfilled") setGraph(gRes.value.data);
      if (fRes.status === "fulfilled") {
        setFindings(fRes.value.data.findings  || []);
        setCompliance(fRes.value.data.compliance || []);
      }
      if (pRes.status === "fulfilled") setPaths(pRes.value.data.paths || []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  // ── Highlight computation ─────────────────────────────────────────────────
  const highlightedNodeIds = new Set();
  const highlightedEdgeKeys = new Set();

  // From selected attack path
  if (selectedPath?.nodes) {
    selectedPath.nodes.forEach((n) => highlightedNodeIds.add(n));
    for (let i = 0; i < selectedPath.nodes.length - 1; i++) {
      highlightedEdgeKeys.add(`${selectedPath.nodes[i]}-${selectedPath.nodes[i + 1]}`);
    }
  }

  // From selected finding (highlight asset_id related compute node)
  if (selectedFinding?.asset_id && !selectedPath) {
    const nodePrefix = "compute-" + selectedFinding.asset_id;
    graph.nodes.forEach((n) => {
      if (n.id.startsWith("compute-" + selectedFinding.asset_id) ||
          n.id.startsWith("identity-" + selectedFinding.asset_id) ||
          n.id.startsWith("data-" + selectedFinding.asset_id) ||
          n.id.startsWith("secret-" + selectedFinding.asset_id) ||
          n.id.startsWith("vuln-" + selectedFinding.asset_id)) {
        highlightedNodeIds.add(n.id);
      }
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectFinding = (f) => {
    setSelectedFinding(f);
    setSelectedPath(null);
    setSelectedNode(null);
  };

  const handleSelectPath = (p) => {
    setSelectedPath(p);
    setSelectedFinding(null);
    setSelectedNode(null);
  };

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    setSelectedFinding(null);
    setSelectedPath(null);
  };

  // Right panel content
  const rightPanelItem = selectedFinding || selectedPath || selectedNode;
  const rightPanelType = selectedFinding ? "finding"
    : selectedPath ? "path"
    : selectedNode ? "node"
    : null;

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100%",
      background: "#0a0a0f",
      color: "#e2e2e8",
      fontFamily: "'Inter', 'system-ui', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <Sidebar
        findings={findings}
        compliance={compliance}
        paths={paths}
        graph={graph}
        selectedFinding={selectedFinding}
        selectedPath={selectedPath}
        onSelectFinding={handleSelectFinding}
        onSelectPath={handleSelectPath}
      />

      {/* ── MAIN GRAPH ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        <GraphView
          graph={graph}
          highlightedNodeIds={highlightedNodeIds}
          highlightedEdgeKeys={highlightedEdgeKeys}
          onNodeSelect={handleNodeSelect}
        />
      </div>

      {/* ── RIGHT PANEL (conditional) ─────────────────────────────────────── */}
      {rightPanelItem && (
        <RightPanel
          item={rightPanelItem}
          type={rightPanelType}
          onClose={() => {
            setSelectedFinding(null);
            setSelectedPath(null);
            setSelectedNode(null);
          }}
        />
      )}
    </div>
  );
}