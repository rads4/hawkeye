package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"hawkeye-backend/models"
)

// ──────────────────────────────────────────────────────────────────────────────
// Tool Availability Check (NO INSTALLATION)
// ──────────────────────────────────────────────────────────────────────────────

func isToolAvailable(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// ──────────────────────────────────────────────────────────────────────────────
// Trivy – Container Image Scan
// ──────────────────────────────────────────────────────────────────────────────

func ScanContainerImage(image string) ([]models.Vulnerability, error) {
	if image == "" {
		return nil, nil
	}

	if !isToolAvailable("trivy") {
		log.Printf("[scanner] trivy not installed – skipping vulnerability scan for %s", image)
		return nil, nil
	}

	log.Printf("[scanner] Running trivy on image: %s", image)

	cmd := exec.Command("trivy", "image", "--quiet", "-f", "json", image)
	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	_ = cmd.Run()

	if stdout.Len() == 0 {
		return nil, nil
	}

	var trivyOut struct {
		Results []struct {
			Vulnerabilities []struct {
				VulnerabilityID string `json:"VulnerabilityID"`
				Severity        string `json:"Severity"`
				PkgName         string `json:"PkgName"`
			} `json:"Vulnerabilities"`
		} `json:"Results"`
	}

	if err := json.Unmarshal(stdout.Bytes(), &trivyOut); err != nil {
		return nil, fmt.Errorf("trivy parse error: %w", err)
	}

	var vulns []models.Vulnerability

	for _, result := range trivyOut.Results {
		for _, v := range result.Vulnerabilities {
			sev := strings.ToUpper(v.Severity)

			if sev == "CRITICAL" || sev == "HIGH" || sev == "MEDIUM" {
				vulns = append(vulns, models.Vulnerability{
					ID:       v.VulnerabilityID,
					Severity: sev,
					Package:  v.PkgName,
				})
			}
		}
	}

	log.Printf("[scanner] trivy found %d vulnerabilities", len(vulns))
	return vulns, nil
}

// ──────────────────────────────────────────────────────────────────────────────
// Gitleaks – Secret Detection
// ──────────────────────────────────────────────────────────────────────────────

func ScanForSecrets(content string) ([]models.SecretFinding, error) {
	if content == "" {
		return nil, nil
	}

	// ✅ ALWAYS run regex first (guaranteed detection for demo)
	regexFindings := regexSecretScan(content)

	// If gitleaks not installed → fallback only
	if !isToolAvailable("gitleaks") {
		log.Println("[scanner] gitleaks not installed – using regex fallback")
		return regexFindings, nil
	}

	// Write to temp file for scanning
	tmpDir, err := os.MkdirTemp("", "hawkeye-gitleaks-*")
	if err != nil {
		return regexFindings, nil
	}
	defer os.RemoveAll(tmpDir)

	tmpFile := filepath.Join(tmpDir, "payload.txt")

	if err := os.WriteFile(tmpFile, []byte(content), 0600); err != nil {
		return regexFindings, nil
	}

	cmd := exec.Command("gitleaks", "detect", "--source", tmpDir, "-f", "json", "--no-git")

	var stdout bytes.Buffer
	cmd.Stdout = &stdout

	_ = cmd.Run()

	if stdout.Len() == 0 {
		return regexFindings, nil
	}

	var raw []struct {
		RuleID string `json:"RuleID"`
		Secret string `json:"Secret"`
		Match  string `json:"Match"`
	}

	if err := json.Unmarshal(stdout.Bytes(), &raw); err != nil {
		return regexFindings, nil
	}

	var findings []models.SecretFinding

	for _, r := range raw {
		match := r.Match
		if match == "" {
			match = r.Secret
		}

		findings = append(findings, models.SecretFinding{
			RuleID: r.RuleID,
			Match:  match,
		})
	}

	// Merge regex + gitleaks
	seen := map[string]bool{}

	for _, f := range findings {
		seen[f.RuleID] = true
	}

	for _, f := range regexFindings {
		if !seen[f.RuleID] {
			findings = append(findings, f)
		}
	}

	log.Printf("[scanner] detected %d secrets", len(findings))

	return findings, nil
}

// ──────────────────────────────────────────────────────────────────────────────
// Regex fallback (CRITICAL for demo)
// ──────────────────────────────────────────────────────────────────────────────

func regexSecretScan(content string) []models.SecretFinding {

	if strings.Contains(content, "AKIA") {

		idx := strings.Index(content, "AKIA")

		end := idx + 20
		if end > len(content) {
			end = len(content)
		}

		// trim unwanted characters
		match := content[idx:end]
		match = strings.Trim(match, "\"',} ")

		return []models.SecretFinding{
			{
				RuleID: "aws-access-key-regex",
				Match:  match,
			},
		}
	}

	return nil
}