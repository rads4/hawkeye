const express = require('express');
const router = express.Router();
const { generateFindings } = require('../services/analysisService');

// GET /api/findings
router.get('/', async (req, res) => {
  try {
    const findings = await generateFindings();
    res.json(findings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
