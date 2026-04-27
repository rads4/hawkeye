package routes

import (
	"hawkeye-backend/models"
	"hawkeye-backend/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetGraph handles the /graph endpoint
func GetGraph(c *gin.Context) {
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

// GetFindings handles the /findings endpoint.
// Returns findings (each embedding its own compliance results) plus a rolled-up
// compliance summary across all findings so the frontend can show a global view.
func GetFindings(c *gin.Context) {
	findings := services.ActiveFindings

	// Roll-up: collect all unique FAIL results across findings
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
