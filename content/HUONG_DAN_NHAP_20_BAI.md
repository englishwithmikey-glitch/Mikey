# Thêm 20 bài A1 hàng loạt

Gói này thêm 20 bài, từ Lesson 3 đến Lesson 22, mỗi bài 10 câu (200 câu Anh–Việt). Đây là bài luyện nghe/đọc/nhắc lại theo chủ đề, không phải 20 kiểu bài tập tương tác mới.

## Nhập trên Supabase

1. Mở file `content/import-a1-topics-20.sql` trên GitHub, bấm **Raw**.
2. Nhấn **⌘ + A**, rồi **⌘ + C** để sao chép toàn bộ nội dung SQL.
3. Mở Supabase của dự án → SQL Editor → tab mới → dán và bấm **Run** một lần.
4. Kết quả cuối phải có **20 dòng**, mỗi dòng có `sentence_count = 10`, trạng thái `Draft`.
5. Quay lại web → Góc Giáo Viên → Làm Mới → Quản Lý Bài Học để xem bài mới.

Không cần tải lại mã nguồn hay dừng Terminal: đây là dữ liệu trong Supabase. Gói không sửa hai bài hiện có, không xóa dữ liệu và không đổi quyền RLS. Chạy lại sẽ bỏ qua các bài đã nhập từ gói, giữ nguyên chỉnh sửa và trạng thái của giáo viên. Nếu trùng tiêu đề với bài không thuộc gói, toàn bộ lần nhập dừng và hoàn tác.

Draft là nhãn trạng thái nội dung. Chính sách RLS hiện có vẫn quyết định quyền đọc; gói này không giới hạn quyền đọc bản nháp.

## Nội dung

| Bài | Chủ đề | Số câu |
|---|---|---|
| 3 | Gia đình của tôi (My Family) | 10 |
| 4 | Ngôi nhà của tôi (My Home) | 10 |
| 5 | Số đếm và tuổi (Numbers and Age) | 10 |
| 6 | Giờ và các ngày trong tuần (Time and Days) | 10 |
| 7 | Đồ ăn và thức uống (Food and Drinks) | 10 |
| 8 | Tại nhà hàng (At a Restaurant) | 10 |
| 9 | Mua sắm và giá cả (Shopping and Prices) | 10 |
| 10 | Quần áo và màu sắc (Clothes and Colours) | 10 |
| 11 | Hỏi đường (Asking for Directions) | 10 |
| 12 | Đi lại trong thành phố (Getting Around Town) | 10 |
| 13 | Thời tiết (The Weather) | 10 |
| 14 | Sở thích và thời gian rảnh (Hobbies and Free Time) | 10 |
| 15 | Nghề nghiệp và nơi làm việc (Jobs and Workplaces) | 10 |
| 16 | Trong lớp học (In the Classroom) | 10 |
| 17 | Sức khỏe và cơ thể (Health and the Body) | 10 |
| 18 | Cảm xúc (Feelings and Emotions) | 10 |
| 19 | Kế hoạch cuối tuần (Weekend Plans) | 10 |
| 20 | Giao tiếp khi đi du lịch (Travel Essentials) | 10 |
| 21 | Tại khách sạn (At a Hotel) | 10 |
| 22 | Nhờ giúp đỡ (Asking for Help) | 10 |

## Kiểm tra sau khi nhập

- Đối chiếu 20 bài mới và thứ tự 3–22 trong Góc Giáo Viên.
- Nghe thử câu, xem bản dịch và ghi chú ngữ pháp.
- Đổi từng bài sang Published sau khi xem nội dung.
- Kiểm tra bằng tài khoản học viên trước khi đưa vào sử dụng rộng rãi.

## Tái tạo và kiểm thử SQL

`python3 scripts/build_topic_import.py` tạo lại SQL từ JSON.

SQL đã được thực thi trên PostgreSQL chạy cục bộ qua PGlite, với hai cấu trúc bảng đại diện: đầy đủ và chỉ có order_index. Các ca kiểm tra bao gồm số lượng, thứ tự, giữ dữ liệu cũ, chạy lại sau chỉnh sửa, sai khóa học và hoàn tác khi trùng tiêu đề. Chưa chạy trên Supabase thật.

Chạy lại kiểm thử độc lập (không thêm thư viện vào ứng dụng):

```sh
npm install --prefix /tmp/mikey-sql-check --no-package-lock @electric-sql/pglite
node scripts/test_topic_import.mjs /tmp/mikey-sql-check/node_modules/@electric-sql/pglite/dist/index.js
```
