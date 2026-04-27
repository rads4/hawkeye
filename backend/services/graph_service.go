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
	graphMutex sync.RWMutex
)

// AddNode adds a node to the in-memory graph
func AddNode(node models.Node) {
	graphMutex.Lock()
	defer graphMutex.Unlock()
	Nodes[node.ID] = node
}

// AddEdge adds an edge to the in-memory graph
func AddEdge(edge models.Edge) {
	graphMutex.Lock()
	defer graphMutex.Unlock()
	Edges = append(Edges, edge)
}

// GetGraph returns the in-memory graph
func GetGraph() ([]models.Node, []models.Edge) {
	graphMutex.RLock()
	defer graphMutex.RUnlock()

	nodeList := make([]models.Node, 0, len(Nodes))
	for _, n := range Nodes {
		nodeList = append(nodeList, n)
	}

	return nodeList, Edges
}

// BuildGraphFromAsset creates nodes and edges from an asset
func BuildGraphFromAsset(asset *models.Asset) {
	if asset == nil {
		return
	}

	// Internet node
	internetNode := models.Node{
		ID:    "internet",
		Type:  "internet",
		Label: "Internet",
	}
	AddNode(internetNode)

	// Compute node
	computeID := "compute-" + asset.ID
	AddNode(models.Node{
		ID:    computeID,
		Type:  "compute",
		Label: asset.Name,
	})

	if asset.IsPublic {
		AddEdge(models.Edge{
			Source: internetNode.ID,
			Target: computeID,
			Label:  "EXPOSES",
		})
	}

	// Identity node
	identityID := "identity-" + asset.ID
	if asset.HasAdminRole {
		AddNode(models.Node{
			ID:    identityID,
			Type:  "identity",
			Label: "AdminRole",
		})
		AddEdge(models.Edge{
			Source: computeID,
			Target: identityID,
			Label:  "HAS_ROLE",
		})
	}

	// Data node
	dataID := "data-" + asset.ID
	if asset.IsSensitive {
		AddNode(models.Node{
			ID:    dataID,
			Type:  "data",
			Label: "SensitiveData",
		})

		if asset.HasAdminRole {
			AddEdge(models.Edge{
				Source: identityID,
				Target: dataID,
				Label:  "CAN_ACCESS",
			})
		} else {
			AddEdge(models.Edge{
				Source: computeID,
				Target: dataID,
				Label:  "CAN_ACCESS",
			})
		}
	}

	// Secret Node
	if asset.HasSecret {
		secretID := "secret-" + asset.ID
		AddNode(models.Node{
			ID:    secretID,
			Type:  "secret",
			Label: "ExposedSecret",
		})

		AddEdge(models.Edge{
			Source: computeID,
			Target: secretID,
			Label:  "HAS_SECRET",
		})

		if asset.IsSensitive {
			AddEdge(models.Edge{
				Source: secretID,
				Target: dataID,
				Label:  "CAN_ACCESS",
			})
		}
	}

	// 🔥 NEW: Vulnerability Node
	if asset.HasVulnerability {
		vulnID := "vuln-" + asset.ID
		AddNode(models.Node{
			ID:    vulnID,
			Type:  "vulnerability",
			Label: "ContainerVulnerability",
		})

		AddEdge(models.Edge{
			Source: computeID,
			Target: vulnID,
			Label:  "HAS_VULNERABILITY",
		})
	}

	// Neo4j or fallback
	ctx := context.Background()

	if db.Driver != nil {
		err := db.Driver.VerifyConnectivity(ctx)
		if err == nil {
			log.Println("Using Neo4j graph")
			insertIntoNeo4j(asset)
		} else {
			log.Println("Neo4j not reachable → using in-memory graph fallback")
		}
	} else {
		log.Println("Using in-memory graph fallback")
	}
}

// Runtime linking (UNCHANGED)
func LinkRuntimeEventToGraph(event models.RuntimeEvent) {
	runtimeID := "runtime-" + event.ID
	computeID := "compute-" + event.ContainerID

	AddNode(models.Node{
		ID:    runtimeID,
		Type:  "runtime",
		Label: event.EventType,
	})

	AddEdge(models.Edge{
		Source: computeID,
		Target: runtimeID,
		Label:  "TRIGGERED_EVENT",
	})

	ctx := context.Background()

	if db.Driver != nil {
		err := db.Driver.VerifyConnectivity(ctx)
		if err == nil {
			session := db.Driver.NewSession(ctx, neo4j.SessionConfig{})
			defer session.Close(ctx)

			query := `
				MERGE (c:Compute {id: $computeId})
				MERGE (r:Runtime {id: $runtimeId, type: $type})
				MERGE (c)-[:TRIGGERED_EVENT]->(r)
			`
			_, err := session.Run(ctx, query, map[string]interface{}{
				"computeId": computeID,
				"runtimeId": runtimeID,
				"type":      event.EventType,
			})
			if err != nil {
				log.Printf("Warning: Failed to insert runtime event into Neo4j: %v", err)
			}
		}
	}
}

// Neo4j insert
func insertIntoNeo4j(asset *models.Asset) {
	ctx := context.Background()
	session := db.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	computeID := "compute-" + asset.ID
	identityID := "identity-" + asset.ID
	dataID := "data-" + asset.ID
	secretID := "secret-" + asset.ID
	vulnID := "vuln-" + asset.ID

	_, err := session.Run(ctx, `
		MERGE (i:Internet {id: 'internet'})
		MERGE (c:Compute {id: $computeId, name: $name})
	`, map[string]interface{}{
		"computeId": computeID,
		"name":      asset.Name,
	})

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
		`, map[string]interface{}{
			"computeId":  computeID,
			"identityId": identityID,
		})
	}

	if asset.IsSensitive {
		session.Run(ctx, `
			MATCH (c:Compute {id: $computeId})
			MERGE (d:Data {id: $dataId})
			MERGE (c)-[:CAN_ACCESS]->(d)
		`, map[string]interface{}{
			"computeId": computeID,
			"dataId":    dataID,
		})
	}

	if asset.HasSecret {
		session.Run(ctx, `
			MATCH (c:Compute {id: $computeId})
			MERGE (s:Secret {id: $secretId})
			MERGE (c)-[:HAS_SECRET]->(s)
		`, map[string]interface{}{
			"computeId": computeID,
			"secretId":  secretID,
		})

		if asset.IsSensitive {
			session.Run(ctx, `
				MATCH (s:Secret {id: $secretId})
				MERGE (d:Data {id: $dataId})
				MERGE (s)-[:CAN_ACCESS]->(d)
			`, map[string]interface{}{
				"secretId": secretID,
				"dataId":   dataID,
			})
		}
	}

	// 🔥 NEW: Vulnerability in Neo4j
	if asset.HasVulnerability {
		session.Run(ctx, `
			MATCH (c:Compute {id: $computeId})
			MERGE (v:Vulnerability {id: $vulnId})
			MERGE (c)-[:HAS_VULNERABILITY]->(v)
		`, map[string]interface{}{
			"computeId": computeID,
			"vulnId":    vulnID,
		})
	}

	if err != nil {
		log.Printf("Warning: Neo4j insert error: %v", err)
	}
}