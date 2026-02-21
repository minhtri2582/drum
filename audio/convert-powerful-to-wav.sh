#!/bin/bash
# Convert MP3 trong audio/powerful/ sang WAV với tên chuẩn
# Nguồn: https://www.musicca.com/files/audio/tools/drums/powerful
# Chuẩn đặt tên (khớp SAMPLE_KEYS trong app.js)

set -e
cd "$(dirname "$0")/powerful"

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

# Mapping: file nguồn musicca powerful -> tên chuẩn
convert "bass.mp3"         "kick-01.wav"
convert "snare-drum.mp3"   "snare-03.wav"
convert "snare-stick.mp3"  "snare-02.wav"
convert "hihat.mp3"        "hihat-closed.wav"
convert "hihat-open.mp3"   "hihat-open.wav"
convert "tom1.mp3"         "tom-02.wav"
convert "floor-tom.mp3"    "tom-03.wav"
convert "ride.mp3"         "ride-02.wav"
[[ -f ride-02.wav ]] && cp ride-02.wav crash-02.wav

echo "Done. Cowbell not in musicca powerful set - app will use synthesis fallback."
