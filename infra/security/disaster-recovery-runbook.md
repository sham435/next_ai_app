# Disaster Recovery Runbook — Scrape Platform

## Severity Levels

| Level | Example | Response Time |
|-------|---------|---------------|
| SEV1 | Redis cluster down, total API outage | < 15 min |
| SEV2 | API crash loop, worker stalled | < 30 min |
| SEV3 | Increased 5xx, degraded performance | < 1 hour |

## RTO / RPO Targets
- **RTO (Recovery Time Objective):** < 15 minutes
- **RPO (Recovery Point Objective):** < 1 minute (Redis AOF)

---

## Incident Response Steps

### 1. Redis Failure

```bash
# Check Redis pod status
kubectl get pods -n scrape-system -l app=redis

# Check Redis logs
kubectl logs -n scrape-system -l app=redis --tail=100

# If pod CrashLoopBackOff:
kubectl delete pod -n scrape-system -l app=redis

# If PVC corruption — restore from backup:
kubectl scale deployment scrape-worker -n scrape-system --replicas=0
kubectl scale deployment scrape-api -n scrape-system --replicas=0
# Restore PVC from latest backup
kubectl scale deployment scrape-api -n scrape-system --replicas=2
kubectl scale deployment scrape-worker -n scrape-system --replicas=3
```

### 2. API Outage

```bash
# Check API pods
kubectl get pods -n scrape-system -l app=scrape-api

# Check API logs
kubectl logs -n scrape-system -l app=scrape-api --tail=100

# Force restart
kubectl rollout restart deployment scrape-api -n scrape-system

# Rollback to previous version
kubectl rollout undo deployment scrape-api -n scrape-system
```

### 3. Worker Stalled

```bash
# Check worker pods
kubectl get pods -n scrape-system -l app=scrape-worker

# Check worker logs
kubectl logs -n scrape-system -l app=scrape-worker --tail=100

# Restart workers
kubectl rollout restart deployment scrape-worker -n scrape-system

# Scale up if queue backlog
kubectl scale deployment scrape-worker -n scrape-system --replicas=10
```

### 4. Region Failover

1. DNS failover activates (Cloudflare/Route53 health checks)
2. ArgoCD syncs manifests to secondary cluster
3. Workers resume processing in secondary region
4. Monitor recovery via Grafana dashboard

---

## Post-Incident

1. Create incident report
2. Update this runbook if needed
3. Add regression test if applicable
4. Schedule post-mortem (within 48 hours)

## Quarterly DR Drill Checklist

- [ ] Simulate Redis failure
- [ ] Verify backup restore works
- [ ] Simulate API outage + auto-recovery
- [ ] Simulate worker failure + job recovery
- [ ] Verify alerting triggers correctly
- [ ] Test DNS failover (if multi-region)
- [ ] Document results and improvements
