package services

import (
	"context"
	"hawkeye-backend/db"
	"hawkeye-backend/models"
	"log"
	"strings"
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

	computeID := asset.ID
	identityID := asset.Tags["iam_role"]
	if identityID == "" {
		identityID = "iam-role-default"
	}
	dataID := "s3-sensitive-bucket"
	vulnID := "vuln-" + strings.TrimPrefix(asset.ID, "ecs-task-")

	// ── Internet ─────────────────────────
	AddNode(models.Node{
		ID:    "internet",
		Type:  "network",
		Label: "internet",
	})

	// ── Compute ─────────────────────────
	AddNode(models.Node{
		ID:    computeID,
		Type:  "compute",
		Label: computeID,
	})

	AddEdge(models.Edge{
		Source: "internet",
		Target: computeID,
		Label:  "EXPOSES",
	})

	// ── Track current path node ─────────
	current := computeID

	// ── Vulnerability ───────────────────
	if asset.HasVulnerability {
		AddNode(models.Node{
			ID:    vulnID,
			Type:  "vulnerability",
			Label: "vulnerability",
		})

		AddEdge(models.Edge{
			Source: current,
			Target: vulnID,
			Label:  "HAS_VULNERABILITY",
		})

		current = vulnID
	}

	// ── Identity ────────────────────────
	if asset.HasAdminRole {
		AddNode(models.Node{
			ID:    identityID,
			Type:  "identity",
			Label: identityID,
		})

		AddEdge(models.Edge{
			Source: current,
			Target: identityID,
			Label:  "ESCALATES_TO",
		})

		current = identityID
	}

	// ── Data ───────────────────────────
	if asset.IsSensitive {
		AddNode(models.Node{
			ID:    dataID,
			Type:  "data",
			Label: "s3-sensitive",
		})

		AddEdge(models.Edge{
			Source: current,
			Target: dataID,
			Label:  "CAN_ACCESS",
		})
	}

	// ── Neo4j sync ─────────────────────
	ctx := context.Background()
	if db.Driver != nil {
		if err := db.Driver.VerifyConnectivity(ctx); err == nil {
			insertIntoNeo4j(asset)
		}
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

// insertIntoNeo4j writes the full asset topology to Neo4j using a strict linear path
func insertIntoNeo4j(asset *models.Asset) {
	ctx := context.Background()
	session := db.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	computeID := asset.ID
	identityID := asset.Tags["iam_role"]
	if identityID == "" {
		identityID = "iam-role-default"
	}
	dataID := "s3-sensitive-bucket"
	vulnID := "vuln-" + strings.TrimPrefix(asset.ID, "ecs-task-")

	// 1. Create nodes
	_, _ = session.Run(ctx, `
		MERGE (i:Internet {id: 'internet', label: 'internet', type: 'network'})
		MERGE (c:Compute {id: $computeId, label: $computeId, type: 'compute'})
	`, map[string]interface{}{"computeId": computeID})

	// 2. Internet -> Compute
	_, _ = session.Run(ctx, `
		MATCH (i:Internet {id: 'internet'})
		MATCH (c:Compute {id: $computeId})
		MERGE (i)-[:EXPOSES]->(c)
	`, map[string]interface{}{"computeId": computeID})

	currentID := computeID
	currentLabel := "Compute"

	// 3. Compute -> Vulnerability
	if asset.HasVulnerability {
		_, _ = session.Run(ctx, `
			MATCH (prev:`+currentLabel+` {id: $prevId})
			MERGE (v:Vulnerability {id: $vulnId, label: 'vulnerability', type: 'vulnerability'})
			MERGE (prev)-[:HAS_VULNERABILITY]->(v)
		`, map[string]interface{}{"prevId": currentID, "vulnId": vulnID})
		currentID = vulnID
		currentLabel = "Vulnerability"
	}

	// 4. ... -> Identity
	if asset.HasAdminRole {
		_, _ = session.Run(ctx, `
			MATCH (prev:`+currentLabel+` {id: $prevId})
			MERGE (id:Identity {id: $identityId, label: $identityId, type: 'identity'})
			MERGE (prev)-[:ESCALATES_TO]->(id)
		`, map[string]interface{}{"prevId": currentID, "identityId": identityID})
		currentID = identityID
		currentLabel = "Identity"
	}

	// 5. ... -> Data
	if asset.IsSensitive {
		_, _ = session.Run(ctx, `
			MATCH (prev:`+currentLabel+` {id: $prevId})
			MERGE (d:Data {id: $dataId, label: 's3-sensitive', type: 'data'})
			MERGE (prev)-[:CAN_ACCESS]->(d)
		`, map[string]interface{}{"prevId": currentID, "dataId": dataID})
	}
}

func ResetGraph() {
	graphMutex.Lock()
	defer graphMutex.Unlock()

	// 1. Clear in-memory graph
	Nodes = make(map[string]models.Node)
	Edges = make([]models.Edge, 0)
	edgeSet = make(map[string]bool)

	// 2. Clear Neo4j
	ctx := context.Background()
	if db.Driver != nil {
		session := db.Driver.NewSession(ctx, neo4j.SessionConfig{})
		defer session.Close(ctx)
		_, _ = session.Run(ctx, "MATCH (n) DETACH DELETE n", nil)
	}

	log.Println("[graph] in-memory and Neo4j graph cleared")
}
