const express = require('express');
const router = express.Router();
const { getFullGraph } = require('../services/graphService');
const { getAttackPathForFinding } = require('../services/analysisService');

// GET /api/graph — full graph for React Flow
router.get('/', async (req, res) => {
  try {
    const graph = await getFullGraph();
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/graph/:findingId — subgraph for a specific finding (attack path nodes only)
router.get('/:findingId', async (req, res) => {
  try {
    const graph = await getAttackPathForFinding(req.params.findingId);
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
