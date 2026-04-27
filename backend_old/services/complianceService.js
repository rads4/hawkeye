// CIS-style compliance checks against the Neo4j graph

const { runQuery } = require('../db/neo4j');

const CIS_CHECKS = [
  {
    id: 'CIS-1',
    title: 'No public access to compute resources',
    description: 'Compute instances should not be directly reachable from the public internet without firewall controls.',
    query: `
      MATCH (internet:Resource {id: 'internet'})
      -[:EXPOSED_TO|CONNECTS_TO*1..2]->(c:Resource {type: 'compute'})
      RETURN c.id AS id, c.name AS name, c.cloud AS cloud
    `,
    failMessage: (row) => `${row.cloud?.toUpperCase()} compute resource '${row.name}' is publicly reachable from the Internet`,
  },
  {
    id: 'CIS-2',
    title: 'IAM least privilege — no wildcard/admin roles on public compute',
    description: 'Privileged IAM roles should not be attached to internet-exposed compute instances.',
    query: `
      MATCH (internet:Resource {id: 'internet'})
      -[:EXPOSED_TO|CONNECTS_TO*1..2]->(c:Resource {type: 'compute'})
      -[:HAS_ROLE]->(r:Resource {type: 'identity'})
      WHERE r.privilegedRole = true
      RETURN r.id AS id, r.name AS name, r.cloud AS cloud, c.name AS computeName
    `,
    failMessage: (row) => `Privileged role '${row.name}' is attached to internet-reachable compute '${row.computeName}'`,
  },
  {
    id: 'CIS-3',
    title: 'Sensitive data not accessible from privileged public compute',
    description: 'Sensitive data stores should not be accessible via roles attached to internet-exposed compute.',
    query: `
      MATCH (internet:Resource {id: 'internet'})
      -[:EXPOSED_TO|CONNECTS_TO*1..2]->(c:Resource {type: 'compute'})
      -[:HAS_ROLE]->(r:Resource {type: 'identity'})
      -[:CAN_ACCESS]->(d:Resource {sensitive: true})
      RETURN d.id AS id, d.name AS name, d.cloud AS cloud
    `,
    failMessage: (row) => `Sensitive data store '${row.name}' is transitively accessible from the Internet`,
  },
  {
    id: 'CIS-4',
    title: 'No open firewall rules (0.0.0.0/0)',
    description: 'Security groups and firewall rules should not allow unrestricted inbound traffic.',
    query: `
      MATCH (n:Resource)
      WHERE n.openFirewall = true
      RETURN n.id AS id, n.name AS name, n.cloud AS cloud
    `,
    failMessage: (row) => `${row.cloud?.toUpperCase()} firewall/security group '${row.name}' allows unrestricted 0.0.0.0/0 ingress`,
  },
];

async function runAllChecks() {
  const results = [];
  for (const check of CIS_CHECKS) {
    try {
      const records = await runQuery(check.query);
      const violations = records.map((r) => {
        const row = {};
        r.keys.forEach((k) => { row[k] = r.get(k); });
        return row;
      });

      results.push({
        id: check.id,
        title: check.title,
        description: check.description,
        status: violations.length === 0 ? 'pass' : 'fail',
        violations: violations.map((v) => ({
          resourceId: v.id,
          message: check.failMessage(v),
        })),
      });
    } catch (err) {
      results.push({
        id: check.id,
        title: check.title,
        description: check.description,
        status: 'error',
        violations: [],
        error: err.message,
      });
    }
  }
  return results;
}

function mapFindingToCompliance(findingType) {
  const mapping = {
    'public-compute': ['CIS-1', 'CIS-4'],
    'privileged-role': ['CIS-2'],
    'sensitive-data-exposure': ['CIS-3'],
  };
  return mapping[findingType] || [];
}

module.exports = { runAllChecks, mapFindingToCompliance, CIS_CHECKS };
