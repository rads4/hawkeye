package services

import (
	"context"
	"hawkeye-backend/db"
	"hawkeye-backend/models"
	"log"
	"sync"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var (
	Nodes      = make(map[string]models.Node)
	Edges      = make([]models.Edge, 0)
	edgeSet    = make(map[string]bool) // deduplication key: "source→target→label"
	graphMutex sync.RWMutex
)

// AddNode upserts a node into the in-memory graph (safe to call multiple times)
func AddNode(node models.Node) {
	graphMutex.Lock()
	defer graphMutex.Unlock()
	Nodes[node.ID] = node
}

// AddEdge appends an edge only if it does not already exist (deduplicates)
func AddEdge(edge models.Edge) {
	key := edge.Source + "→" + edge.Target + "→" + edge.Label
	graphMutex.Lock()
	defer graphMutex.Unlock()
	if edgeSet[key] {
		return
	}
	edgeSet[key] = true
	Edges = append(Edges, edge)
}

// GetGraph returns the current in-memory graph snapshot
func GetGraph() ([]models.Node, []models.Edge) {
	graphMutex.RLock()
	defer graphMutex.RUnlock()

	nodeList := make([]models.Node, 0, len(Nodes))
	for _, n := range Nodes {
		nodeList = append(nodeList, n)
	}
	return nodeList, Edges
}

// BuildGraphFromAsset maps an asset into graph nodes and edges.
// It is safe to call multiple times for the same asset – nodes are upserted
// and edges are deduplicated, so repeated calls only add new topology.
func BuildGraphFromAsset(asset *models.Asset) {
	if asset == nil {
		return
	}

	computeID  := "compute-"  + asset.ID
	identityID := "identity-" + asset.ID
	dataID     := "data-"     + asset.ID
	secretID   := "secret-"   + asset.ID
	vulnID     := "vuln-"     + asset.ID

	// ── Internet ───────────────────────────────────────────────────────────
	AddNode(models.Node{ID: "internet", Type: "internet", Label: "Internet"})

	// ── Compute ────────────────────────────────────────────────────────────
	AddNode(models.Node{ID: computeID, Type: "compute", Label: asset.Name})

	if asset.IsPublic {
		AddEdge(models.Edge{Source: "internet", Target: computeID, Label: "EXPOSES"})
	}

	// ── Identity ───────────────────────────────────────────────────────────
	if asset.HasAdminRole {
		AddNode(models.Node{ID: identityID, Type: "identity", Label: "AdminRole"})
		AddEdge(models.Edge{Source: computeID, Target: identityID, Label: "HAS_ROLE"})
	}

	// ── Data ───────────────────────────────────────────────────────────────
	if asset.IsSensitive {
		AddNode(models.Node{ID: dataID, Type: "data", Label: "SensitiveData"})
		if asset.HasAdminRole {
			AddEdge(models.Edge{Source: identityID, Target: dataID, Label: "CAN_ACCESS"})
		} else {
			AddEdge(models.Edge{Source: computeID, Target: dataID, Label: "CAN_ACCESS"})
		}
	}

	// ── Secret ─────────────────────────────────────────────────────────────
	if asset.HasSecret {
		AddNode(models.Node{ID: secretID, Type: "secret", Label: "ExposedSecret"})
		AddEdge(models.Edge{Source: computeID, Target: secretID, Label: "HAS_SECRET"})
		if asset.IsSensitive {
			AddEdge(models.Edge{Source: secretID, Target: dataID, Label: "CAN_ACCESS"})
		}
	}

	// ── Vulnerability ──────────────────────────────────────────────────────
	if asset.HasVulnerability {
		AddNode(models.Node{ID: vulnID, Type: "vulnerability", Label: "ContainerVulnerability"})
		AddEdge(models.Edge{Source: computeID, Target: vulnID, Label: "HAS_VULNERABILITY"})
		if asset.IsSensitive {
			AddEdge(models.Edge{Source: vulnID, Target: dataID, Label: "CAN_EXPLOIT"})
		}
	}

	// ── Persist to Neo4j (or stay in-memory if unavailable) ────────────────
	ctx := context.Background()
	if db.Driver != nil {
		if err := db.Driver.VerifyConnectivity(ctx); err == nil {
			log.Println("Using Neo4j graph")
			insertIntoNeo4j(asset)
		} else {
			log.Println("Neo4j not reachable → using in-memory graph fallback")
		}
	} else {
		log.Println("Using in-memory graph fallback")
	}
}

// LinkRuntimeEventToGraph adds a runtime event node linked to its compute node
func LinkRuntimeEventToGraph(event models.RuntimeEvent) {
	runtimeID := "runtime-" + event.ID
	computeID := "compute-" + event.ContainerID

	AddNode(models.Node{ID: runtimeID, Type: "runtime", Label: event.EventType})
	AddEdge(models.Edge{Source: computeID, Target: runtimeID, Label: "TRIGGERED_EVENT"})

	ctx := context.Background()
	if db.Driver == nil {
		return
	}
	if err := db.Driver.VerifyConnectivity(ctx); err != nil {
		return
	}

	session := db.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	_, err := session.Run(ctx, `
		MERGE (c:Compute {id: $computeId})
		MERGE (r:Runtime {id: $runtimeId, type: $type})
		MERGE (c)-[:TRIGGERED_EVENT]->(r)
	`, map[string]interface{}{
		"computeId": computeID,
		"runtimeId": runtimeID,
		"type":      event.EventType,
	})
	if err != nil {
		log.Printf("Warning: Failed to insert runtime event into Neo4j: %v", err)
	}
}

// insertIntoNeo4j writes the full asset topology to Neo4j using MERGE (idempotent)
func insertIntoNeo4j(asset *models.Asset) {
	ctx := context.Background()
	session := db.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	computeID  := "compute-"  + asset.ID
	identityID := "identity-" + asset.ID
	dataID     := "data-"     + asset.ID
	secretID   := "secret-"   + asset.ID
	vulnID     := "vuln-"     + asset.ID

	// Base: Internet + Compute
	_, err := session.Run(ctx, `
		MERGE (i:Internet {id: 'internet'})
		MERGE (c:Compute {id: $computeId, name: $name})
	`, map[string]interface{}{"computeId": computeID, "name": asset.Name})

	if asset.IsPublic {
		session.Run(ctx, `
			MATCH (i:Internet {id: 'internet'})
			MATCH (c:Compute {id: $computeId})
			MERGE (i)-[:EXPOSES]->(c)
		`, map[string]interface{}{"computeId": computeID})
	}

	if asset.HasAdminRole {
		session.Run(ctx, `
			MATCH (c:Compute {id: $computeId})
			MERGE (id:Identity {id: $identityId})
			MERGE (c)-[:HAS_ROLE]->(id)
		`, map[string]interface{}{"computeId": computeID, "identityId": identityID})
	}

	if asset.IsSensitive {
		if asset.HasAdminRole {
			session.Run(ctx, `
				MATCH (id:Identity {id: $identityId})
				MERGE (d:Data {id: $dataId})
				MERGE (id)-[:CAN_ACCESS]->(d)
			`, map[string]interface{}{"identityId": identityID, "dataId": dataID})
		} else {
			session.Run(ctx, `
				MATCH (c:Compute {id: $computeId})
				MERGE (d:Data {id: $dataId})
				MERGE (c)-[:CAN_ACCESS]->(d)
			`, map[string]interface{}{"computeId": computeID, "dataId": dataID})
		}
	}

	if asset.HasSecret {
		session.Run(ctx, `
			MATCH (c:Compute {id: $computeId})
			MERGE (s:Secret {id: $secretId})
			MERGE (c)-[:HAS_SECRET]->(s)
		`, map[string]interface{}{"computeId": computeID, "secretId": secretID})

		if asset.IsSensitive {
			session.Run(ctx, `
				MATCH (s:Secret {id: $secretId})
				MERGE (d:Data {id: $dataId})
				MERGE (s)-[:CAN_ACCESS]->(d)
			`, map[string]interface{}{"secretId": secretID, "dataId": dataID})
		}
	}

	// Vulnerability node – this is why vuln was missing: the block is now
	// always evaluated within the same session as the rest of the asset topology
	if asset.HasVulnerability {
		session.Run(ctx, `
			MATCH (c:Compute {id: $computeId})
			MERGE (v:Vulnerability {id: $vulnId})
			MERGE (c)-[:HAS_VULNERABILITY]->(v)
		`, map[string]interface{}{"computeId": computeID, "vulnId": vulnID})

		if asset.IsSensitive {
			session.Run(ctx, `
				MATCH (v:Vulnerability {id: $vulnId})
				MERGE (d:Data {id: $dataId})
				MERGE (v)-[:CAN_EXPLOIT]->(d)
			`, map[string]interface{}{"vulnId": vulnID, "dataId": dataID})
		}
	}

	if err != nil {
		log.Printf("Warning: Neo4j insert error: %v", err)
	}
}