import { useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  MarkerType, ReactFlowProvider, useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import CustomNode from './CustomNode';
import AnimatedEdge from './AnimatedEdge';

const nodeTypes = { custom: CustomNode };
const edgeTypes = { animated: AnimatedEdge };

function buildLayout(nodes, edges) {
  // Create a fresh dagre instance each time to avoid state pollution
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 90, nodesep: 55, marginx: 40, marginy: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: 185, height: 72 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      targetPosition: 'left',
      sourcePosition: 'right',
      position: { x: pos.x - 92.5, y: pos.y - 36 },
    };
  });
}

// Inner component — has access to useReactFlow()
function GraphViewContent({
  graphData, loading, highlightedNodeIds, highlightedEdgeKeys, onNodeSelect,
}) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const fitTimerRef = useRef(null);

  const scheduleFit = useCallback((nodeIds) => {
    clearTimeout(fitTimerRef.current);
    fitTimerRef.current = setTimeout(() => {
      if (nodeIds?.size > 0) {
        fitView({
          nodes: [...nodeIds].map((id) => ({ id })),
          padding: 0.45,
          duration: 700,
          minZoom: 0.5,
          maxZoom: 1.4,
        });
      } else {
        fitView({ padding: 0.25, duration: 600, minZoom: 0.3, maxZoom: 1.2 });
      }
    }, 120);
  }, [fitView]);

  useEffect(() => {
    if (!graphData?.nodes?.length) { setNodes([]); setEdges([]); return; }

    const hasHighlight = highlightedNodeIds?.size > 0;

    const styledNodes = graphData.nodes.map((n) => ({
      id: n.id,

      // ✅ REQUIRED FOR REACTFLOW
      type: "custom",

      // ✅ REQUIRED STRUCTURE
      data: {
        label: n.label || n.id,
        type: n.type,

        highlighted: highlightedNodeIds?.has(n.id) ?? false,
        dimmed: hasHighlight && !(highlightedNodeIds?.has(n.id)),
      },

      // ✅ TEMP POSITION (dagre will override)
      position: { x: 0, y: 0 },
    }));

    const styledEdges = graphData.edges.map((e, idx) => {
      const eKey = `${e.source}-${e.target}`;
      const isHL = highlightedEdgeKeys?.has(eKey);
      const isAP = e.isAttackPath || isHL;
      const isDim = hasHighlight && !isHL;

      return {
        ...e,
        id: e.id || `e-${idx}`,
        type: isAP && !isDim ? 'animated' : 'default',
        data: { isAttackPath: isAP },
        style: {
          stroke: isDim ? 'rgba(255,255,255,0.04)' : isAP ? '#ff3366' : 'rgba(255,255,255,0.18)',
          strokeWidth: isAP && !isDim ? 2.5 : 1,
          transition: 'all 0.35s ease',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isDim ? 'rgba(255,255,255,0.04)' : isAP ? '#ff3366' : 'rgba(255,255,255,0.2)',
        },
        label: isDim ? '' : e.label,
        animated: false, // we handle animation in AnimatedEdge
        labelStyle: { fill: 'rgba(255,255,255,0.35)', fontSize: 9 },
        labelBgStyle: { fill: 'transparent' },
      };
    });

    const layoutedNodes = buildLayout(styledNodes, styledEdges);
    setNodes(layoutedNodes);
    setEdges(styledEdges);
  }, [graphData, highlightedNodeIds, highlightedEdgeKeys, setNodes, setEdges, scheduleFit]);

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({
          padding: 0.25,
          duration: 600,
        });
      }, 100);
    }
  }, [nodes, fitView]);

  const handleNodeClick = useCallback((_, node) => onNodeSelect?.(node), [onNodeSelect]);
  const handleFitView = useCallback(() => fitView({ padding: 0.25, duration: 600 }), [fitView]);

  if (!loading && !graphData?.nodes?.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-4">
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-800 flex items-center justify-center text-3xl opacity-30">⬡</div>
        <div className="text-center">
          <p className="font-semibold text-gray-400">No graph data yet</p>
          <p className="text-sm text-gray-600 mt-1">Connect an AWS or GCP environment to start scanning</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-transparent h-full" style={{ height: "100%" }}>
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-dark-bg/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-10 h-10 border-2 border-neon-purple border-t-transparent rounded-full" />
            <p className="text-sm text-gray-400 animate-pulse">Loading graph…</p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        className="bg-transparent"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#ffffff" gap={28} size={1} opacity={0.025} />

        {/* Glassmorphism Controls — no white box */}
        <Controls showInteractive={false} position="bottom-left">
          <div className="mt-1">
            <button
              onClick={handleFitView}
              title="Fit view"
              className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer"
              style={{ background: 'rgba(15,15,22,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M0 0h4v1H1v3H0V0zm8 0h4v4h-1V1H8V0zM0 8h1v3h3v1H0V8zm11 3H8v1h4V8h-1v3z" />
              </svg>
            </button>
          </div>
        </Controls>

        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            if (n.data?.dimmed) return 'rgba(255,255,255,0.05)';
            if (n.data?.attackPath) return '#ff3366';
            const t = n.data?.type;
            if (t === 'Network') return '#00f0ff';
            if (t === 'Compute') return '#b366ff';
            if (t === 'Identity') return '#ff007f';
            if (t === 'Data') return '#ffcc00';
            if (t === 'vulnerability') return '#ff4d4f';
            return '#444';
          }}
          nodeStrokeWidth={0}
          maskColor="rgba(0,0,0,0.55)"
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>
    </div>
  );
}

export default function GraphView({
  graph,
  highlightedNodeIds,
  highlightedEdgeKeys,
  onNodeSelect,
}) {
  return (
    <ReactFlowProvider>
      <GraphViewContent
        graphData={graph}
        highlightedNodeIds={highlightedNodeIds}
        highlightedEdgeKeys={highlightedEdgeKeys}
        onNodeSelect={onNodeSelect}
      />
    </ReactFlowProvider>
  );
}
