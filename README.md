# Tri's Drum Player

Trống điện tử online - Drum Machine. Tạo, chỉnh sửa và phát các điệu trống dễ dàng.

## Tổng quan

Web app Drum Machine (step sequencer) cho phép:

- Tạo và chỉnh sửa pattern trống
- Chọn điệu mẫu có sẵn
- Lưu điệu cá nhân (cần đăng nhập)
- Chia sẻ điệu với người khác
- Xuất/nhập file YAML hoặc MIDI

## Kiến trúc

| Thành phần | Mô tả |
|------------|--------|
| **Frontend** | `index.html`, `app.js`, `styles.css`, `i18n.js` |
| **Backend** | Node.js/Express trong `server/` |
| **Dữ liệu** | Presets YAML (`styles/presets.yaml`), SQLite cho user presets |
| **Âm thanh** | WAV trong `audio/`, Web Audio API (synthesis fallback) |

## Mô hình dữ liệu

### Pattern (Step Sequencer)

- **9 nhạc cụ**: hihatPedal, tom, floorTom, cymbal, ride, cowbell, hihat, snare, kick
- **Số step**: 16–32 tùy time signature (4/4, 3/4, 12/8)
- **Giá trị step**: 0 (tắt), 1 (bình thường), 2 (variant: open hi-hat, rimshot...), 3 (ghost note)
- **Tuplet**: Mỗi step có thể là tuplet 2–6 (object `{ tuplet, hits }`)

### Preset

- `name`, `bpm`, `timeSignature`, `instruments`, `soundSet`, `volumes`

## Chạy ứng dụng

### Development

```bash
# Frontend only (static)
# Mở index.html hoặc dùng static server

# Full stack (với backend)
cd server
npm install
npm start
```

### Docker

```bash
docker-compose up
```

### Kubernetes (Helm)

```bash
helm install drum-machine ./helm/drum-machine -f helm/drum-machine/values-k3s-elisoft.yaml
```

## Chức năng chính

| Chức năng | Mô tả |
|-----------|--------|
| **Điệu mẫu** | Chọn preset từ YAML hoặc server |
| **Chain** | Phát nhiều preset liên tiếp, mỗi preset N ô nhịp |
| **Điệu của tôi** | CRUD presets cá nhân (cần đăng nhập Google) |
| **Random** | Tạo beat ngẫu nhiên theo style (rock, hiphop, latin, house) |
| **Tuplet** | Right-click hoặc long-press step để đặt tuplet 2–6 |
| **Share link** | Pattern encode trong URL `?data=` |
| **Tải xuống/Tải lên** | Xuất/nhập YAML hoặc MIDI |

## Phím tắt

- **Space / Enter** – Play/Stop
- **R** – Random beat
- **M** – Bật/tắt metronome
- **+ / -** – Tăng/giảm BPM 5

## API (Backend)

- `GET /api/me` – Thông tin user
- `GET/POST/PUT/DELETE /api/presets` – CRUD presets
- `GET /api/presets/mine` – Presets của user
- `POST /api/presets/:id/favourite` – Favourite preset
- `POST /api/presets/:id/like` – Like preset
- `POST /api/presets/share` – Share preset cho user
- `GET /api/users/search?q=` – Tìm user để share

## Đa ngôn ngữ

- Tiếng Việt (mặc định)
- English

## Cấu trúc thư mục

```
drum/
├── index.html          # Trang chính
├── app.js              # Logic ứng dụng
├── styles.css          # Giao diện
├── i18n.js             # Đa ngôn ngữ
├── guide.html          # Hướng dẫn
├── server/             # Backend Express
├── styles/presets.yaml # Điệu mẫu
├── audio/              # Sample WAV
├── helm/               # Helm chart K8s
└── .github/workflows/  # CI/CD
```
