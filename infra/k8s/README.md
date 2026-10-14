# EventPass Production Kubernetes Deployment Guide

This directory contains production-ready Kubernetes manifests for the complete distributed **EventPass Microservices Platform**, organized for deployment using **Kustomize** or vanilla `kubectl`.

---

## 1. Architecture in Kubernetes

```
                  [ Ingress Controller (Nginx) ]
                                |
             +------------------+------------------+
             |                                     |
    ( / , /assets )                       ( /api/*, /docs )
             v                                     v
    [ frontend-service ]                  [ api-gateway (3-12 pods) ]
     (React 19 / Nginx)                            |
                                 +-----------------+-----------------+
                                 |                 |                 |
                                 v                 v                 v
                         [ auth-service ]  [ event-service ]  [ booking-service ]
                                (x2)              (x2-8)           (x2-10)
                                 |                 |                 |
                                 v                 v                 v
                         [ MySQL StatefulSet ] [ RabbitMQ Broker ] [ notification-service ]
                             (4 Logical DBs)        (AMQP 5672)             (x2)
```

---

## 2. Resource Layout

| File | Resource Kind | Description |
|---|---|---|
| `00-namespace.yaml` | `Namespace` | Defines the isolated `eventpass` namespace |
| `01-configmap.yaml` | `ConfigMap` | Service DNS URLs, RabbitMQ queues, SMTP endpoints |
| `02-secrets.yaml` | `Secret` | MySQL credentials, JWT secret keys, RabbitMQ passwords |
| `10-mysql-statefulset.yaml` | `StatefulSet` + `Service` | MySQL 8.0 with PersistentVolumeClaim (`10Gi`) |
| `11-rabbitmq-deployment.yaml` | `Deployment` + `Service` | RabbitMQ 3.13 management broker with health probes |
| `20-auth-service.yaml` | `Deployment` + `Service` | Argon2id Auth Service (port `8001`) |
| `21-event-service.yaml` | `Deployment` + `Service` | Event Catalog & Inventory Service (port `8002`) |
| `22-booking-service.yaml` | `Deployment` + `Service` | Booking & SAGA Orchestrator Service (port `8003`) |
| `23-notification-service.yaml` | `Deployment` + `Service` | AMQP Consumer & Email Service (port `8004`) |
| `30-api-gateway.yaml` | `Deployment` + `Service` | Reverse Proxy & Routing API Gateway (port `8000`) |
| `31-frontend.yaml` | `Deployment` + `Service` | Production React SPA served via Nginx (port `80`) |
| `40-ingress.yaml` | `Ingress` | Nginx Ingress with path-based routing & CORS headers |
| `50-hpa.yaml` | `HorizontalPodAutoscaler` | Auto-scaling policies for Gateway, Booking, and Event services |
| `kustomization.yaml` | `Kustomization` | Bundles all resources for one-command apply |

---

## 3. Quick-Start Deployment

### A. Deploy with Kustomize (Recommended)
```bash
kubectl apply -k infra/k8s
```

### B. Deploy Manifests Sequentially
```bash
# 1. Namespace & Configurations
kubectl apply -f infra/k8s/00-namespace.yaml
kubectl apply -f infra/k8s/01-configmap.yaml
kubectl apply -f infra/k8s/02-secrets.yaml

# 2. Stateful Data Infrastructure
kubectl apply -f infra/k8s/10-mysql-statefulset.yaml
kubectl apply -f infra/k8s/11-rabbitmq-deployment.yaml

# 3. Microservices
kubectl apply -f infra/k8s/20-auth-service.yaml
kubectl apply -f infra/k8s/21-event-service.yaml
kubectl apply -f infra/k8s/22-booking-service.yaml
kubectl apply -f infra/k8s/23-notification-service.yaml

# 4. Gateway & Frontend
kubectl apply -f infra/k8s/30-api-gateway.yaml
kubectl apply -f infra/k8s/31-frontend.yaml

# 5. Routing & Auto-scaling
kubectl apply -f infra/k8s/40-ingress.yaml
kubectl apply -f infra/k8s/50-hpa.yaml
```

---

## 4. Verifying Cluster Status

```bash
# Check all running pods in the eventpass namespace
kubectl get pods -n eventpass -o wide

# Check services and endpoints
kubectl get svc -n eventpass

# Check ingress status
kubectl get ingress -n eventpass

# Check auto-scalers
kubectl get hpa -n eventpass
```

---

## 5. Local Ingress Testing (`minikube` / `kind`)

Add the following entry to your `/etc/hosts` (Linux/macOS) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
```text
127.0.0.1  eventpass.local
```

Access the application in your browser:
- Customer UI: `http://eventpass.local/`
- API Gateway Documentation: `http://eventpass.local/docs`
- Direct API: `http://eventpass.local/api/v1/events`
