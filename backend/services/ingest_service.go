package services

import (
	"encoding/json"
	"fmt"
	"hawkeye-backend/db"
	"hawkeye-backend/models"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ProcessCloudData is the main cloud ingestion entry point.
// Pipeline: ingest → normalize → scan → store → graph → findings
func ProcessCloudData(data map[string]interface{}) {
	StoreCloudData(data)
	fmt.Println("[ingest] Cloud data received:", data)

	// ── Normalize ──────────────────────────────────────────────────────────
	asset := NormalizeCloudData(data)
	if asset == nil {
		fmt.Println("[ingest] Normalization skipped (no ID or unrecognised service)")
		return
	}
	fmt.Printf("[ingest] Normalized asset: %+v\n", asset)

	// ── Secret scan (payload JSON string) ──────────────────────────────────
	var secrets []models.SecretFinding
	payloadStr := payloadToString(data)
	if payloadStr != "" {
		found, err := ScanForSecrets(payloadStr)
		if err != nil {
			fmt.Printf("[ingest] Secret scan warning: %v\n", err)
		}
		secrets = found
		if len(secrets) > 0 {
			fmt.Printf("[ingest] Secrets detected: %d finding(s)\n", len(secrets))
			asset.HasSecret = true
		}
	}

	// ── Vulnerability scan (container image) ───────────────────────────────
	var vulns []models.Vulnerability
	image, _ := data["image"].(string)
	if image == "" {
		// fall back to a default demo image so Trivy always has something to run
		image = "nginx:latest"
	}
	found, err := ScanContainerImage(image)
	if err != nil {
		fmt.Printf("[ingest] Vuln scan warning: %v\n", err)
	}
	vulns = found
	if len(vulns) > 0 {
		asset.HasVulnerability = true
		// Check if any are CRITICAL
		for _, v := range vulns {
			if v.Severity == "CRITICAL" {
				fmt.Println("[ingest] CRITICAL vulnerability found in container image!")
				break
			}
		}
	}

	// ── Store in Postgres ───────────────────────────────────────────────────
	storeAssetInPostgres(asset)

	// ── Build graph ─────────────────────────────────────────────────────────
	BuildGraphFromAsset(asset)

	// ── Scan asset properties ───────────────────────────────────────────────
	scanRes := ScanAsset(asset)

	// ── Generate finding (includes compliance) ──────────────────────────────
	finding := GenerateFinding(asset, scanRes, vulns, secrets)
	if finding != nil {
		fmt.Printf("[ingest] Finding generated: [%s] %s (score=%d)\n",
			finding.Severity, finding.Title, finding.RiskScore)
	}
}

// ProcessRuntimeEvent handles the parsing and ingestion of Falco runtime events
func ProcessRuntimeEvent(payload models.FalcoPayload) {
	event := models.RuntimeEvent{
		ID:          uuid.New().String(),
		ContainerID: payload.ContainerID,
		EventType:   mapFalcoRuleToEventType(payload.Rule),
		Description: payload.Output,
		Severity:    payload.Priority,
		Timestamp:   time.Now(),
	}

	StoreRuntimeEvent(event)
	fmt.Printf("[ingest] Runtime event ingested: %+v\n", event)

	// Normalize
	asset := NormalizeRuntimeEvent(event)
	if asset == nil {
		fmt.Println("[ingest] Runtime normalization skipped (no ContainerID)")
		return
	}

	storeAssetInPostgres(asset)
	BuildGraphFromAsset(asset)
	LinkRuntimeEventToGraph(event)

	scanRes := ScanRuntime(event)
	finding := GenerateFinding(asset, scanRes, nil, nil)
	if finding != nil {
		fmt.Printf("[ingest] Runtime finding generated: [%s] %s\n",
			finding.Severity, finding.Title)
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func storeAssetInPostgres(asset *models.Asset) {
	database := db.GetDB()
	if database == nil {
		return
	}

	tagsJSON, err := json.Marshal(asset.Tags)
	if err != nil {
		tagsJSON = []byte("{}")
	}

	query := `
	INSERT INTO unified_assets (id, name, type, cloud, is_public, has_admin_role, is_sensitive, tags)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		type = EXCLUDED.type,
		cloud = EXCLUDED.cloud,
		is_public = EXCLUDED.is_public,
		has_admin_role = EXCLUDED.has_admin_role,
		is_sensitive = EXCLUDED.is_sensitive,
		tags = EXCLUDED.tags;
	`

	_, err = database.Exec(query,
		asset.ID, asset.Name, asset.Type, asset.Cloud,
		asset.IsPublic, asset.HasAdminRole, asset.IsSensitive,
		string(tagsJSON),
	)
	if err != nil {
		fmt.Printf("[ingest] Postgres insert warning: %v\n", err)
	} else {
		fmt.Println("[ingest] DB insert success")
	}
}

func payloadToString(data map[string]interface{}) string {
	b, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return string(b)
}

func mapFalcoRuleToEventType(rule string) string {
	lowerRule := strings.ToLower(rule)
	if strings.Contains(lowerRule, "file") {
		return "file_access"
	} else if strings.Contains(lowerRule, "network") {
		return "network"
	}
	return "process"
}
