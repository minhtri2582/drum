# Trống điện tử online - Drum Machine

Công cụ trống điện tử trực tuyến để tạo, lưu và chỉnh sửa điệu trống dễ dàng.

## Tính năng

- **Sequencer 16 bước** với 7 nhạc cụ: Bàn đạp hi-hat, Tom-tom, Chân tom sàn, Cymbal, Hi-hat, Trống Snare, Trống bass
- **Phát nhạc** với điều chỉnh BPM (40–240)
- **Lưu & chia sẻ** bằng cách sao chép link (pattern được mã hóa trong URL)
- **Đăng nhập Google** – lưu preset riêng tư trên server
- **Preset server** – anonymous và login: dùng preset công khai; login: dùng thêm preset riêng
- **Nhịp điệu mẫu**: Basic Rock, Funk, Hip Hop, House, Disco
- **Tắt âm** từng nhạc cụ bằng cách nhấp vào tên nhạc cụ
- **Âm thanh** tổng hợp bằng Web Audio API (không cần file âm thanh)

## Chạy local

**Chỉ frontend (không có auth/preset server):**
```bash
cd drum
python3 -m http.server 8765
```
Mở: http://localhost:8765

**Full stack (PostgreSQL + Google OAuth):**
```bash
# 1. Cấu hình: copy server/.env.example -> server/.env
#    Điền GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, DATABASE_URL

# 2. Chạy với docker-compose
docker-compose up -d

# 3. Hoặc chạy thủ công (cần PostgreSQL):
cd server && npm install && npm start
```

## Docker

```bash
docker build -t minhtri2582/drum-machine:latest .
docker run -p 8080:80 drum-machine:latest
```

**Lưu ý:** Cần cấu hình `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `GOOGLE_CALLBACK_URL` khi deploy.

### Lỗi redirect_uri_mismatch

1. Mở [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Chọn OAuth 2.0 Client ID (loại **Web application**)
3. Trong **Authorized redirect URIs**, thêm **chính xác**:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
4. Trong **Authorized JavaScript origins**, thêm: `http://localhost:3000` (hoặc domain production)
5. Lưu và đợi vài phút để Google cập nhật

## Deploy K3s (Helm)

- **Chuẩn bị** (PostgreSQL + Secrets): [docs/PREPARE-DEPLOY.md](docs/PREPARE-DEPLOY.md)
- **Deploy đầy đủ**: [docs/DEPLOY-K3S.md](docs/DEPLOY-K3S.md)

```bash
# Build và push image
docker build -t minhtri2582/drum-machine:latest .
docker push minhtri2582/drum-machine:latest

# Deploy với Helm
helm upgrade --install drum-machine ./helm/drum-machine \
  -f ./helm/drum-machine/values-k3s-elisoft.yaml \
  -n drum-machine --create-namespace
```

## Cách sử dụng

1. **Tạo điệu trống**: Nhấp vào các ô vuông để bật/tắt beat
2. **Phát**: Nhấn nút Play (▶)
3. **Lưu**: Nhấn "Sao chép link để lưu" và dán link vào bookmark hoặc gửi cho người khác
4. **Chọn mẫu**: Nhấn "Nhịp điệu" để chọn nhịp có sẵn
5. **Xóa**: Nhấn "Xoá" để reset pattern

## Cấu trúc file

```
drum/
├── index.html      # Giao diện chính
├── styles.css      # CSS
├── app.js          # Logic drum machine
├── styles/
│   └── presets.yaml  # Nhịp điệu mẫu (fallback khi không có server)
├── server/         # Backend API
│   ├── index.js    # Express server
│   ├── auth.js     # Google OAuth + JWT
│   ├── db.js       # PostgreSQL
│   └── routes/     # API routes
├── docker-compose.yaml
└── README.md
```

## Thêm nhịp điệu mẫu

Chỉnh sửa `styles/presets.yaml` hoặc dùng nút "Lưu nhịp hiện tại" trong modal Điệu mẫu để tải file YAML, sau đó thêm nội dung vào `presets.yaml`.

## Tham khảo

- Giao diện tham khảo [Musicca Drum Machine](https://www.musicca.com/vi/trong-dien-tu)
