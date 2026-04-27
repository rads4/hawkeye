package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// HealthCheck responds with an ok status
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}
