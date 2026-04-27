const { runQuery } = require('../db/neo4j');

// ─── Upsert helpers ────────────────────────────────────────────────────────────

async function upsertResource(props) {
  const cypher = `
    MERGE (r:Resource {id: $id})
    SET r += $props,
        r.last_seen = datetime(),
        r.first_seen = CASE WHEN r.first_seen IS NULL THEN datetime() ELSE r.first_seen END
    RETURN r
  `;
  await runQuery(cypher, { id: props.id, props });
}

async function upsertRelationship(fromId, relType, toId, props = {}) {
  const cypher = `
    MATCH (a:Resource {id: $fromId})
    MATCH (b:Resource {id: $toId})
    MERGE (a)-[r:\`${relType}\`]->(b)
    SET r += $props
    RETURN r
  `;
  await runQuery(cypher, { fromId, toId, props });
}

async function ensureInternetNode() {
  await upsertResource({
    id: 'internet',
    name: 'Internet',
    type: 'network',
    cloud: 'global',
    public: true,
    sensitive: false,
    icon: 'Globe',
    description: 'Public Internet',
  });
}

async function clearGraph() {
  await runQuery('MATCH (n:Resource) DETACH DELETE n');
}

async function getNodeCount() {
  const records = await runQuery('MATCH (n:Resource) RETURN count(n) AS cnt');
  return records[0]?.get('cnt').toNumber() ?? 0;
}

// ─── Full graph for React Flow ─────────────────────────────────────────────────

async function getFullGraph() {
  const nodeRecords = await runQuery('MATCH (n:Resource) RETURN n');
  const edgeRecords = await runQuery(
    'MATCH (a:Resource)-[r]->(b:Resource) RETURN a.id AS src, b.id AS tgt, type(r) AS rel, r.isAttackPath AS isAttackPath'
  );

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
        public: n.public,
        sensitive: n.sensitive,
        attackPath: n.attack_path === true || n.attack_path === 'true',
        lastSeen: n.last_seen?.toString() || null,
      },
    };
  });

  const edges = edgeRecords.map((rec, idx) => {
    const isPath = rec.get('isAttackPath') === true || rec.get('isAttackPath') === 'true';
    return {
      id: `e-${idx}-${rec.get('src')}-${rec.get('tgt')}`,
      source: rec.get('src'),
      target: rec.get('tgt'),
      label: relLabel(rec.get('rel')),
      isAttackPath: isPath,
    };
  });

  return { nodes, edges };
}

// ─── Demo seed data ────────────────────────────────────────────────────────────
// Rich multi-cloud graph representing a realistic compromised environment

async function seedDemoData() {
  console.log('🌱 Seeding Neo4j with demo cloud environment...');
  await clearGraph();
  await ensureInternetNode();

  const resources = [
    // AWS
    { id: 'aws-sg-public', name: 'allow-all-sg', type: 'network', cloud: 'aws', public: true, sensitive: false, openFirewall: true, icon: 'ShieldAlert', description: 'Security group with 0.0.0.0/0 ingress on all ports' },
    { id: 'aws-ec2-web', name: 'web-server-prod', type: 'compute', cloud: 'aws', public: true, sensitive: false, icon: 'Server', description: 'Public-facing EC2 web server in us-east-1' },
    { id: 'aws-ec2-internal', name: 'app-server-internal', type: 'compute', cloud: 'aws', public: false, sensitive: false, icon: 'Server', description: 'Internal application server' },
    { id: 'aws-iam-admin', name: 'AdminRole', type: 'identity', cloud: 'aws', public: false, sensitive: false, privilegedRole: true, icon: 'User', description: 'IAM role with AdministratorAccess policy (*:*)' },
    { id: 'aws-iam-readonly', name: 'ReadOnlyRole', type: 'identity', cloud: 'aws', public: false, sensitive: false, icon: 'User', description: 'IAM role with read-only S3 access' },
    { id: 'aws-s3-sensitive', name: 'prod-customer-data', type: 'data', cloud: 'aws', public: false, sensitive: true, icon: 'Database', description: 'S3 bucket containing PII customer records' },
    { id: 'aws-s3-logs', name: 'application-logs', type: 'data', cloud: 'aws', public: false, sensitive: false, icon: 'Database', description: 'S3 bucket containing application access logs' },
    { id: 'aws-vpc-prod', name: 'vpc-prod', type: 'network', cloud: 'aws', public: false, sensitive: false, icon: 'Network', description: 'Production VPC in us-east-1' },
    // GCP
    { id: 'gcp-fw-open', name: 'allow-ingress-all', type: 'network', cloud: 'gcp', public: true, sensitive: false, openFirewall: true, icon: 'ShieldAlert', description: 'GCP firewall rule allowing 0.0.0.0/0 on all ports' },
    { id: 'gcp-vm-web', name: 'gke-node-pool-01', type: 'compute', cloud: 'gcp', public: true, sensitive: false, icon: 'Server', description: 'GKE node pool VM with external IP' },
    { id: 'gcp-sa-editor', name: 'project-editor-sa', type: 'identity', cloud: 'gcp', public: false, sensitive: false, privilegedRole: true, icon: 'User', description: 'GCP service account with Editor role' },
    { id: 'gcp-storage-pii', name: 'customer-pii-bucket', type: 'data', cloud: 'gcp', public: false, sensitive: true, icon: 'Database', description: 'GCS bucket containing sensitive PII' },
    { id: 'gcp-subnet-default', name: 'default-subnet', type: 'network', cloud: 'gcp', public: false, sensitive: false, icon: 'Network', description: 'Default VPC subnet' },
  ];

  for (const r of resources) {
    await upsertResource(r);
  }

  const relationships = [
    // AWS attack path 1: Internet → SG → Web EC2 → Admin Role → S3 PII
    ['internet', 'EXPOSED_TO', 'aws-sg-public', { isAttackPath: true }],
    ['aws-sg-public', 'CONNECTS_TO', 'aws-ec2-web', { isAttackPath: true }],
    ['aws-ec2-web', 'HAS_ROLE', 'aws-iam-admin', { isAttackPath: true }],
    ['aws-iam-admin', 'CAN_ACCESS', 'aws-s3-sensitive', { isAttackPath: true }],
    // AWS supporting edges
    ['aws-vpc-prod', 'CONNECTS_TO', 'aws-ec2-web', { isAttackPath: false }],
    ['aws-vpc-prod', 'CONNECTS_TO', 'aws-ec2-internal', { isAttackPath: false }],
    ['aws-ec2-internal', 'HAS_ROLE', 'aws-iam-readonly', { isAttackPath: false }],
    ['aws-iam-admin', 'CAN_ACCESS', 'aws-s3-logs', { isAttackPath: false }],
    ['aws-iam-readonly', 'CAN_ACCESS', 'aws-s3-logs', { isAttackPath: false }],
    // GCP attack path 2: Internet → Firewall → GKE VM → Editor SA → GCS PII
    ['internet', 'EXPOSED_TO', 'gcp-fw-open', { isAttackPath: true }],
    ['gcp-fw-open', 'CONNECTS_TO', 'gcp-vm-web', { isAttackPath: true }],
    ['gcp-vm-web', 'HAS_ROLE', 'gcp-sa-editor', { isAttackPath: true }],
    ['gcp-sa-editor', 'CAN_ACCESS', 'gcp-storage-pii', { isAttackPath: true }],
    // GCP supporting edges
    ['gcp-subnet-default', 'CONNECTS_TO', 'gcp-vm-web', { isAttackPath: false }],
  ];

  for (const [from, rel, to, props] of relationships) {
    await upsertRelationship(from, rel, to, props);
  }

  // Mark attack path nodes
  await runQuery(`
    MATCH (n:Resource) WHERE n.id IN $ids
    SET n.attack_path = true
  `, { ids: ['aws-ec2-web', 'aws-sg-public', 'aws-iam-admin', 'aws-s3-sensitive', 'gcp-fw-open', 'gcp-vm-web', 'gcp-sa-editor', 'gcp-storage-pii', 'internet'] });

  console.log(`✅ Seeded ${resources.length} resources and ${relationships.length} relationships`);
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function capitalizeFirst(s) {
  if (!s) return 'Unknown';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function iconForType(type) {
  const icons = { network: 'Network', compute: 'Server', identity: 'User', data: 'Database' };
  return icons[type] || 'Box';
}

function relLabel(rel) {
  return rel?.replace(/_/g, ' ').toLowerCase() || '';
}

module.exports = {
  upsertResource,
  upsertRelationship,
  ensureInternetNode,
  clearGraph,
  getNodeCount,
  getFullGraph,
  seedDemoData,
};
