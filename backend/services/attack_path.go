package services

import (
	"context"
	"hawkeye-backend/db"
	"log"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type AttackPath struct {
	Nodes []string `json:"nodes"`
}

// FindAttackPaths returns all critical paths from Internet to Data
func FindAttackPaths() []AttackPath {
	if db.Driver != nil {
		log.Println("Using Neo4j for attack paths")
		return findPathsNeo4j()
	}

	log.Println("Using in-memory fallback for attack paths")
	return findPathsInMemory()
}

func findPathsNeo4j() []AttackPath {
	var paths []AttackPath
	ctx := context.Background()
	session := db.Driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	// MATCH p = (i:Internet)-[*]->(d:Data) RETURN p LIMIT 5
	query := `
		MATCH p = (i:Internet)-[*]->(d:Data)
		RETURN [node in nodes(p) | node.id] AS path_nodes
		LIMIT 5
	`

	res, err := session.Run(ctx, query, nil)
	if err != nil {
		log.Printf("Warning: Failed to query attack paths from Neo4j: %v", err)
		return paths
	}

	for res.Next(ctx) {
		record := res.Record()
		pathNodesVal, _ := record.Get("path_nodes")

		// Safely convert path nodes
		if nodeList, ok := pathNodesVal.([]interface{}); ok {
			var path []string
			for _, n := range nodeList {
				if str, ok := n.(string); ok {
					path = append(path, str)
				}
			}
			if len(path) > 0 {
				paths = append(paths, AttackPath{Nodes: path})
			}
		}
	}
	return paths
}

func findPathsInMemory() []AttackPath {
	graphMutex.RLock()
	defer graphMutex.RUnlock()

	var paths []AttackPath

	// DFS from internet node to data node
	var dfs func(current string, currentPath []string, visited map[string]bool)

	dfs = func(current string, currentPath []string, visited map[string]bool) {
		visited[current] = true
		currentPath = append(currentPath, current)

		node, exists := Nodes[current]
		if exists && node.Type == "data" {
			// Found a path
			// Make a copy of the path to avoid overwriting
			pathCopy := make([]string, len(currentPath))
			copy(pathCopy, currentPath)
			paths = append(paths, AttackPath{Nodes: pathCopy})

			// Stop at 5 paths like the limit
			if len(paths) >= 5 {
				return
			}
		} else {
			for _, edge := range Edges {
				if edge.Source == current && !visited[edge.Target] {
					// We only care about specific edges for attack paths
					if edge.Label == "EXPOSES" || edge.Label == "HAS_VULNERABILITY" || edge.Label == "ESCALATES_TO" || edge.Label == "CAN_ACCESS" {
						dfs(edge.Target, currentPath, visited)
					}
				}
			}
		}

		// Backtrack
		visited[current] = false
		currentPath = currentPath[:len(currentPath)-1]
	}

	// Ensure internet exists
	if _, ok := Nodes["internet"]; ok {
		visited := make(map[string]bool)
		dfs("internet", []string{}, visited)
	}

	return paths
}
