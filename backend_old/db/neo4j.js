const neo4j = require('neo4j-driver');

let driver = null;

function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

async function verifyConnectivity() {
  try {
    await getDriver().verifyConnectivity();
    console.log('✅ Neo4j connected at', process.env.NEO4J_URI);
    return true;
  } catch (err) {
    console.error('❌ Neo4j connection failed:', err.message);
    return false;
  }
}

async function runQuery(cypher, params = {}) {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

async function close() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

module.exports = { runQuery, verifyConnectivity, close };
