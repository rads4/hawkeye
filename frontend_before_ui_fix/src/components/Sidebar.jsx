import { useState } from "react";

// ── Colour helpers ────────────────────────────────────────────────────────────
const SEV_COLOR = {
  CRITICAL: { dot: "#ff3366", bg: "rgba(255,51,102,0.12)", border: "rgba(255,51,102,0.3)", text: "#ff3366" },
  HIGH:     { dot: "#ff9900", bg: "rgba(255,153,0,0.12)",  border: "rgba(255,153,0,0.3)",  text: "#ff9900" },
  MEDIUM:   { dot: "#ffcc00", bg: "rgba(255,204,0,0.1)",   border: "rgba(255,204,0,0.25)", text: "#ffcc00" },
  LOW:      { dot: "#22dd88", bg: "rgba(34,221,136,0.08)", border: "rgba(34,221,136,0.2)", text: "#22dd88" },
};

const STATUS_COLOR = {
  FAIL: { bg: "rgba(255,51,102,0.12)", border: "rgba(255,51,102,0.3)", text: "#ff3366" },
  PASS: { bg: "rgba(34,221,136,0.08)", border: "rgba(34,221,136,0.2)", text: "#22dd88" },
};

// ── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px 8px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#888", textTransform: "uppercase" }}>
        {icon} {title}
      </span>
      {count != null && (
        <span style={{
          fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "1px 7px", color: "#aaa",
        }}>{count}</span>
      )}
    </div>
  );
}

// ── Attack Paths section ─────────────────────────────────────────────────────
function PathsSection({ paths, selectedPath, onSelectPath }) {
  if (!paths.length) return (
    <div style={{ padding: "12px 16px", fontSize: 11, color: "#555" }}>No attack paths detected</div>
  );

  return (
    <div style={{ overflowY: "auto", maxHeight: 180 }}>
      {paths.map((p, i) => {
        const isActive = selectedPath === p;
        const hops = p.nodes || [];
        return (
          <button key={i} onClick={() => onSelectPath(isActive ? null : p)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 16px", background: isActive ? "rgba(179,102,255,0.12)" : "transparent",
              border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
              color: isActive ? "#b366ff" : "#ccc", cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "#ff3366", fontWeight: 700 }}>PATH {i + 1}</span>
              <span style={{ fontSize: 10, color: "#555" }}>{hops.length} hops</span>
            </div>
            <div style={{ fontSize: 10, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {hops.join(" → ")}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Findings section ─────────────────────────────────────────────────────────
function FindingsSection({ findings, selectedFinding, onSelectFinding }) {
  if (!findings.length) return (
    <div style={{ padding: "12px 16px", fontSize: 11, color: "#555" }}>No findings yet</div>
  );

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {findings.map((f, i) => {
        const isActive = selectedFinding?.asset_id === f.asset_id && selectedFinding?.title === f.title;
        const sev = SEV_COLOR[f.severity] || SEV_COLOR.LOW;
        return (
          <button key={i} onClick={() => onSelectFinding(isActive ? null : f)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "9px 16px", background: isActive ? "rgba(179,102,255,0.1)" : "transparent",
              border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
                padding: "2px 7px", borderRadius: 20,
                background: sev.bg, border: `1px solid ${sev.border}`, color: sev.text,
              }}>{f.severity}</span>
              {f.risk_score != null && (
                <span style={{ fontSize: 10, color: "#666" }}>Score {f.risk_score}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: isActive ? "#fff" : "#ccc", lineHeight: 1.4, fontWeight: 600 }}>
              {f.title}
            </div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {f.asset_id}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Compliance section ───────────────────────────────────────────────────────
function ComplianceSection({ compliance }) {
  const failures = compliance.filter(c => c.status === "FAIL");
  if (!failures.length) return (
    <div style={{ padding: "12px 16px", fontSize: 11, color: "#22dd88" }}>✓ All checks passing</div>
  );

  return (
    <div style={{ overflowY: "auto", maxHeight: 160 }}>
      {failures.map((c, i) => {
        const st = STATUS_COLOR[c.status] || STATUS_COLOR.FAIL;
        return (
          <div key={i} style={{
            padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 20, marginTop: 1,
              background: st.bg, border: `1px solid ${st.border}`, color: st.text, whiteSpace: "nowrap",
            }}>{c.id}</span>
            <span style={{ fontSize: 10, color: "#bbb", lineHeight: 1.4 }}>{c.title}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Cloud Resources section ───────────────────────────────────────────────────
function CloudSection({ graph }) {
  const nodeTypeMap = {};
  (graph.nodes || []).forEach(n => {
    const t = n.type || "resource";
    nodeTypeMap[t] = (nodeTypeMap[t] || 0) + 1;
  });

  const entries = Object.entries(nodeTypeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const TYPE_ICONS = {
    internet: "🌐", compute: "🖥️", identity: "👤",
    data: "🗄️", secret: "🔑", vulnerability: "⚠️",
    resource: "📦", runtime: "⚡",
  };

  if (!entries.length) return (
    <div style={{ padding: "12px 16px", fontSize: 11, color: "#555" }}>No resources detected</div>
  );

  return (
    <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
      {entries.map(([type, count]) => (
        <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#aaa", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{TYPE_ICONS[type] || "📦"}</span>
            <span style={{ textTransform: "capitalize" }}>{type}</span>
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "1px 8px", color: "#bbb",
          }}>{count}</span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
        {(graph.nodes || []).length} total nodes · {(graph.edges || []).length} edges
      </div>
    </div>
  );
}

// ── Main Sidebar export ───────────────────────────────────────────────────────
export default function Sidebar({
  findings, compliance, paths, graph,
  selectedFinding, selectedPath,
  onSelectFinding, onSelectPath,
}) {
  const [collapsed, setCollapsed] = useState({ paths: false, findings: false, compliance: false, cloud: false });
  const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const critCount = findings.filter(f => f.severity === "CRITICAL").length;
  const failCount = compliance.filter(c => c.status === "FAIL").length;

  return (
    <div style={{
      width: 280, height: "100%", flexShrink: 0,
      background: "rgba(10,10,16,0.95)",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Top brand bar */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>🦅</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>HAWKEYE</div>
          <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>CNAPP Platform</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {critCount > 0 && (
            <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(255,51,102,0.2)", color: "#ff3366",
              border: "1px solid rgba(255,51,102,0.4)", borderRadius: 10, padding: "2px 7px" }}>
              {critCount} CRIT
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Attack Paths */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={() => toggle("paths")} style={{
            width: "100%", background: "none", border: "none", cursor: "pointer",
            padding: 0, textAlign: "left",
          }}>
            <SectionHeader icon="🔴" title="Attack Paths" count={paths.length} />
          </button>
          {!collapsed.paths && (
            <PathsSection paths={paths} selectedPath={selectedPath} onSelectPath={onSelectPath} />
          )}
        </div>

        {/* Findings */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", flex: 1 }}>
          <button onClick={() => toggle("findings")} style={{
            width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left",
          }}>
            <SectionHeader icon="⚡" title="Findings" count={findings.length} />
          </button>
          {!collapsed.findings && (
            <FindingsSection findings={findings} selectedFinding={selectedFinding} onSelectFinding={onSelectFinding} />
          )}
        </div>

        {/* Compliance */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={() => toggle("compliance")} style={{
            width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left",
          }}>
            <SectionHeader icon="🛡" title="Compliance" count={failCount > 0 ? `${failCount} FAIL` : "✓"} />
          </button>
          {!collapsed.compliance && (
            <ComplianceSection compliance={compliance} />
          )}
        </div>

        {/* Cloud Resources */}
        <div>
          <button onClick={() => toggle("cloud")} style={{
            width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left",
          }}>
            <SectionHeader icon="☁️" title="Cloud Resources" />
          </button>
          {!collapsed.cloud && (
            <CloudSection graph={graph} />
          )}
        </div>
      </div>
    </div>
  );
}
