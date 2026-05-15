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

	// ── 1. Normalize ─────────────────────────────────────────
	asset := NormalizeCloudData(data)
	if asset == nil {
		fmt.Println("[ingest] Normalization skipped")
		return
	}

	// ── 2. Secret scan ───────────────────────────────────────
	var secrets []models.SecretFinding
	if payloadStr := payloadToString(data); payloadStr != "" {
		found, _ := ScanForSecrets(payloadStr)
		secrets = found
		if len(secrets) > 0 {
			fmt.Println("[ingest] Secrets detected:", len(secrets))
			asset.HasSecret = true
		}
	}

	// ── 3. Vulnerability scan (REAL TRIVY) ───────────────────
	var vulns []models.Vulnerability

	image, _ := data["image"].(string)
	if image == "" {
		image = "nginx:latest"
	}

	fmt.Println("[scanner] running trivy on", image)

	found, err := ScanContainerImage(image)
	if err != nil {
		fmt.Println("[scanner] trivy error:", err)
	} else {
		fmt.Printf("[scanner] trivy completed: %d vulnerabilities\n", len(found))
	}

	vulns = found

	if len(vulns) > 0 {
		asset.HasVulnerability = true
	}

	// ✅ LOG AFTER SCAN (this was missing)
	fmt.Printf("[ingest] Final asset state: %+v\n", asset)

	// ── 4. Store in Postgres ─────────────────────────────────
	storeAssetInPostgres(asset)

	// ── 5. Reset everything (graph + findings) ──────────────
	ResetGraph()
	ClearFindings()

	// ── 6. Build graph ───────────────────────────────────────
	BuildGraphFromAsset(asset)

	// ── 7. Scan asset properties ─────────────────────────────
	scanRes := ScanAsset(asset)

	// ── 8. Generate finding ──────────────────────────────────
	finding := GenerateFinding(asset, scanRes, vulns, secrets)
	if finding != nil {
		fmt.Printf("[ingest] Finding: [%s] %s (score=%d)\n",
			finding.Severity, finding.Title, finding.RiskScore)
	}
}

// Runtime ingestion
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
	fmt.Println("[ingest] Runtime event:", event)

	asset := NormalizeRuntimeEvent(event)
	if asset == nil {
		return
	}

	storeAssetInPostgres(asset)
	BuildGraphFromAsset(asset)
	LinkRuntimeEventToGraph(event)

	scanRes := ScanRuntime(event)
	GenerateFinding(asset, scanRes, nil, nil)
}

// ── Helpers ─────────────────────────────────────────────

func storeAssetInPostgres(asset *models.Asset) {
	database := db.GetDB()
	if database == nil {
		return
	}

	tagsJSON, _ := json.Marshal(asset.Tags)

	query := `
	INSERT INTO unified_assets (id, name, type, cloud, is_public, has_admin_role, is_sensitive, tags)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	ON CONFLICT (id) DO UPDATE SET
	name=EXCLUDED.name, type=EXCLUDED.type, cloud=EXCLUDED.cloud,
	is_public=EXCLUDED.is_public, has_admin_role=EXCLUDED.has_admin_role,
	is_sensitive=EXCLUDED.is_sensitive, tags=EXCLUDED.tags;
	`

	if _, err := database.Exec(query,
		asset.ID, asset.Name, asset.Type, asset.Cloud,
		asset.IsPublic, asset.HasAdminRole, asset.IsSensitive,
		string(tagsJSON),
	); err != nil {
		fmt.Println("[ingest] Postgres insert warning:", err)
	}
}

func payloadToString(data map[string]interface{}) string {
	b, _ := json.Marshal(data)
	return string(b)
}

func mapFalcoRuleToEventType(rule string) string {
	r := strings.ToLower(rule)
	if strings.Contains(r, "file") {
		return "file_access"
	}
	if strings.Contains(r, "network") {
		return "network"
	}
	return "process"
}
