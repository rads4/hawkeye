package db

import (
	"database/sql"
	"log"

	_ "github.com/lib/pq"
)

var PostgresDB *sql.DB

// InitPostgres connects to the Postgres database and creates the unified_assets table if it doesn't exist
func InitPostgres() {
	connStr := "postgres://admin:admin@localhost:5432/hawkeye?sslmode=disable"
	var err error
	PostgresDB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Printf("Warning: Failed to open postgres connection: %v", err)
		return
	}

	err = PostgresDB.Ping()
	if err != nil {
		log.Printf("Warning: Failed to ping postgres: %v (Is the container running?)", err)
		return
	}

	log.Println("Successfully connected to PostgreSQL!")

	// Auto-create unified_assets table
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS unified_assets (
		id TEXT PRIMARY KEY,
		name TEXT,
		type TEXT,
		cloud TEXT,
		is_public BOOLEAN,
		has_admin_role BOOLEAN,
		is_sensitive BOOLEAN,
		tags JSONB
	);`

	_, err = PostgresDB.Exec(createTableQuery)
	if err != nil {
		log.Printf("Warning: Failed to create unified_assets table: %v", err)
	} else {
		log.Println("Successfully verified unified_assets table.")
	}
}

// GetDB returns the underlying database connection
func GetDB() *sql.DB {
	return PostgresDB
}
