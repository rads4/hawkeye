import { getBezierPath, EdgeLabelRenderer } from 'reactflow';

/**
 * AnimatedEdge — shows flowing particles on attack path edges.
 * Falls back to a simple styled path for non-attack edges.
 */
export default function AnimatedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, style, markerEnd,
}) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const isAttack = data?.isAttackPath;

  return (
    <>
      {/* Base path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        className={isAttack ? 'react-flow__edge-path attack-path-base' : 'react-flow__edge-path'}
        style={style}
        markerEnd={markerEnd}
      />

      {/* Glow layer for attack path */}
      {isAttack && (
        <path
          d={edgePath}
          fill="none"
          stroke="rgba(255,51,102,0.25)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}

      {/* Flowing particles on attack path */}
      {isAttack && [0, 0.33, 0.66].map((offset, i) => (
        <circle key={i} r="3.5" fill="#ff3366" style={{ filter: 'drop-shadow(0 0 4px #ff3366)' }}>
          <animateMotion
            dur="2s"
            begin={`${offset * 2}s`}
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      ))}
    </>
  );
}
