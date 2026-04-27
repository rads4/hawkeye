package routes

import (
	"hawkeye-backend/models"
	"hawkeye-backend/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

// IngestCloudData handles the /ingest/cloud endpoint
func IngestCloudData(c *gin.Context) {
	var payload map[string]interface{}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	services.ProcessCloudData(payload)

	c.JSON(http.StatusOK, gin.H{
		"message": "Cloud data ingested successfully",
	})
}

// IngestRuntimeEvent handles the /ingest/runtime endpoint
func IngestRuntimeEvent(c *gin.Context) {
	var payload models.FalcoPayload

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	services.ProcessRuntimeEvent(payload)

	c.JSON(http.StatusOK, gin.H{
		"message": "Runtime event ingested successfully",
	})
}
