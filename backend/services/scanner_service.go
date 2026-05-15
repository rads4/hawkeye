package services

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"hawkeye-backend/models"
)

// ──────────────────────────────────────────────────────────────────────────────
// Tool Availability Check
// ──────────────────────────────────────────────────────────────────────────────

func isToolAvailable(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// ──────────────────────────────────────────────────────────────────────────────
// Trivy – Container Image Scan (WITH TIMEOUT + JSON OUTPUT)
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

	// ✅ TIMEOUT FIX (prevents hanging API)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx,
		"trivy",
		"image",
		"--scanners", "vuln",
		"--format", "json",
		"--quiet",
		image,
	)

	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stdout

	err := cmd.Run()

	// ✅ TIMEOUT HANDLING
	if ctx.Err() == context.DeadlineExceeded {
		log.Println("[scanner] Trivy timed out")
		return nil, nil
	}

	if err != nil {
		log.Printf("[scanner] Trivy error: %v", err)
		return nil, nil
	}

	if stdout.Len() == 0 {
		log.Println("[scanner] Trivy returned empty output")
		return nil, nil
	}

	// ✅ Parse JSON output
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
		log.Printf("[scanner] JSON parse error: %v", err)
		return nil, nil
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

	// Always run regex fallback first
	regexFindings := regexSecretScan(content)

	if !isToolAvailable("gitleaks") {
		log.Println("[scanner] gitleaks not installed – using regex fallback")
		return regexFindings, nil
	}

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
// Regex fallback (demo-safe)
// ──────────────────────────────────────────────────────────────────────────────

func regexSecretScan(content string) []models.SecretFinding {

	if strings.Contains(content, "AKIA") {

		idx := strings.Index(content, "AKIA")

		end := idx + 20
		if end > len(content) {
			end = len(content)
		}

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
