# Trống điện tử online - Drum Machine

Công cụ trống điện tử trực tuyến để tạo, lưu và chỉnh sửa điệu trống dễ dàng.

## Tính năng

- **Sequencer 16 bước** với 7 nhạc cụ: Bàn đạp hi-hat, Tom-tom, Chân tom sàn, Cymbal, Hi-hat, Trống Snare, Trống bass
- **Phát nhạc** với điều chỉnh BPM (40–240)
- **Lưu & chia sẻ** bằng cách sao chép link (pattern được mã hóa trong URL)
- **Nhịp điệu mẫu**: Basic Rock, Funk, Hip Hop, House, Disco
- **Tắt âm** từng nhạc cụ bằng cách nhấp vào tên nhạc cụ
- **Âm thanh** tổng hợp bằng Web Audio API (không cần file âm thanh)

## Chạy local

```bash
cd drum
python3 -m http.server 8765
```

Mở trình duyệt tại: http://localhost:8765

## Docker

```bash
docker build -t drum-machine:latest .
docker run -p 8080:80 drum-machine:latest
```

## Deploy K3s (Helm)

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
│   └── presets.yaml  # Nhịp điệu mẫu (Basic Rock, Funk, Hip Hop, House, Disco...)
└── README.md       # Hướng dẫn
```

## Thêm nhịp điệu mẫu

Chỉnh sửa `styles/presets.yaml` hoặc dùng nút "Lưu nhịp hiện tại" trong modal Điệu mẫu để tải file YAML, sau đó thêm nội dung vào `presets.yaml`.

## Tham khảo

- Giao diện tham khảo [Musicca Drum Machine](https://www.musicca.com/vi/trong-dien-tu)
