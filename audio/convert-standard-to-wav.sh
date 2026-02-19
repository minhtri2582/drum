#!/bin/bash
# Convert MP3 trong audio/standard/ sang WAV với tên chuẩn
# Chuẩn đặt tên (khớp SAMPLE_KEYS trong app.js):
#   kick-01, snare-01, snare-02, snare-03, hihat-closed, hihat-open,
#   tom-01, tom-02, tom-03, crash-01, crash-02, ride-01, ride-02, cowbell

set -e
cd "$(dirname "$0")/standard"

convert() {
  local src=$1
  local dst=$2
  if [[ -f "$src" ]]; then
    echo "Converting $src -> $dst"
    ffmpeg -y -i "$src" -acodec pcm_s16le -ar 44100 "$dst" 2>/dev/null
  else
    echo "Skip (not found): $src"
  fi
}

# Mapping: file nguồn -> tên chuẩn
convert "bass.mp3"        "kick-01.wav"
convert "snare-drum.mp3"  "snare-01.wav"
convert "snare-stick.mp3" "snare-02.wav"
[[ -f snare-01.wav ]] && cp snare-01.wav snare-03.wav  # chuẩn dùng snare-03
convert "hihat.mp3"       "hihat-closed.wav"
convert "hihat-open.mp3"  "hihat-open.wav"
convert "hihat-foot.mp3"  "hihat-foot.wav"
convert "tom1.mp3"        "tom-01.wav"
convert "tom2.mp3"        "tom-02.wav"
convert "floor-tom.mp3"   "tom-03.wav"
convert "ride.mp3"        "ride-01.wav"
[[ -f ride-01.wav ]] && cp ride-01.wav ride-02.wav && cp ride-01.wav crash-01.wav && cp ride-01.wav crash-02.wav
convert "cowbell.mp3"     "cowbell.wav"

echo "Done. Xóa file .mp3 gốc nếu muốn: rm audio/standard/*.mp3"
