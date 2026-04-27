package models

type Asset struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Type         string            `json:"type"`  // compute / identity / data / network
	Cloud        string            `json:"cloud"` // aws / gcp
	IsPublic     bool              `json:"is_public"`
	HasAdminRole bool              `json:"has_admin_role"`
	IsSensitive      bool              `json:"is_sensitive"`
	HasSecret        bool              `json:"has_secret"`
	HasVulnerability bool              `json:"has_vulnerability"`
	Tags             map[string]string `json:"tags"`
}
