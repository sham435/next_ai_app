# SOC2 & ISO 27001 Control Mapping — Scrape Platform

## SOC2 Trust Service Criteria

### Security
| Requirement | Implementation |
|-------------|---------------|
| Access control | RBAC + IAM + service accounts |
| MFA | Enforced at IdP level |
| Encryption at rest | Cloud-managed encrypted disks |
| Encryption in transit | TLS everywhere (cert-manager) |
| Vulnerability management | Trivy in CI, quarterly pentests |
| Change management | GitOps (ArgoCD), PR approvals |

### Availability
| Requirement | Implementation |
|-------------|---------------|
| Monitoring | Prometheus + Grafana |
| Alerting | Alertmanager → Slack/PagerDuty |
| Incident runbooks | Versioned in Git |
| Backups | Automated CronJobs (6-hour cycle) |
| DR drills | Quarterly restore tests |
| Uptime SLA | 99.5% target |

### Processing Integrity
| Requirement | Implementation |
|-------------|---------------|
| Input validation | class-validator DTOs |
| Idempotent jobs | Unique job IDs in BullMQ |
| Retry strategy | Exponential backoff (3 attempts) |
| Audit trail | Structured JSON logs |

### Confidentiality
| Requirement | Implementation |
|-------------|---------------|
| Secret isolation | Vault/KMS integration |
| Role separation | Namespace isolation, RBAC |
| Log redaction | PII masking in structured logs |

---

## ISO 27001 Technical Controls

| Control | Implementation |
|---------|---------------|
| A.5 Information Security Policies | Versioned policy docs, GitOps enforcement |
| A.6 Organization of InfoSec | Defined SecOps team, escalation plan |
| A.8 Asset Management | Inventory of endpoints, workers, Redis nodes |
| A.9 Access Control | RBAC, least privilege, MFA, service accounts |
| A.10 Cryptography | TLS everywhere, encrypted secrets & storage |
| A.12 Operations Security | CI/CD scans, image scanning, backups, patching |
| A.13 Communications Security | Secure ingress, private networking, mTLS |
| A.14 System Development | Secure coding standards, dependency scanning |
| A.15 Supplier Relationships | Trusted container registries only |
| A.16 Incident Management | Prometheus alerts + PagerDuty, DR runbook |
| A.17 Business Continuity | Multi-region failover, backups, tested restore |
| A.18 Compliance | SOC2 readiness, retention policies, audit logs |

---

## Evidence Collection Schedule

| Artifact | Frequency |
|----------|-----------|
| Deployment logs | Continuous |
| Access logs | Continuous |
| Vulnerability scan reports | Weekly |
| Backup verification logs | Every 6 hours |
| Incident reports | Per incident |
| DR drill results | Quarterly |
| Penetration test reports | Annually |
