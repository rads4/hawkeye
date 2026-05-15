package services

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ecs"
)

// FetchECSAssets lists ECS tasks and extracts metadata for ingestion.
// This is a foundation function that can be expanded with real AWS credentials.
func FetchECSAssets() ([]map[string]interface{}, error) {
	ctx := context.Background()

	// Load default AWS config (uses env vars, shared config, or IAM roles)
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %v", err)
	}

	client := ecs.NewFromConfig(cfg)
	log.Println("[aws] Fetching ECS clusters...")

	// 1. List Clusters
	listClusters, err := client.ListClusters(ctx, &ecs.ListClustersInput{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ECS clusters: %v", err)
	}

	var results []map[string]interface{}

	for _, clusterArn := range listClusters.ClusterArns {
		// 2. List Tasks for each cluster
		listTasks, err := client.ListTasks(ctx, &ecs.ListTasksInput{
			Cluster: &clusterArn,
		})
		if err != nil {
			log.Printf("[aws] warning: failed to list tasks for cluster %s: %v", clusterArn, err)
			continue
		}

		if len(listTasks.TaskArns) == 0 {
			continue
		}

		// 3. Describe Tasks to get detail
		describeTasks, err := client.DescribeTasks(ctx, &ecs.DescribeTasksInput{
			Cluster: &clusterArn,
			Tasks:   listTasks.TaskArns,
		})
		if err != nil {
			log.Printf("[aws] warning: failed to describe tasks: %v", err)
			continue
		}

		for _, task := range describeTasks.Tasks {
			// Extract Task ID from ARN
			parts := strings.Split(*task.TaskArn, "/")
			taskID := parts[len(parts)-1]

			// Mock metadata for now as placeholder for full IAM/Network mapping
			results = append(results, map[string]interface{}{
				"service":   "ecs",
				"task_id":   taskID,
				"image":     *task.Containers[0].Image,
				"iam_role":  "admin-role", // Placeholder
				"public_ip": "35.179.134.12", // Placeholder
				"s3_access": true,           // Placeholder
			})
		}
	}

	// Fallback for demo if no real assets found
	if len(results) == 0 {
		log.Println("[aws] No real ECS assets found. Returning mock foundation.")
		results = append(results, map[string]interface{}{
			"service":   "ecs",
			"task_id":   "real-aws-foundation",
			"image":     "950288991646.dkr.ecr.eu-west-2.amazonaws.com/hawkeye-vuln:latest",
			"iam_role":  "admin-role",
			"public_ip": "35.179.134.12",
			"s3_access": true,
		})
	}

	return results, nil
}
