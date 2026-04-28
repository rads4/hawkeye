const SEV_COLOR = {
  CRITICAL: { bg: "rgba(255,51,102,0.12)", border: "rgba(255,51,102,0.35)", text: "#ff3366", dot: "#ff3366" },
  HIGH:     { bg: "rgba(255,153,0,0.12)",  border: "rgba(255,153,0,0.35)",  text: "#ff9900", dot: "#ff9900" },
  MEDIUM:   { bg: "rgba(255,204,0,0.1)",   border: "rgba(255,204,0,0.3)",   text: "#ffcc00", dot: "#ffcc00" },
  LOW:      { bg: "rgba(34,221,136,0.08)", border: "rgba(34,221,136,0.25)", text: "#22dd88", dot: "#22dd88" },
};

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 11, color: valueColor || "#ccc", textAlign: "right", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Badge({ label, color, bg, border }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
      textTransform: "uppercase", padding: "2px 8px", borderRadius: 20,
      background: bg || "rgba(255,255,255,0.07)",
      border: `1px solid ${border || "rgba(255,255,255,0.15)"}`,
      color: color || "#aaa",
    }}>{label}</span>
  );
}

// ── Finding detail view ──────────────────────────────────────────────────────
function FindingDetail({ finding }) {
  const sev = SEV_COLOR[finding.severity] || SEV_COLOR.LOW;

  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
      {/* Severity badge */}
      <Badge label={finding.severity} color={sev.text} bg={sev.bg} border={sev.border} />

      {/* Title */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 12, marginBottom: 4, lineHeight: 1.4 }}>
        {finding.title}
      </h2>

      {/* Asset ID */}
      <div style={{ fontSize: 11, color: "#666", marginBottom: 16, fontFamily: "monospace" }}>
        {finding.asset_id}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }} />

      {/* Scores */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10, padding: "12px 14px", marginBottom: 16,
      }}>
        <Row label="Risk Score" value={finding.risk_score ?? "—"} valueColor={sev.text} />
        <Row label="Severity"   value={finding.severity} valueColor={sev.text} />
      </div>

      {/* Description */}
      {finding.description && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Description
          </div>
          <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{finding.description}</p>
        </div>
      )}

      {/* Vulnerabilities */}
      {finding.vulnerabilities?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Vulnerabilities ({finding.vulnerabilities.length})
          </div>
          {finding.vulnerabilities.slice(0, 5).map((v, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                background: v.severity === "CRITICAL" ? "rgba(255,51,102,0.15)" : "rgba(255,153,0,0.15)",
                color: v.severity === "CRITICAL" ? "#ff3366" : "#ff9900",
              }}>{v.severity}</span>
              <span style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace" }}>{v.id}</span>
              <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>{v.package}</span>
            </div>
          ))}
        </div>
      )}

      {/* Secrets */}
      {finding.secrets?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Detected Secrets ({finding.secrets.length})
          </div>
          {finding.secrets.map((s, i) => (
            <div key={i} style={{
              padding: "6px 10px", marginBottom: 4,
              background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.2)", borderRadius: 6,
            }}>
              <div style={{ fontSize: 10, color: "#ff3366", fontWeight: 700 }}>{s.rule_id}</div>
              <div style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace", marginTop: 2 }}>{s.match}</div>
            </div>
          ))}
        </div>
      )}

      {/* Compliance */}
      {finding.compliance?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Compliance
          </div>
          {finding.compliance.map((c, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 10, whiteSpace: "nowrap",
                background: c.status === "FAIL" ? "rgba(255,51,102,0.12)" : "rgba(34,221,136,0.08)",
                color: c.status === "FAIL" ? "#ff3366" : "#22dd88",
                border: c.status === "FAIL" ? "1px solid rgba(255,51,102,0.3)" : "1px solid rgba(34,221,136,0.2)",
              }}>{c.id} {c.status}</span>
              <span style={{ fontSize: 10, color: "#888", lineHeight: 1.4 }}>{c.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Attack Path detail view ───────────────────────────────────────────────────
function PathDetail({ path }) {
  const hops = path.nodes || [];
  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
      <Badge label="Attack Path" color="#ff3366" bg="rgba(255,51,102,0.12)" border="rgba(255,51,102,0.3)" />

      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "12px 0 16px" }}>
        {hops.length}-hop Attack Path
      </h2>

      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }} />

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Path
        </div>
        {hops.map((hop, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{
              padding: "7px 12px", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8,
              fontSize: 11, color: "#ddd", fontFamily: "monospace", width: "100%",
            }}>{hop}</div>
            {i < hops.length - 1 && (
              <div style={{ paddingLeft: 20, color: "#ff3366", fontSize: 14, lineHeight: 1.6 }}>↓</div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16, padding: "10px 14px",
        background: "rgba(255,51,102,0.07)", border: "1px solid rgba(255,51,102,0.2)", borderRadius: 8,
      }}>
        <div style={{ fontSize: 10, color: "#ff3366", fontWeight: 700, marginBottom: 4 }}>⚠ Risk Summary</div>
        <p style={{ fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>
          This path allows an attacker to move from {hops[0]} to {hops[hops.length - 1]} via {hops.length - 1} lateral step{hops.length !== 2 ? "s" : ""}.
        </p>
      </div>
    </div>
  );
}

// ── Node detail view ──────────────────────────────────────────────────────────
function NodeDetail({ node }) {
  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
      <Badge label={node.data?.type || "node"} />
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "12px 0 16px" }}>
        {node.data?.label || node.id}
      </h2>
      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }} />
      <Row label="Node ID" value={node.id} />
      <Row label="Type"    value={node.data?.type || "—"} />
    </div>
  );
}

// ── Main RightPanel export ────────────────────────────────────────────────────
export default function RightPanel({ item, type, onClose }) {
  return (
    <div style={{
      width: 320, height: "100%", flexShrink: 0,
      background: "rgba(10,10,16,0.97)",
      borderLeft: "1px solid rgba(255,255,255,0.07)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {type === "finding" ? "Finding Detail"
           : type === "path"  ? "Attack Path"
           : "Node Detail"}
        </span>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "#555", cursor: "pointer",
          fontSize: 18, lineHeight: 1, padding: "0 2px",
          transition: "color 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "#555"}
        >×</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {type === "finding" && <FindingDetail finding={item} />}
        {type === "path"    && <PathDetail    path={item}    />}
        {type === "node"    && <NodeDetail    node={item}    />}
      </div>
    </div>
  );
}
