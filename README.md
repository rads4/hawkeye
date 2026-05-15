# 🦅 hawkeye

Attack-path driven CNAPP platform for AWS and GCP.

Hawkeye correlates cloud infrastructure exposure, IAM risk, vulnerabilities, runtime activity, and sensitive data access into a unified attack graph.

Instead of showing isolated alerts, Hawkeye visualizes how an attacker could realistically move through a cloud environment.

---

## Overview

Hawkeye combines:

- Cloud Security Posture Management (CSPM)
- Cloud Infrastructure Entitlement Management (CIEM)
- Runtime Threat Detection
- Attack Path Analysis
- Vulnerability Contextualization

into a single interactive platform.

---

## Core Workflow

```text
Cloud Assets + Runtime Events
            ↓
      Asset Discovery
            ↓
      Normalization Layer
            ↓
      Correlation Engine
            ↓
      Attack Path Builder
            ↓
   Risk Scoring & Findings
            ↓
 Interactive Visualization
```

---

# Features

- Multi-cloud visibility for AWS & GCP
- Dynamic attack path visualization
- IAM privilege escalation analysis
- Runtime threat correlation using Falco
- ECS / EC2 / IAM / S3 asset mapping
- Sensitive data exposure tracking
- Blast radius analysis
- CIS-style compliance checks
- Interactive graph exploration
- Jira remediation workflow
- Risk scoring and finding prioritization

---

# Attack Path Model

Example attack chain visualized by Hawkeye:

```text
Internet
   ↓
Open Security Group
   ↓
Public EC2 / ECS Task
   ↓
Privileged IAM Role
   ↓
Sensitive S3 Bucket
```

---

# Platform Screens

## Main Attack Graph

Interactive attack-path visualization with correlated findings and cloud assets.

`assets/main-attack-graph-screen.png`

---

## Finding Details

Detailed breakdown of:

- risk score
- blast radius
- attack chain
- compliance failures
- remediation guidance

`assets/finding-details.png`

`assets/comp-remediation.png`

---

## Resource Detail View

Contextual resource inspection with exposure indicators and attack-path association.

`assets/attack-path-zoom.png`

---

## Cloud Environment Onboarding

AWS and GCP onboarding workflow for secure environment scanning.

`assets/aws-setup.png`

`assets/gcp-setup.png`

---

# Correlation Engine

Hawkeye correlates:

- Cloud infrastructure metadata
- IAM permissions
- Runtime events
- Vulnerability findings
- Public exposure
- Sensitive data access

into a unified attack narrative.

Example:

```text
Public ECS Task
    +
Admin IAM Role
    +
Sensitive S3 Access
    ↓
Critical Attack Path
```

---

# Architecture

```text
                ┌──────────────┐
                │ AWS / GCP    │
                └──────┬───────┘
                       │
               Asset Discovery
                       │
                ┌──────▼──────┐
                │ Normalizer  │
                └──────┬──────┘
                       │
              ┌────────▼────────┐
              │ Correlation API │
              └────────┬────────┘
                       │
          ┌────────────▼────────────┐
          │ Neo4j Attack Graph DB   │
          └────────────┬────────────┘
                       │
               Risk & Findings
                       │
                React Visualization
```

---

# Tech Stack

## Frontend

- React
- React Flow
- TailwindCSS
- Framer Motion

## Backend

- Go (Golang)
- Neo4j
- PostgreSQL

## Cloud & Security

- AWS SDK
- GCP APIs
- Falco
- Docker
- ECS / EC2 / IAM / S3

---

# Key Concepts

| Concept                | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| Attack Path            | Visual chain of compromise                           |
| Correlator             | Links multiple findings into a single risk narrative |
| Blast Radius           | Scope of potential impact                            |
| Runtime Detection      | Falco-based suspicious activity detection            |
| Sensitive Data Mapping | Tracks access paths to critical assets               |

---

# Future Enhancements

- Kubernetes attack graphs
- Real-time event streaming
- Terraform drift analysis
- AI-assisted remediation
- Multi-cloud runtime correlation
- Advanced compliance mapping
