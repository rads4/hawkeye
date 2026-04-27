package services

import "hawkeye-backend/models"

// EvaluateCompliance evaluates an asset against SOC2 / CIS benchmark rules
// and returns the full list of results (PASS and FAIL).
func EvaluateCompliance(asset *models.Asset) []models.ComplianceResult {
	var results []models.ComplianceResult

	// CIS-1 – No public access to compute resources
	cis1 := models.ComplianceResult{
		ID:          "CIS-1",
		Title:       "No public access to compute resources",
		Status:      "PASS",
		Description: "Compute resources must not be directly accessible from the internet.",
	}
	if asset.IsPublic {
		cis1.Status = "FAIL"
		cis1.Description = "Asset is publicly accessible. Remove public IP or add firewall rules."
	}
	results = append(results, cis1)

	// CIS-2 – IAM role must follow least privilege
	cis2 := models.ComplianceResult{
		ID:          "CIS-2",
		Title:       "IAM role violates least privilege",
		Status:      "PASS",
		Description: "IAM roles must follow the principle of least privilege.",
	}
	if asset.HasAdminRole {
		cis2.Status = "FAIL"
		cis2.Description = "Asset has an admin IAM role attached. Downscope permissions to required actions only."
	}
	results = append(results, cis2)

	// CIS-3 – Sensitive data must not be exposed publicly
	cis3 := models.ComplianceResult{
		ID:          "CIS-3",
		Title:       "Sensitive data exposed publicly",
		Status:      "PASS",
		Description: "Assets containing sensitive data must not be publicly reachable.",
	}
	if asset.IsSensitive && asset.IsPublic {
		cis3.Status = "FAIL"
		cis3.Description = "Asset holds sensitive data and is publicly accessible. Restrict network access immediately."
	}
	results = append(results, cis3)

	// CIS-4 – Open firewall (0.0.0.0/0)
	cis4 := models.ComplianceResult{
		ID:          "CIS-4",
		Title:       "Open firewall (0.0.0.0/0)",
		Status:      "PASS",
		Description: "Firewall rules must not allow unrestricted inbound traffic.",
	}
	if asset.IsPublic {
		// Treat any publicly reachable resource as having an overly permissive firewall
		cis4.Status = "FAIL"
		cis4.Description = "Asset is reachable from 0.0.0.0/0. Restrict inbound rules to known CIDRs."
	}
	results = append(results, cis4)

	return results
}
