package db

import (
	"context"
	"fmt"
	"hawkeye-backend/config"
	"log"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var Driver neo4j.DriverWithContext

// InitNeo4j initializes the connection to Neo4j
func InitNeo4j(cfg config.Config) error {
	var err error
	auth := neo4j.BasicAuth(cfg.Neo4jUser, cfg.Neo4jPassword, "")
	Driver, err = neo4j.NewDriverWithContext(cfg.Neo4jURI, auth)
	if err != nil {
		return fmt.Errorf("failed to create neo4j driver: %w", err)
	}

	return nil
}

// TestConnection verifies that the driver can connect to the database
func TestConnection() error {
	if Driver == nil {
		return fmt.Errorf("neo4j driver not initialized")
	}

	ctx := context.Background()
	err := Driver.VerifyConnectivity(ctx)
	if err != nil {
		return fmt.Errorf("failed to verify neo4j connectivity: %w", err)
	}

	log.Println("Successfully connected to Neo4j!")
	return nil
}
