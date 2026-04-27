package models

// Node represents a graph entity
type Node struct {
	ID         string                 `json:"id"`
	Label      string                 `json:"label"` // For frontend
	Type       string                 `json:"type"`  // compute, identity, data, internet, runtime
	Properties map[string]interface{} `json:"properties,omitempty"`
}

// Edge represents a directional relationship between two Nodes
type Edge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Label  string `json:"label"` // EXPOSES, HAS_ROLE, CAN_ACCESS, TRIGGERED_EVENT
}
