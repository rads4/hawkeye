package config

import (
	"os"
)

type Config struct {
	Neo4jURI      string
	Neo4jUser     string
	Neo4jPassword string
	ServerPort    string
}

// LoadConfig loads the environment variables into the Config struct
func LoadConfig() Config {
	uri := os.Getenv("NEO4J_URI")
	if uri == "" {
		uri = "bolt://localhost:7687"
	}

	user := os.Getenv("NEO4J_USER")
	if user == "" {
		user = "neo4j"
	}

	pass := os.Getenv("NEO4J_PASSWORD")
	if pass == "" {
		pass = "password"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return Config{
		Neo4jURI:      uri,
		Neo4jUser:     user,
		Neo4jPassword: pass,
		ServerPort:    port,
	}
}
