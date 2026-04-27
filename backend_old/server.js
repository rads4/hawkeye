require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { verifyConnectivity, close } = require('./db/neo4j');
const { getNodeCount, seedDemoData } = require('./services/graphService');
const { generateFindings } = require('./services/analysisService');

const connectRoutes = require('./routes/connect');
const graphRoutes = require('./routes/graph');
const findingsRoutes = require('./routes/findings');
const attackPathRoutes = require('./routes/attackPaths');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/connect', connectRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/findings', findingsRoutes);
app.use('/api/attack-paths', attackPathRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Last scan time — updated by periodic refresh
let lastScanTime = null;
app.get('/api/status', (req, res) => res.json({ lastScanTime, status: 'connected' }));

// ─── Startup sequence ──────────────────────────────────────────────────────────
async function waitForNeo4j(maxRetries = 12, delayMs = 3000) {
  for (let i = 1; i <= maxRetries; i++) {
    const ok = await verifyConnectivity();
    if (ok) return true;
    if (i < maxRetries) {
      console.log(`⏳ Neo4j not ready yet, retrying in ${delayMs / 1000}s... (${i}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

async function startup() {
  console.log('🦅 Hawkeye starting...');

  const neo4jOk = await waitForNeo4j();
  if (!neo4jOk) {
    console.error('❌ Cannot connect to Neo4j after multiple retries. Run:');
    console.error('   docker run -d --name hawkeye-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:5');
    process.exit(1);
  }

  // Seed demo data if graph is empty
  const nodeCount = await getNodeCount();
  if (nodeCount === 0) {
    console.log('📊 Graph is empty — seeding demo data...');
    await seedDemoData();
  } else {
    console.log(`📊 Graph already has ${nodeCount} nodes — skipping seed`);
  }

  lastScanTime = new Date().toISOString();

  // Start server
  app.listen(port, () => {
    console.log(`✅ Hawkeye backend running at http://localhost:${port}`);
    console.log(`   Neo4j browser: http://localhost:7474`);
  });

  // ─── Periodic refresh (~45s) ────────────────────────────────────────────────
  setInterval(async () => {
    try {
      console.log('🔄 Running periodic analysis refresh...');
      // Simulate a small change: randomly toggle a risk property
      const { runQuery } = require('./db/neo4j');
      await runQuery(`
        MATCH (n:Resource {id: 'aws-ec2-web'})
        SET n.last_seen = datetime()
      `);
      await generateFindings(); // re-run analysis (warm up cache if any)
      lastScanTime = new Date().toISOString();
      console.log(`✅ Refresh complete at ${lastScanTime}`);
    } catch (err) {
      console.error('Refresh error:', err.message);
    }
  }, 45000);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await close();
  process.exit(0);
});

startup();
