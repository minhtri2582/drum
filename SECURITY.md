# Security

> **Quan trọng:** Nếu repo này từng chứa `GOOGLE_CLIENT_SECRET` hoặc `JWT_SECRET` thực trong file đã commit, cần **rotate ngay** các credentials đó (xem mục "Rotate credentials" bên dưới).

## Báo lỗi bảo mật

Nếu phát hiện lỗ hổng bảo mật, vui lòng **không** tạo public issue. Liên hệ trực tiếp qua email hoặc private channel.

## Không commit secrets

**Không bao giờ** commit các giá trị sau vào repository:

- `server/.env` – credentials local
- `server/client_secret*.json` – Google OAuth client secret
- `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, mật khẩu DB trong file config
- Bất kỳ API key, token, mật khẩu nào

Các file này đã được thêm vào `.gitignore`.

## Trước khi publish

1. Kiểm tra không có secret trong code: `git grep -i "GOCSPX-\|password\|secret" -- '*.yaml' '*.md' '*.json'`
2. Đảm bảo `server/.env` và `server/client_secret*.json` không bị track
3. Dùng placeholder (`YOUR_*`, `...`) trong docs và ví dụ

## Rotate credentials nếu đã lộ

Nếu credentials đã vô tình commit hoặc push:

1. **Google OAuth**: Tạo client mới hoặc reset secret trong [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **JWT_SECRET**: Tạo secret mới (32+ ký tự) và cập nhật ở mọi môi trường
3. **PostgreSQL**: Đổi mật khẩu user `drum`
4. Xóa secret khỏi git history nếu cần: `git filter-branch` hoặc [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
