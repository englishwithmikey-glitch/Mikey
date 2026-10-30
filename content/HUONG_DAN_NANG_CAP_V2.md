# Nâng cấp luyện tập v2

## Có gì mới

- 20 bài theo chủ đề (Lesson 3–22), mỗi bài 30 câu khác nhau: tổng 600 câu.
- Mỗi chủ đề có 3 hội thoại ngắn, tổng 60 hội thoại; Lesson 1 có thêm 3 hội thoại dựa trên tài liệu tham khảo.
- 5 bước: Học → Nghe → Nghe & gõ → Nói → Ôn tập.
- Nghe chậm mặc định 0,5, chọn thêm mức 0,35 hoặc 0,65; nghe tách từng từ có khoảng nghỉ 600ms, dừng khi chuyển câu hoặc nhấn Dừng.
- Luyện hội thoại có hướng dẫn, chọn/đổi vai, ẩn lời của người học và nói tự do.
- IPA Anh–Anh từ tài liệu hoặc được tạo tự động bằng eSpeak NG; UI đánh dấu bản tạo tự động để giáo viên rà soát.
- Micro chỉ bật khi được bấm, tạo bản chép lời, không chấm điểm phát âm. Trình duyệt không hỗ trợ vẫn có thể tự luyện.
- Nội dung hội thoại được tải thành phần riêng khi mở bài, không cần API AI hay tài khoản dịch vụ mới.

## 1. Cập nhật web trên Mac

Trong Terminal đang chạy web, nhấn Control+C. Đảm bảo đang ở thư mục có package.json của Mikey-main.

```sh
curl -fL https://raw.githubusercontent.com/englishwithmikey-glitch/Mikey/main/scripts/update-practice-v2.mjs -o /tmp/mikey-upgrade.mjs
node /tmp/mikey-upgrade.mjs
npm run dev
```

Trình cập nhật chỉ thay 5 file giao diện/dữ liệu, tải toàn bộ file trước, kiểm tra SHA-256 và sao lưu bản cũ trong .mikey-backups. Không sửa .env.local, package.json, bun.lock hoặc dữ liệu Supabase. Nếu đang ở nhầm thư mục hoặc tải lỗi, công cụ dừng trước khi thay file. Nếu lỗi khi ghi, công cụ thử khôi phục các file đã thay.

## 2. Nâng dữ liệu hàng loạt

1. Mở `content/upgrade-a1-practice-v2.sql` trên GitHub và bấm Raw.
2. Sao chép toàn bộ vào tab mới của Supabase SQL Editor rồi bấm Run.
3. Kết quả cuối phải có 20 bài, mỗi bài `sentence_count = 30`.
4. Quay lại web, tải lại trang và mở khóa A1.

Lệnh dùng đúng course 1 Basic Communication A1, tạo gói 20 bài nếu chưa có, hoặc bổ sung 20 câu/bài nếu gói cũ đã được nhập. Toàn bộ thao tác nằm trong một transaction. Chạy lại không thêm câu trùng. Các dòng cũ, ID, audio của giáo viên, trạng thái xuất bản và learning_progress không bị sửa. Nếu phát hiện câu đã được giáo viên đổi nội dung, lệnh dừng toàn bộ để tránh ghi đè hoặc nhân đôi nội dung. Không cần chạy SQL xóa dữ liệu hay thay RLS.

Các bài mới vẫn ở Draft, các bài đã xuất bản giữ trạng thái cũ. Draft chỉ là trạng thái nội dung; chính sách RLS hiện tại vẫn quyết định ai đọc được dữ liệu.

## Phạm vi

- Lesson 1 và Lesson 2 không bị nhập đè. Lesson 1 dùng các câu thật đang có và có thêm bộ hội thoại; không ép 30 câu tham khảo lên ID và tiến độ cũ.
- Bản tham khảo Lesson 1 có 2 câu lặp. Thư viện luyện tập thay 2 mục lặp bằng câu mới, giữ bản gốc trong content/practice/intro-reference.json để đối chiếu.
- Chỉ trạng thái hoàn thành cả bài được lưu lên Supabase như trước. Câu trả lời gõ, bản chép lời, lượt hội thoại và ghi chú chỉ tồn tại trong phiên, không tự động đồng bộ.
- Hoàn thành hội thoại hoặc tự nói xong không được báo là đạt điểm phát âm. XP vẫn theo quy tắc của bài thật đã lưu, không cộng thêm theo mỗi lượt luyện.
- IPA tự động là tài liệu hỗ trợ, chưa được giáo viên xác nhận từng câu. Không tự điền IPA đó đè lên phiên âm cũ của giáo viên.

## Kiểm thử

- `npm test`, `npm run lint`, `npm run build`.
- `node scripts/test_practice_upgrade.mjs /path/to/@electric-sql/pglite/dist/index.js` kiểm tra SQL trên PostgreSQL cục bộ: cài mới, nâng 200→600 câu, thứ tự, chạy lại, giữ ID/audio/trạng thái/tiến độ, hoàn tác khi gặp câu đã chỉnh sửa.
- Chưa thực hiện ghi dữ liệu Supabase thật, thử micro/giọng trên máy người dùng hoặc cập nhật file trên Mac của người dùng.

## Tái tạo nội dung

```sh
python3 scripts/build_practice_pack.py
# Nếu cần tạo IPA cho câu mới: cài công cụ riêng bên ngoài repo,
# chạy node scripts/generate_practice_ipa.mjs /path/to/espeak-ng.js,
# rồi chạy build_practice_pack.py lần nữa.
python3 scripts/build_practice_upgrade.py
```
