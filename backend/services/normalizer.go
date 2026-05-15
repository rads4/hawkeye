package services

import (
	"hawkeye-backend/models"
	"strings"
)

// NormalizeCloudData normalizes arbitrary cloud payload into an Asset
func NormalizeCloudData(payload map[string]interface{}) *models.Asset {
	service, _ := payload["service"].(string)

	if service == "ecs" {
		return mapECS(payload)
	}

	return nil
}

// NormalizeRuntimeEvent maps container_id to asset ID and normalizes runtime events
func NormalizeRuntimeEvent(event models.RuntimeEvent) *models.Asset {
	// For runtime, the asset is the container itself or relates to an existing asset
	// We map the container_id as the ID for the unified asset
	if event.ContainerID == "" {
		return nil
	}

	return &models.Asset{
		ID:    event.ContainerID,
		Name:  "Container-" + event.ContainerID,
		Type:  "compute",
		Tags:  map[string]string{"env": "dev", "owner": "unknown"},
	}
}

func mapECS(payload map[string]interface{}) *models.Asset {
	taskID, ok := payload["task_id"].(string)
	if !ok || taskID == "" {
		return nil
	}

	// Standardize ID and Name
	asset := &models.Asset{
		ID:    "ecs-task-" + taskID,
		Name:  "ecs-task-" + taskID,
		Type:  "compute",
		Cloud: "aws",
		Tags:  map[string]string{"provider": "aws", "service": "ecs"},
	}

	if _, ok := payload["public_ip"]; ok {
		asset.IsPublic = true
	}

	if iamRole, ok := payload["iam_role"].(string); ok {
		asset.Tags["iam_role"] = "iam-role-" + iamRole
		if strings.Contains(strings.ToLower(iamRole), "admin") {
			asset.HasAdminRole = true
		}
	}

	if val, ok := payload["s3_access"]; ok {
		switch v := val.(type) {
		case bool:
			if v {
				asset.IsSensitive = true
			}
		case string:
			if strings.ToLower(v) == "true" {
				asset.IsSensitive = true
			}
		}
	}

	return asset
}
