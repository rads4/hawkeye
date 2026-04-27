package services

import (
	"hawkeye-backend/models"
)

var ActiveFindings []models.Finding

// GenerateFinding evaluates the scan result and generates a richly populated Finding.
// Pass the full asset pointer so compliance rules and scanner data can be attached.
func GenerateFinding(asset *models.Asset, scan ScanResult,
	vulns []models.Vulnerability, secrets []models.SecretFinding) *models.Finding {

	assetID := asset.ID
	score := 0
	title := ""
	desc := ""

	if scan.IsPublic {
		score += 5
	}
	if scan.HasAdminRole {
		score += 7
	}
	if scan.IsSensitive {
		score += 10
	}
	if scan.HasRuntimeAnomaly {
		score += 10
	}
	if scan.HasSecret {
		score += 15
	}
	if scan.HasVulnerability {
		score += 10
	}

	if score == 0 {
		return nil
	}

	severity := "MEDIUM"
	if score >= 20 {
		severity = "CRITICAL"
		switch {
		case scan.HasSecret:
			title = "Hardcoded Secret Detected"
			desc = "Asset contains hardcoded secrets or exposed credentials (e.g. AWS Access Key)."
		case scan.IsPublic && scan.HasAdminRole && scan.IsSensitive:
			title = "Public Admin Asset with Sensitive Data"
			desc = "Asset is publicly accessible, holds an admin role, and contains sensitive data."
		case scan.HasRuntimeAnomaly:
			title = "Critical Runtime Anomaly Detected"
			desc = "High-risk runtime event detected on the asset."
		case scan.HasVulnerability:
			title = "Critical Vulnerability in Container Image"
			desc = "Critical CVEs found in the container image."
		default:
			title = "Critical Risk Asset"
			desc = "Multiple high-risk factors detected."
		}
	} else if score >= 10 {
		severity = "HIGH"
		switch {
		case scan.HasSecret:
			title = "Hardcoded Secret Detected"
			desc = "Asset contains hardcoded secrets."
		case scan.HasVulnerability:
			title = "Critical Vulnerability in Container Image"
			desc = "HIGH/CRITICAL CVEs found in the container image."
		case scan.IsPublic && scan.HasAdminRole:
			title = "Public Asset with Admin Role"
			desc = "Asset is publicly accessible and has admin privileges."
		case scan.HasRuntimeAnomaly:
			title = "High Risk Runtime Event"
			desc = "Suspicious runtime activity detected."
		default:
			title = "High Risk Asset"
			desc = "Significant risk factors detected."
		}
	} else {
		title = "Medium Risk Asset"
		desc = "Moderate risk factors detected."
	}

	// Run compliance evaluation
	compliance := EvaluateCompliance(asset)

	finding := models.Finding{
		AssetID:         assetID,
		Title:           title,
		Severity:        severity,
		Description:     desc,
		RiskScore:       score,
		Compliance:      compliance,
		Vulnerabilities: vulns,
		Secrets:         secrets,
	}

	ActiveFindings = append(ActiveFindings, finding)
	return &finding
}
