# Bộ tiếng (Sound sets)

Mỗi thư mục trong `audio/` là một bộ tiếng. Chọn bộ tiếng trong UI sẽ load samples từ thư mục tương ứng.

## Chuẩn đặt tên file (WAV)

| File | Nhạc cụ |
|------|---------|
| `kick-01.wav` | Trống bass |
| `snare-01.wav` | Snare (chính) |
| `snare-02.wav` | Snare rimshot / sidestick |
| `snare-03.wav` | Snare (biến thể) |
| `hihat-closed.wav` | Hi-hat đóng |
| `hihat-open.wav` | Hi-hat mở |
| `tom-01.wav` | Tom cao |
| `tom-02.wav` | Tom giữa |
| `tom-03.wav` | Tom thấp / floor tom |
| `crash-01.wav` | Cymbal crash |
| `crash-02.wav` | Cymbal crash (biến thể) |
| `ride-01.wav` | Ride |
| `ride-02.wav` | Ride (biến thể) |
| `cowbell.wav` | Cowbell |

## Convert MP3 → WAV

```bash
./audio/convert-standard-to-wav.sh
```

Script chuyển MP3 trong `audio/standard/` sang WAV với tên chuẩn. Chỉnh mapping trong script nếu file nguồn khác.
