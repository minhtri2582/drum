# Chuẩn bị deploy – PostgreSQL & Secrets

Hướng dẫn tạo PostgreSQL và Secret trước khi deploy Drum Machine lên K3S.

**Domain:** drum.doleminhtri.com

---

## 1. Tạo namespace

```bash
kubectl create namespace drum-machine
```

---

## 2. Deploy PostgreSQL

### 2.1. Thêm Helm repo

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### 2.2. Tạo password và cài PostgreSQL

```bash
# Tạo password (32 ký tự, an toàn cho URL)
export PG_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
echo "Lưu password: $PG_PASSWORD"

# Cài PostgreSQL
helm install drum-db bitnami/postgresql \
  -n drum-machine \
  --set auth.username=drum \
  --set auth.password="${PG_PASSWORD}" \
  --set auth.database=drum \
  --set primary.persistence.size=1Gi
```

### 2.3. Kiểm tra

```bash
kubectl get pods -n drum-machine -l app.kubernetes.io/name=postgresql
```

Đợi pod `drum-db-postgresql-0` ở trạng thái `Running`.

---

## 3. Tạo Secret cho ứng dụng

Lấy giá trị từ `server/.env` cho `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`.

### Cách 1: Dùng biến `$PG_PASSWORD` (cùng session)

```bash
kubectl create secret generic drum-machine-secrets \
  -n drum-machine \
  --from-literal=DATABASE_URL="postgresql://drum:${PG_PASSWORD}@drum-db-postgresql:5432/drum" \
  --from-literal=GOOGLE_CLIENT_ID='<từ server/.env>' \
  --from-literal=GOOGLE_CLIENT_SECRET='<từ server/.env>' \
  --from-literal=JWT_SECRET='<từ server/.env, ít nhất 32 ký tự>' \
  --from-literal=GOOGLE_CALLBACK_URL='https://drum.doleminhtri.com/api/auth/google/callback' \
  --from-literal=FRONTEND_URL='https://drum.doleminhtri.com'
```

### Cách 2: Nhập trực tiếp (không dùng `$PG_PASSWORD`)

```bash
kubectl create secret generic drum-machine-secrets \
  -n drum-machine \
  --from-literal=DATABASE_URL='postgresql://drum:THAY_PASSWORD_PG@drum-db-postgresql:5432/drum' \
  --from-literal=GOOGLE_CLIENT_ID='<từ server/.env>' \
  --from-literal=GOOGLE_CLIENT_SECRET='<từ server/.env>' \
  --from-literal=JWT_SECRET='<từ server/.env>' \
  --from-literal=GOOGLE_CALLBACK_URL='https://drum.doleminhtri.com/api/auth/google/callback' \
  --from-literal=FRONTEND_URL='https://drum.doleminhtri.com'
```

### Cách 3: Tạo từ file `server/.env`

Cập nhật `server/.env` trước:
- `DATABASE_URL=postgresql://drum:PASSWORD@drum-db-postgresql:5432/drum`
- `GOOGLE_CALLBACK_URL=https://drum.doleminhtri.com/api/auth/google/callback`
- `FRONTEND_URL=https://drum.doleminhtri.com`

```bash
cd drum/server
kubectl create secret generic drum-machine-secrets -n drum-machine --from-env-file=.env
```

### Cập nhật Secret (khi đã tạo rồi)

```bash
kubectl delete secret drum-machine-secrets -n drum-machine
# Sau đó chạy lại lệnh create secret
```

---

## 4. Kiểm tra

```bash
kubectl get secret drum-machine-secrets -n drum-machine
# Không xem được value – chỉ kiểm tra secret tồn tại
```

---

## Checklist

- [ ] Namespace `drum-machine` đã tạo
- [ ] PostgreSQL đã chạy (`drum-db-postgresql-0` Running)
- [ ] Secret `drum-machine-secrets` đã tạo với đủ 6 key
- [ ] Google OAuth đã cấu hình redirect URI: `https://drum.doleminhtri.com/api/auth/google/callback`

---

## Tiếp theo

Xem [DEPLOY-K3S.md](DEPLOY-K3S.md) để build image và deploy với Helm.
