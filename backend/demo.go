//go:build ignore

package main

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
)

func main() {
	url := "http://localhost:8082/ingest/cloud"

	payloads := []string{
		`{
			"service": "ecs",
			"task_id": "prod-app",
			"public_ip": "1.2.3.4",
			"iam_role": "admin-role",
			"s3_access": true,
			"env_vars": "AWS_SECRET=AKIA123456ABCDEF",
			"image": "nginx:latest"
		}`,
		`{
			"service": "ecs",
			"task_id": "dev-app",
			"iam_role": "readonly-role",
			"image": "node:18"
		}`,
	}

	for i, payload := range payloads {
		resp, err := http.Post(url, "application/json", bytes.NewBuffer([]byte(payload)))
		if err != nil {
			log.Fatalf("Failed to send request %d: %v", i+1, err)
		}
		defer resp.Body.Close()

		fmt.Printf("Request %d sent. Status: %s\n", i+1, resp.Status)
	}

	fmt.Println("Demo payloads successfully injected.")
}
