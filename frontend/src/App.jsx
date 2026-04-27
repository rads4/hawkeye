import { useEffect, useState } from "react";
import axios from "axios";
import GraphView from "./components/GraphView";
import FindingsPanel from "./components/FindingsPanel";

function App() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [findings, setFindings] = useState([]);
  const [paths, setPaths] = useState([]);

  const fetchGraph = async () => {
    try {
      const res = await axios.get("http://localhost:8081/graph");
      setGraph(res.data);
    } catch (err) {
      console.error("Graph fetch error:", err);
    }
  };

  const fetchFindings = async () => {
    try {
      const res = await axios.get("http://localhost:8081/findings");
      setFindings(res.data.findings || []);
    } catch (err) {
      console.error("Findings fetch error:", err);
    }
  };

  const fetchAttackPaths = async () => {
    try {
      const res = await axios.get("http://localhost:8081/attack-paths");
      setPaths(res.data.paths || []);
    } catch (err) {
      console.error("Paths fetch error:", err);
    }
  };

  useEffect(() => {
    fetchGraph();
    fetchFindings();
    fetchAttackPaths();
  }, []);

  const highlightedNodeIds = new Set();
  const highlightedEdgeKeys = new Set();

  paths.forEach((path) => {
    const nodes = path.nodes;

    nodes.forEach((n) => highlightedNodeIds.add(n));

    for (let i = 0; i < nodes.length - 1; i++) {
      highlightedEdgeKeys.add(`${nodes[i]}-${nodes[i + 1]}`);
    }
  });

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%" }}>

      {/* ✅ Graph Section (FIXED HEIGHT) */}
      <div style={{ flex: 3, height: "100%" }}>
        <GraphView
          graph={graph}
          highlightedNodeIds={highlightedNodeIds}
          highlightedEdgeKeys={highlightedEdgeKeys}
        />
      </div>

      {/* Findings Section */}
      <div style={{ flex: 1, borderLeft: "1px solid #333", height: "100%" }}>
        <FindingsPanel findings={findings} />
      </div>

    </div>
  );
}

export default App;