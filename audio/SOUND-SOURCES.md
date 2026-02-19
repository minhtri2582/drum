# Hướng dẫn tải bộ sound trống miễn phí cho Drum Machine

Website drum machine sử dụng file WAV trong thư mục `audio/{tên-bộ}/` với tên chuẩn (xem [README.md](README.md)).

---

## 1️⃣ LABS Drums (Spitfire Audio)

**Đặc điểm:** Sound jazz brush mộc, vintage. Phù hợp ballad, lo-fi jazz.

**Lưu ý:** LABS đã chuyển sang **Splice INSTRUMENT**. Pack "Jazz Brushes" riêng có thể không còn; LABS có pack **Drums** chung (324.9 MB).

### Cách tải
- **Website:** [splice.com/instrument](https://splice.com/instrument) hoặc [labs.spitfireaudio.com](https://labs.spitfireaudio.com)
- Tạo tài khoản Splice (miễn phí)
- Tải plugin Splice INSTRUMENT (VST3, AU, AAX)
- Cài đặt và mở app → chọn pack Drums (hoặc tìm pack jazz/brushes nếu có)

### Dùng cho website
LABS là **plugin VST/AU**, không phải file WAV. Để lấy samples cho web:
1. Mở DAW (Reaper, FL Studio, Logic, v.v.)
2. Load plugin LABS/Splice INSTRUMENT
3. Trigger từng tiếng trống (kick, snare, hi-hat, ride, crash, tom)
4. Export mỗi tiếng thành file WAV
5. Đổi tên theo chuẩn và copy vào `audio/jazz-brushes/`

---

## 2️⃣ MT Power Drum Kit 2 (Manda Audio)

**Đặc điểm:** Có preset jazz, dễ dùng, nhẹ máy. Hơi modern hơn jazz truyền thống.

### Cách tải
- **Website chính thức:** [powerdrumkit.com](https://www.powerdrumkit.com/)
- Tải full version miễn phí (VST, AU, AAX)
- Hỗ trợ: Windows 7+, macOS 10.5+ (Intel & Apple Silicon), Linux

### Dùng cho website
Tương tự LABS – đây là **plugin**, không phải WAV:
1. Load MT Power Drum Kit trong DAW
2. Chọn preset jazz (nếu có)
3. Ghi từng hit (kick, snare, hi-hat, ride, crash, tom)
4. Export WAV → đổi tên theo chuẩn → copy vào `audio/mt-power-jazz/`

---

## 3️⃣ DrumGizmo + DRSKit (Open-source) ⭐ Khuyến nghị

**Đặc điểm:** Multi-sample acoustic drum, có kit jazz (DRSKit). Dễ lấy file WAV trực tiếp.

### Cách tải DrumGizmo
- **Linux:** `apt install drumgizmo` (Ubuntu/Debian)
- **Source/Binary:** [drumgizmo.org/wiki/getting_drumgizmo](https://drumgizmo.org/wiki/doku.php?id=getting_drumgizmo)

### Cách tải DRSKit (Jazz/Rock kit)
- **Link trực tiếp:** [DRSKit 2.1 ZIP](https://drumgizmo.org/kits/DRSKit/DRSKit2_1.zip) (~754 MB)
- **Giấy phép:** CC-BY-4.0 (ghi công khi dùng trong sản phẩm)

### Dùng cho website
DRSKit chứa **file WAV gốc** trong thư mục kit. Sau khi giải nén:
1. Mở thư mục DRSKit
2. Tìm file WAV tương ứng: kick, snare, hi-hat, ride, crash, tom
3. Chọn 1 sample đại diện cho mỗi nhạc cụ (hoặc mix nếu cần)
4. Copy/convert sang tên chuẩn:
   - `kick-01.wav`, `snare-02.wav`, `snare-03.wav`
   - `hihat-closed.wav`, `hihat-open.wav`
   - `tom-02.wav`, `tom-03.wav`
   - `crash-02.wav`, `ride-02.wav`
   - `cowbell.wav` (có thể dùng từ bộ standard nếu DRSKit không có)

### SFZ port (thay thế)
- [SFZ DRS Kit](https://sfzinstruments.github.io/drums/drs_kit/) – port sang SFZ, dùng FLAC
- Có thể dùng tool chuyển FLAC → WAV nếu cần

---

## Mapping tên file cho website

| File cần có      | Nhạc cụ              |
|------------------|----------------------|
| `kick-01.wav`    | Trống bass           |
| `snare-02.wav`   | Snare rimshot        |
| `snare-03.wav`   | Snare chính          |
| `hihat-closed.wav` | Hi-hat đóng        |
| `hihat-open.wav` | Hi-hat mở            |
| `tom-02.wav`     | Tom cao/giữa         |
| `tom-03.wav`     | Floor tom            |
| `crash-02.wav`   | Crash cymbal         |
| `ride-02.wav`    | Ride cymbal          |
| `cowbell.wav`    | Cowbell (tùy chọn)   |

---

## Thêm bộ tiếng mới vào website

1. Tạo thư mục: `audio/{tên-bộ}/` (vd: `audio/drskit-jazz/`)
2. Đặt các file WAV đã đổi tên vào thư mục
3. Thêm tên bộ vào `audio/sets.json`:
   ```json
   ["standard", "pearl-master", "drskit-jazz"]
   ```
4. Reload trang → chọn bộ tiếng mới trong dropdown "Bộ tiếng"

---

## Tóm tắt nhanh

| Nguồn              | Loại      | Lấy WAV trực tiếp? | Độ khó |
|--------------------|-----------|--------------------|--------|
| LABS / Splice      | Plugin    | Không – cần DAW    | Trung bình |
| MT Power Drum Kit  | Plugin    | Không – cần DAW    | Trung bình |
| DrumGizmo DRSKit   | Raw kit   | Có – WAV sẵn       | Dễ     |

**Khuyến nghị:** Bắt đầu với **DrumGizmo DRSKit** vì có file WAV sẵn, chỉ cần map tên và copy vào `audio/`.
