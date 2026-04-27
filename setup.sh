#!/usr/bin/env bash
# Hawkeye local setup script
# Run: chmod +x setup.sh && ./setup.sh

set -e

echo "🦅 Setting up Hawkeye Cloud Security Platform..."

# 1. Start Neo4j if not already running
if docker ps --filter "name=hawkeye-neo4j" --format '{{.Names}}' | grep -q hawkeye-neo4j; then
  echo "✅ Neo4j already running"
else
  echo "🐳 Starting Neo4j Docker container..."
  docker run -d \
    --name hawkeye-neo4j \
    -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/password \
    neo4j:5
  echo "⏳ Waiting for Neo4j to be ready..."
  sleep 15
fi

# 2. Backend
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# 3. Frontend
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "👉 Start the backend:   cd backend && npm start"
echo "👉 Start the frontend:  cd frontend && npm run dev"
echo ""
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo "   Neo4j:    http://localhost:7474  (neo4j / password)"
