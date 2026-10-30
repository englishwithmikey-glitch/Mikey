# Chạy bản sửa trên máy của bạn

1. Dừng web cũ trong terminal bằng Ctrl+C.
2. Giải nén bản ZIP vào thư mục mới để giữ lại bản cũ.
3. Mở terminal trong thư mục có package.json và chạy:

```sh
npx --yes bun@1.4.4 install --frozen-lockfile
npm run dev
```

4. Mở http://localhost:3000 và đăng nhập.

Nếu dự án cũ có .env.local riêng, giữ lại cấu hình đó và đặt vào thư mục mới. ZIP không chứa file môi trường riêng hay thông tin đăng nhập.

## Kiểm tra tiến độ sau khi cập nhật

- Hoàn thành Lesson 1 và chờ thông báo tiến độ đã lưu vào tài khoản.
- Tải lại trang, mở hồ sơ để xem XP.
- Hoàn thành lại cùng bài rồi tải lại trang: XP không tăng thêm.
- Đăng nhập trên trình duyệt khác để kiểm tra đồng bộ tài khoản.
- Nếu thông báo lỗi quyền xuất hiện, gửi nội dung lỗi; không cần tắt RLS.

Bản sửa lưu tiến độ hoàn thành bài; chưa lưu vị trí từng câu để tiếp tục giữa bài. XP của tài khoản thật được tính từ điểm bài đã hoàn thành, theo quy tắc hiện có: điểm 100 tương ứng 100 XP. Học lại không tăng XP hoặc đổi ngày hoàn thành cũ.

Kiểm tra kỹ thuật: npm test, npm run lint, npm run build.
Các test dùng Supabase giả lập; việc ghi dữ liệu bằng tài khoản thật cần được kiểm chứng trên web đã cập nhật.
