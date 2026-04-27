package models

import "time"

type RuntimeEvent struct {
	ID          string    `json:"id"`
	ContainerID string    `json:"container_id"`
	EventType   string    `json:"event_type"` // file_access / network / process
	Description string    `json:"description"`
	Severity    string    `json:"severity"`
	Timestamp   time.Time `json:"timestamp"`
}

// FalcoPayload represents the incoming JSON event from Falco
type FalcoPayload struct {
	Rule        string `json:"rule"`
	Output      string `json:"output"`
	Priority    string `json:"priority"`
	ContainerID string `json:"container_id"`
}
