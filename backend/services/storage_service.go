package services

import (
	"hawkeye-backend/models"
	"sync"
)

var (
	RawCloudData  []map[string]interface{}
	RuntimeEvents []models.RuntimeEvent
	cloudMutex    sync.Mutex
	runtimeMutex  sync.Mutex
)

// StoreCloudData appends raw cloud data to the in-memory store
func StoreCloudData(data map[string]interface{}) {
	cloudMutex.Lock()
	defer cloudMutex.Unlock()
	RawCloudData = append(RawCloudData, data)
}

// StoreRuntimeEvent appends a runtime event to the in-memory store
func StoreRuntimeEvent(event models.RuntimeEvent) {
	runtimeMutex.Lock()
	defer runtimeMutex.Unlock()
	RuntimeEvents = append(RuntimeEvents, event)
}

func init() {
	RawCloudData = make([]map[string]interface{}, 0)
	RuntimeEvents = make([]models.RuntimeEvent, 0)
}
