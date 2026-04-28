# 🦅 HAWKEYE – FULL PROJECT CONTEXT (CNAPP SYSTEM)

---

## 🧠 PROJECT OVERVIEW

Hawkeye is a Wiz-inspired CNAPP (Cloud-Native Application Protection Platform) prototype.

Core idea:
👉 Detect and visualize **attack paths** across cloud infrastructure
👉 Combine **graph-based security + scanners + compliance + findings**

---

## 🏗️ CURRENT ARCHITECTURE

### Backend

* Language: Go
* Framework: Gin
* Port: 8082 (IMPORTANT – 8081 blocked by macmnsvc)

### Databases

* Neo4j → Graph (attack paths)
* PostgreSQL → Asset storage

### Frontend

* React (Vite)
* React Flow (graph visualization)
* Tailwind / custom styling
* Wiz-style UI (4 panel layout)

---

## 🔁 CORE PIPELINE (STRICT)

ingest → normalize → scan → store → graph → findings

⚠️ RULES:

* No async goroutines in pipeline
* No duplicate graph builds
* Graph built ONLY once per ingestion

---

## 📥 INGESTION

### Endpoint

POST /ingest/cloud

### Input example

{
"service": "ecs",
"task_id": "...",
"public_ip": "...",
"iam_role": "...",
"s3_access": true,
"api_key": "..."
}

---

## 🔄 NORMALIZATION

Converts raw payload → Asset model:

Asset fields:

* ID
* Type (compute, identity, data)
* Cloud (aws/gcp)
* IsPublic
* HasAdminRole
* IsSensitive
* HasSecret
* HasVulnerability

---

## 🔍 SCANNER LAYER (CRITICAL)

### CURRENT STATE

* Trivy: unstable / timeout issues (being reworked)
* Gitleaks: fallback regex used (NOT acceptable)

---

### REQUIRED FINAL STATE

#### 🔹 Trivy

* Must run with timeout (20–30s)
* Must NOT block ingestion
* Must return structured vulnerabilities
* No silent failures

#### 🔹 Gitleaks

* Must be installed properly
* Must run via CLI
* NO regex fallback allowed in final system

---

### 🚨 RULE

If scanner not available:
👉 return explicit error
👉 DO NOT fake results

---

## 🧱 GRAPH ENGINE (Neo4j)

### CURRENT BEHAVIOR

* Nodes created per asset
* Relationships:

  * EXPOSES
  * HAS_ROLE
  * CAN_ACCESS
  * CAN_EXPLOIT (planned)

---

### ⚠️ PROBLEMS (IDENTIFIED)

* Graph accumulation (duplicate nodes)
* No filtering
* UI expects single attack path

---

### ✅ CURRENT DECISION

Using:
👉 GRAPH RESET APPROACH

Before ingestion:
MATCH (n) DETACH DELETE n

---

### 🔥 FUTURE (IMPORTANT)

Move to:
👉 Query-based graph (Wiz model)

Meaning:

* Store full graph
* Query attack paths dynamically
* Return filtered nodes only

---

## ⚔️ ATTACK PATH ENGINE

### CURRENT STATE

* Static / implicit path:
  Internet → Compute → Identity → Data

---

### REQUIRED UPGRADE

Implement dynamic traversal:

Goal:
Find paths:
Internet → ... → Sensitive Data

Conditions:

* public exposure
* admin role / privilege escalation
* sensitive data access

---

### OUTPUT

Return ONLY:

* nodes in path
* edges in path

---

## 🛡️ COMPLIANCE ENGINE

### CURRENT STATE

Basic rules implemented

---

### REQUIRED IMPROVEMENT

Map real rules:

| Rule  | Condition          |
| ----- | ------------------ |
| CIS-1 | Public exposure    |
| CIS-2 | Admin role         |
| CIS-3 | Public + sensitive |
| CIS-4 | Open network       |

---

### OUTPUT FORMAT

{
"id": "CIS-1",
"status": "FAIL",
"severity": "HIGH"
}

---

## 🚨 FINDINGS ENGINE

### CURRENT STATE

* Basic findings
* Risk scoring exists

---

### REQUIRED FINAL STRUCTURE

Each finding:

{
title,
severity,
risk_score,
attack_path,
compliance,
blast_radius
}

---

## 🎨 FRONTEND (WIZ-STYLE UI)

### LAYOUT

* TopBar → metrics + controls
* Left → Findings list
* Center → Attack path graph
* Right → Details panel

---

### GRAPH RULES (VERY IMPORTANT)

* DO NOT show full graph
* Show ONE attack path
* Max 5–8 nodes
* Horizontal (left → right)
* Context nodes (optional, faded)

---

### INTERACTIONS

* Hover finding → preview graph
* Click finding → load graph
* Hover node → highlight edges
* Click node → update details

---

## 🚨 CRITICAL DESIGN PRINCIPLE

👉 ONE RISK = ONE STORY

---

## ☁️ CLOUD INTEGRATION (PLANNED)

### AWS

* Use STS AssumeRole
* NO access keys
* Validate connection

### GCP

* Service Account JSON

---

## ⚠️ CURRENT SYSTEM ISSUES (TRACKED)

1. Trivy unstable
2. Gitleaks not installed
3. Attack paths static
4. Graph not query-based
5. Compliance not realistic
6. Findings need improvement

---

## 🧠 DEVELOPMENT STRATEGY (STRICT ORDER)

### PHASE 1

✔ Cleanup backend (remove hacks)

### PHASE 2

✔ Fix scanners (Trivy + Gitleaks)

### PHASE 3

✔ Dynamic attack path engine

### PHASE 4

✔ Compliance engine improvement

### PHASE 5

✔ Findings quality upgrade

### PHASE 6

✔ AWS integration

### PHASE 7

✔ UI polish

---

## 🚫 DO NOT DO

* Do NOT rebuild project
* Do NOT mix frontend + backend changes together
* Do NOT use fake scanner outputs
* Do NOT show full graph in UI

---

## 🎯 FINAL GOAL

A production-like CNAPP tool that:

* detects attack paths
* visualizes risks clearly
* integrates scanners + compliance
* feels like Wiz

---

## 🧠 KEY CONCEPT TO REMEMBER

"Wiz does not show the graph.
Wiz shows the risk story extracted from the graph."
