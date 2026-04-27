package models

// ComplianceResult represents a single CIS / SOC2 rule evaluation
type ComplianceResult struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Status      string `json:"status"`      // PASS / FAIL
	Description string `json:"description"`
}

// Vulnerability represents a CVE found by Trivy
type Vulnerability struct {
	ID       string `json:"id"`
	Severity string `json:"severity"`
	Package  string `json:"package"`
}

// SecretFinding represents a secret detected by Gitleaks
type SecretFinding struct {
	RuleID string `json:"rule_id"`
	Match  string `json:"match"`
}

// Finding represents a security issue discovered by the engine
type Finding struct {
	AssetID         string              `json:"asset_id"`
	Title           string              `json:"title"`
	Severity        string              `json:"severity"` // MEDIUM, HIGH, CRITICAL
	Description     string              `json:"description"`
	RiskScore       int                 `json:"risk_score"`
	Compliance      []ComplianceResult  `json:"compliance,omitempty"`
	Vulnerabilities []Vulnerability     `json:"vulnerabilities,omitempty"`
	Secrets         []SecretFinding     `json:"secrets,omitempty"`
}
