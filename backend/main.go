package main

import (
	"hawkeye-backend/config"
	"hawkeye-backend/db"
	"hawkeye-backend/routes"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize Neo4j
	if err := db.InitNeo4j(cfg); err != nil {
		log.Printf("Warning: Failed to initialize Neo4j: %v\n", err)
	} else {
		if err := db.TestConnection(); err != nil {
			log.Printf("Warning: Failed to test Neo4j connection: %v\n", err)
		}
	}

	// Initialize Postgres
	db.InitPostgres()

	// Make sure to close driver when shutting down
	defer func() {
		if db.Driver != nil {
			db.Driver.Close(nil)
		}
	}()

	// Initialize Gin router
	r := gin.Default()

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Allow all origins for local development
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Setup routes
	r.GET("/health", routes.HealthCheck)
	
	// Graph & Path APIs
	r.GET("/graph", routes.GetGraph)
	r.GET("/attack-paths", routes.GetAttackPaths)
	r.GET("/findings", routes.GetFindings)

	ingestGroup := r.Group("/ingest")
	{
		ingestGroup.POST("/cloud", routes.IngestCloudData)
		ingestGroup.POST("/runtime", routes.IngestRuntimeEvent)
	}

	// Start server
	log.Println("Starting Hawkeye backend on port 8081...")
	log.Println("DEBUG PORT:", cfg.ServerPort)
	if err := r.Run(":8081"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
