const express = require('express');
const router = express.Router();
const { detectAttackPaths, generateFindings } = require('../services/analysisService');
const { runQuery } = require('../db/neo4j');

// GET /api/attack-paths — all detected attack paths as raw path objects
router.get('/', async (req, res) => {
  try {
    const paths = await detectAttackPaths();
    res.json(paths);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attack-paths/:findingId
// Returns the React Flow nodes/edges that belong to this finding's path, for highlighting
router.get('/:findingId', async (req, res) => {
  try {
    // Get the finding to extract pathNodeIds
    const findings = await generateFindings();
    const finding = findings.find((f) => f.id === req.params.findingId);

    if (!finding) {
      return res.json({ nodeIds: [], edgeIds: [] });
    }

    const pathNodeIds = finding.pathNodeIds || [];

    // Also get the attack-path edge ids from Neo4j
    const edgeRecords = await runQuery(`
      MATCH (a:Resource)-[r]->(b:Resource)
      WHERE a.id IN $ids AND b.id IN $ids AND r.isAttackPath = true
      RETURN a.id AS src, b.id AS tgt
    `, { ids: pathNodeIds });

    const highlightedEdgeKeys = edgeRecords.map(
      (rec) => `${rec.get('src')}-${rec.get('tgt')}`
    );

    res.json({ nodeIds: pathNodeIds, edgeKeys: highlightedEdgeKeys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
