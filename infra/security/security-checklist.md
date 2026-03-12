# Security Hardening Checklist — Scrape Platform

## Cluster Security
- [ ] RBAC with least privilege per service account
- [ ] Pod Security Standards enforced (restricted)
- [ ] Network policies: default deny + explicit allow
- [ ] Resource quotas and limit ranges set
- [ ] No cluster-admin bindings for workloads
- [ ] Service accounts per component (not default)

## Container Security
- [ ] Multi-stage Docker builds (minimal final image)
- [ ] Non-root user in all containers
- [ ] Read-only root filesystem where possible
- [ ] All Linux capabilities dropped
- [ ] Image scanning in CI (Trivy)
- [ ] No `latest` tag in production
- [ ] Image digest pinning for critical images

## Application Security
- [ ] Input validation (class-validator DTOs)
- [ ] HTTPS-only scraping (SSRF protection)
- [ ] Private IP blocking (10.x, 172.16.x, 192.168.x)
- [ ] Rate limiting (10 req/min per IP)
- [ ] Helmet.js headers enabled
- [ ] CORS locked to frontend domain
- [ ] JWT auth with short expiry (if applicable)
- [ ] Request body size limits
- [ ] Timeout enforcement on all external calls

## Secrets Management
- [ ] No secrets in Git (use Vault/KMS)
- [ ] Kubernetes secrets via external-secrets or sealed-secrets
- [ ] Automatic rotation schedule
- [ ] Audit log for secret access

## CI/CD Security
- [ ] Protected branches (main, develop)
- [ ] PR approval requirements
- [ ] Dependency scanning (npm audit)
- [ ] Container scanning (Trivy)
- [ ] Secret scanning
- [ ] Signed commits (optional but recommended)
- [ ] No plaintext secrets in pipelines

## Monitoring & Incident Response
- [ ] Prometheus alerting configured
- [ ] Alertmanager routing to Slack/PagerDuty
- [ ] Structured JSON logging
- [ ] Centralized log aggregation (Loki/ELK)
- [ ] OpenTelemetry tracing enabled
- [ ] Grafana dashboards for all services
- [ ] DR runbook documented and tested

## Compliance
- [ ] Audit logs retained (1 year minimum)
- [ ] Log tampering protection (immutable storage)
- [ ] Data retention policies defined
- [ ] Quarterly penetration testing
- [ ] Annual DR drill
- [ ] SOC2 control mapping documented
- [ ] ISO 27001 controls mapped
