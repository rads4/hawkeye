const { runQuery } = require('../db/neo4j');
const { runAllChecks } = require('./complianceService');

// ─── Risk Scoring ──────────────────────────────────────────────────────────────

function scoreResource(props) {
  let score = 0;
  const reasoning = [];

  if (props.public === true || props.public === 'true') {
    score += 5; reasoning.push('Public exposure (+5)');
  }
  if (props.openFirewall === true || props.openFirewall === 'true') {
    score += 5; reasoning.push('Open firewall 0.0.0.0/0 (+5)');
  }
  if (props.privilegedRole === true || props.privilegedRole === 'true') {
    score += 7; reasoning.push('Privileged IAM role attached (+7)');
  }
  if (props.sensitive === true || props.sensitive === 'true') {
    score += 10; reasoning.push('Access to sensitive data (+10)');
  }

  let severity = 'Low';
  if (score >= 16) severity = 'CRITICAL';
  else if (score >= 11) severity = 'HIGH';
  else if (score >= 6) severity = 'MEDIUM';
  else severity = 'LOW';

  return { score, severity, reasoning };
}

// ─── Attack Path Detection ─────────────────────────────────────────────────────

async function detectAttackPaths() {
  const cypher = `
    MATCH path = (i:Resource {id: 'internet'})
      -[:EXPOSED_TO|CONNECTS_TO*1..3]->(c:Resource {type: 'compute'})
      -[:HAS_ROLE]->(r:Resource {type: 'identity'})
      -[:CAN_ACCESS]->(d:Resource {sensitive: true})
    WITH path, i, c, r, d
    LIMIT 10
    RETURN
      [n IN nodes(path) | n.id] AS nodeIds,
      [n IN nodes(path) | n.name] AS nodeNames,
      [n IN nodes(path) | n.type] AS nodeTypes,
      [n IN nodes(path) | n.cloud] AS nodeClouds,
      [rel IN relationships(path) | type(rel)] AS relTypes,
      c.id AS computeId,
      c.name AS computeName,
      r.id AS roleId,
      r.name AS roleName,
      r.privilegedRole AS isPrivileged,
      d.id AS dataId,
      d.name AS dataName,
      d.cloud AS cloud
  `;

  try {
    const records = await runQuery(cypher);
    return records.map((rec) => ({
      nodeIds: rec.get('nodeIds'),
      nodeNames: rec.get('nodeNames'),
      nodeTypes: rec.get('nodeTypes'),
      nodeClouds: rec.get('nodeClouds'),
      relTypes: rec.get('relTypes'),
      computeId: rec.get('computeId'),
      computeName: rec.get('computeName'),
      roleId: rec.get('roleId'),
      roleName: rec.get('roleName'),
      isPrivileged: rec.get('isPrivileged'),
      dataId: rec.get('dataId'),
      dataName: rec.get('dataName'),
      cloud: rec.get('cloud'),
    }));
  } catch (err) {
    console.error('Attack path query failed:', err.message);
    return [];
  }
}

// ─── Finding Generation ────────────────────────────────────────────────────────

async function generateFindings() {
  const [paths, complianceChecks] = await Promise.all([
    detectAttackPaths(),
    runAllChecks(),
  ]);

  const findings = [];
  const seen = new Set();

  for (const path of paths) {
    const key = `${path.computeId}-${path.roleId}-${path.dataId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const cloud = path.cloud || 'aws';
    const isPrivileged = path.isPrivileged === true || path.isPrivileged === 'true';

    // Score this finding
    const { score, severity, reasoning } = scoreResource({
      public: true,
      openFirewall: true,
      privilegedRole: isPrivileged,
      sensitive: true,
    });

    const attackPathSummary = path.nodeNames.join(' → ');
    const blastRadius = path.nodeIds.length;

    // Map compliance violations
    const relevantChecks = complianceChecks
      .filter((c) => c.status === 'fail')
      .filter((c) => ['CIS-1', 'CIS-2', 'CIS-3', 'CIS-4'].includes(c.id))
      .map((c) => ({ id: c.id, title: c.title, status: c.status }));

    const finding = {
      id: `finding-${findings.length + 1}-${cloud}`,
      title: `Public Compute → Privileged Role → Sensitive Data (${cloud.toUpperCase()})`,
      severity,
      summary: `${path.computeName} is publicly exposed and carries role '${path.roleName}', which grants access to sensitive data store '${path.dataName}'.`,
      whyItMatters: `An attacker with internet access could compromise the compute instance, then abuse the attached ${isPrivileged ? 'privileged' : ''} role to exfiltrate data from '${path.dataName}'. This is a complete, 3-hop attack chain.`,
      fixSteps: [
        'Remove public IP from the compute instance or restrict security group to known IPs',
        `Replace '${path.roleName}' with a least-privilege role scoped to only required actions`,
        `Enable access logging and encryption-at-rest on '${path.dataName}'`,
        'Implement VPC endpoint for internal service-to-storage communication',
      ],
      attackPathSummary,
      blastRadius,
      riskScore: score,
      provider: cloud,
      affectedResources: path.nodeIds,
      tags: [cloud.toUpperCase(), 'IAM', 'Network', 'DataExposure'],
      compliance: relevantChecks,
      reasoning,
      pathNodeIds: path.nodeIds,
    };

    findings.push(finding);
  }

  // If no real paths yet, return empty (frontend handles gracefully)
  return findings;
}

// ─── Get attack path graph for a specific finding ──────────────────────────────

async function getAttackPathForFinding(findingId) {
  // Query all attack-path-marked nodes and edges
  const nodeRecords = await runQuery(
    'MATCH (n:Resource) WHERE n.attack_path = true RETURN n'
  );
  const edgeRecords = await runQuery(`
    MATCH (a:Resource)-[r]->(b:Resource)
    WHERE a.attack_path = true AND b.attack_path = true AND r.isAttackPath = true
    RETURN a.id AS src, b.id AS tgt, type(r) AS rel
  `);

  const nodes = nodeRecords.map((rec) => {
    const n = rec.get('n').properties;
    return {
      id: n.id,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        label: n.name,
        type: capitalizeFirst(n.type),
        icon: iconForType(n.type),
        description: n.description || '',
        cloud: n.cloud,
        attackPath: true,
      },
    };
  });

  const edges = edgeRecords.map((rec, idx) => ({
    id: `ap-e-${idx}`,
    source: rec.get('src'),
    target: rec.get('tgt'),
    isAttackPath: true,
    label: rec.get('rel').replace(/_/g, ' ').toLowerCase(),
  }));

  return { nodes, edges };
}

function capitalizeFirst(s) {
  if (!s) return 'Unknown';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function iconForType(type) {
  const icons = { network: 'Network', compute: 'Server', identity: 'User', data: 'Database' };
  return icons[type] || 'Box';
}

module.exports = { detectAttackPaths, generateFindings, scoreResource, getAttackPathForFinding };
