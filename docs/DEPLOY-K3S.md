# Hướng dẫn deploy Drum Machine lên K3S

Domain: **drum.doleminhtri.com**

> **Chuẩn bị trước:** Nếu chưa có PostgreSQL và Secret, xem [PREPARE-DEPLOY.md](PREPARE-DEPLOY.md).

---

## Bước 1: Tạo namespace

```bash
kubectl create namespace drum-machine
```

---

## Bước 2: Deploy PostgreSQL

Xem [PREPARE-DEPLOY.md](PREPARE-DEPLOY.md) Bước 2.

---

## Bước 3: Tạo Secret

Xem [PREPARE-DEPLOY.md](PREPARE-DEPLOY.md) Bước 3.

---

## Bước 4: Build và deploy ứng dụng

```bash
cd drum

# Build image
docker build -t minhtri2582/drum-machine:latest .

# Push image
docker push minhtri2582/drum-machine:latest

# Deploy với Helm
helm upgrade --install drum-machine ./helm/drum-machine \
  -f ./helm/drum-machine/values-k3s-elisoft.yaml \
  -n drum-machine
```

---

## Bước 5: Kiểm tra

```bash
kubectl get pods -n drum-machine
kubectl logs -f deployment/drum-machine -n drum-machine
kubectl get ingress -n drum-machine
```

Truy cập: https://drum.doleminhtri.com

---

## Checklist

- [ ] Namespace `drum-machine` đã tạo
- [ ] PostgreSQL đã chạy
- [ ] Secret `drum-machine-secrets` đã tạo
- [ ] Google OAuth redirect URI: `https://drum.doleminhtri.com/api/auth/google/callback`
- [ ] DNS đã trỏ `drum.doleminhtri.com`
- [ ] cert-manager và Traefik sẵn sàng
