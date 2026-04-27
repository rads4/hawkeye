package services

import "hawkeye-backend/models"

type ScanResult struct {
	IsPublic          bool
	HasAdminRole      bool
	IsSensitive       bool
	HasRuntimeAnomaly bool
	HasSecret         bool
	HasVulnerability  bool
}

// ScanAsset evaluates cloud asset properties
func ScanAsset(asset *models.Asset) ScanResult {
	return ScanResult{
		IsPublic:         asset.IsPublic,
		HasAdminRole:     asset.HasAdminRole,
		IsSensitive:      asset.IsSensitive,
		HasSecret:        asset.HasSecret,
		HasVulnerability: asset.HasVulnerability,
	}
}

// ScanRuntime evaluates runtime events
func ScanRuntime(event models.RuntimeEvent) ScanResult {
	return ScanResult{
		HasRuntimeAnomaly: event.Severity == "Critical",
	}
}
