const express = require('express');
const router = express.Router();
const { ingestAWS } = require('../services/awsService');
const { ingestGCP } = require('../services/gcpService');
const { generateFindings } = require('../services/analysisService');
const { getNodeCount } = require('../services/graphService');

// POST /api/connect/aws
router.post('/aws', async (req, res) => {
  const { roleArn, externalId } = req.body;
  if (!roleArn || !externalId) {
    return res.status(400).json({ success: false, error: 'Missing roleArn or externalId' });
  }

  try {
    const ingestion = await ingestAWS({ roleArn, externalId });
    const findings = await generateFindings();
    const nodeCount = await getNodeCount();

    res.json({
      success: true,
      source: ingestion.source,
      message: ingestion.source === 'live'
        ? `AWS account connected. Ingested ${ingestion.resourceCount} resources.`
        : `Demo data loaded (credentials unavailable). ${nodeCount} resources in graph.`,
      resourceCount: nodeCount,
      findingsCount: findings.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/connect/gcp
router.post('/gcp', async (req, res) => {
  const { fileContent } = req.body;
  if (!fileContent) {
    return res.status(400).json({ success: false, error: 'Missing service account JSON' });
  }

  try {
    const ingestion = await ingestGCP({ serviceAccountJson: fileContent });
    const findings = await generateFindings();
    const nodeCount = await getNodeCount();

    res.json({
      success: true,
      source: ingestion.source,
      message: ingestion.source === 'live'
        ? `GCP account connected. Ingested ${ingestion.resourceCount} resources.`
        : `Demo data loaded (credentials unavailable). ${nodeCount} resources in graph.`,
      resourceCount: nodeCount,
      findingsCount: findings.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
