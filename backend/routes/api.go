package routes

import (
	"context"
	"net/http"
	"strings"

	"hawkeye-backend/db"
	"hawkeye-backend/models"
	"hawkeye-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// GetGraph handles the /graph endpoint
func GetGraph(c *gin.Context) {

	// ✅ Use Neo4j if available
	if db.Driver != nil {

		ctx := context.Background()
		session := db.Driver.NewSession(ctx, neo4j.SessionConfig{})
		defer session.Close(ctx)

		var nodes []models.Node
		var edges []models.Edge

		// 🔹 Fetch nodes
		nodeQuery := `
			MATCH (n)
			RETURN n.id as id, labels(n)[0] as type
		`

		result, err := session.Run(ctx, nodeQuery, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for result.Next(ctx) {
			rec := result.Record()

			id, _ := rec.Get("id")
			typ, _ := rec.Get("type")

			nodes = append(nodes, models.Node{
				ID:    id.(string),
				Type:  strings.ToLower(typ.(string)),
				Label: id.(string),
			})
		}

		// 🔹 Fetch edges
		edgeQuery := `
			MATCH (a)-[r]->(b)
			RETURN a.id as source, b.id as target, type(r) as label
		`

		result2, err := session.Run(ctx, edgeQuery, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for result2.Next(ctx) {
			rec := result2.Record()

			src, _ := rec.Get("source")
			tgt, _ := rec.Get("target")
			lbl, _ := rec.Get("label")

			edges = append(edges, models.Edge{
				Source: src.(string),
				Target: tgt.(string),
				Label:  lbl.(string),
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"nodes": nodes,
			"edges": edges,
		})
		return
	}

	// 🔹 fallback (if Neo4j not connected)
	nodes, edges := services.GetGraph()

	c.JSON(http.StatusOK, gin.H{
		"nodes": nodes,
		"edges": edges,
	})
}

// GetAttackPaths handles the /attack-paths endpoint
func GetAttackPaths(c *gin.Context) {
	paths := services.FindAttackPaths()
	c.JSON(http.StatusOK, gin.H{
		"paths": paths,
	})
}

// GetFindings handles the /findings endpoint
func GetFindings(c *gin.Context) {
	findings := services.ActiveFindings

	seen := map[string]bool{}
	var allCompliance []models.ComplianceResult

	for _, f := range findings {
		for _, cr := range f.Compliance {
			if cr.Status == "FAIL" && !seen[cr.ID] {
				seen[cr.ID] = true
				allCompliance = append(allCompliance, cr)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"findings":   findings,
		"compliance": allCompliance,
	})
}