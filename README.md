# Chen Shop — bản chạy trên Vercel

Website bán art toy / squishy của Chen Shop: trang chủ, ba danh mục Bean · Figure · Squishy, trang riêng từng sản phẩm, túi hàng + gửi yêu cầu đặt hàng, form tư vấn, nút Zalo và trang quản trị.

- **Công nghệ:** Next.js 16 (App Router), React 19, TypeScript.
- **Cơ sở dữ liệu:** Postgres trên **Neon** (miễn phí).
- **Ảnh tải lên từ trang quản trị:** **Vercel Blob**.
- **Đăng nhập quản trị:** mật khẩu riêng (`ADMIN_PASSWORD`), cookie ký HMAC, khoá 15 phút sau 8 lần nhập sai.

> Bản này được chuyển từ bản ChatGPT Sites / Cloudflare (D1 + R2 + đăng nhập ChatGPT) sang chuẩn Vercel. Dữ liệu 64 mẫu Squishy và toàn bộ ảnh có sẵn được giữ nguyên.

---

## 1. Đưa lên Vercel (khoảng 10 phút)

### Bước 1 — Import dự án
1. Vào <https://vercel.com/new>, chọn repo GitHub chứa thư mục này.
2. Nếu repo có nhiều thư mục, ở **Root Directory** chọn đúng thư mục chứa `package.json` này.
3. Framework: **Next.js** (Vercel tự nhận). Không cần sửa Build Command.

### Bước 2 — Cơ sở dữ liệu Neon
Có 2 cách, chọn **một**:

- **Cách A (bạn đã có Neon):** Settings → Environment Variables → thêm `DATABASE_URL` = chuỗi kết nối Neon (loại *pooled*, có `-pooler` trong tên máy chủ).
- **Cách B:** Project → **Storage** → **Create Database** → **Neon** → Connect. Vercel tự thêm `DATABASE_URL`.

Không cần chạy SQL. Lần truy cập đầu tiên web tự tạo bảng và nạp 64 mẫu Squishy. File `db/schema.sql` chỉ để tham khảo.

### Bước 3 — Kho ảnh Vercel Blob
Project → **Storage** → **Create** → **Blob** → Connect to project.
Vercel tự thêm `BLOB_READ_WRITE_TOKEN`. Thiếu bước này thì trang quản trị **không tải ảnh lên được**.

### Bước 4 — Biến môi trường cho đăng nhập quản trị
Settings → **Environment Variables** (tick Production + Preview):

| Tên biến | Bắt buộc | Giá trị |
|---|---|---|
| `DATABASE_URL` | ✅ | Chuỗi kết nối Neon (Bước 2) |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel tự điền khi tạo Blob (Bước 3) |
| `ADMIN_PASSWORD` | ✅ | Mật khẩu vào `/admin`, **ít nhất 8 ký tự**, tự đặt |
| `ADMIN_SESSION_SECRET` | ✅ | Chuỗi ngẫu nhiên dài ≥ 32 ký tự (cách tạo bên dưới) |
| `NEXT_PUBLIC_SITE_URL` | Nên có | Tên miền chính, ví dụ `https://chenshop.vn` (cho Google/sitemap/ảnh chia sẻ) |
| `SHEETS_WEBHOOK_URL`, `SHEETS_WEBHOOK_SECRET` | Không | Đồng bộ Google Sheet. Đang tạm dừng, để trống |

Tạo `ADMIN_SESSION_SECRET` (chạy trong terminal bất kỳ có Node):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Bước 5 — Deploy
Deployments → **Redeploy** (hoặc push code mới). Xong thì mở:
- `https://<tên-dự-án>.vercel.app/` → cửa hàng
- `https://<tên-dự-án>.vercel.app/admin` → chuyển tới trang đăng nhập, nhập `ADMIN_PASSWORD`

**Mỗi lần sửa biến môi trường phải Redeploy thì mới có hiệu lực.**

---

## 2. Trang quản trị

- Đường dẫn: `/admin` (chưa đăng nhập thì tự chuyển tới `/admin/login`).
- Phiên đăng nhập giữ 7 ngày. Có nút **Đăng xuất** ở góc trên.
- **Đổi mật khẩu:** sửa `ADMIN_PASSWORD` trên Vercel → Redeploy. Mọi thiết bị đang đăng nhập sẽ bị đăng xuất.
- **Sản phẩm:** thêm / sửa / nhân bản / ẩn / xoá, giá, giá gốc, tồn kho, ảnh chính + 2 góc chụp. Ảnh chụp từ điện thoại được tự nén trước khi tải lên.
- **Khách hàng:** các yêu cầu từ form tư vấn, trang sản phẩm và túi hàng. Đánh dấu *Mới / Đã liên hệ / Hoàn tất*, gọi điện, mở Zalo hoặc xoá.
- **Thông tin cửa hàng:** dòng liên hệ và Instagram hiện ở chân trang.

⚠️ **Việc cần làm ngay sau khi lên web:** cả 64 mẫu đang ở trạng thái *Chờ xác nhận tồn kho* (47 mẫu còn *Chờ cập nhật giá*), nên khách chưa thêm được món nào vào túi. Vào `/admin` → tab **Cần hoàn thiện** để nhập giá và số lượng.

---

## 3. Chạy thử trên máy tính

Cần Node.js ≥ 20.9.

```bash
npm install
```

```bash
npm run dev
```

Mở <http://localhost:3000>.

- Không có `DATABASE_URL` → dùng CSDL nhúng lưu ở `.local-data/`, không cần tạo gì trên mạng.
- Không có `BLOB_READ_WRITE_TOKEN` → ảnh tải lên lưu ở `.local-data/uploads/`.
- Không có `ADMIN_PASSWORD` → mật khẩu thử ở máy là `chenshop-dev` (chỉ có tác dụng khi **không** chạy trên Vercel).
- Muốn nối thẳng vào Neon: tạo file `.env.local` (xem mẫu `.env.example`). File này không bị đẩy lên Git.

---

## 4. Sửa nhanh

| Muốn sửa | File |
|---|---|
| Giao diện trang chủ, danh mục, túi hàng | `app/storefront.tsx` |
| Trang sản phẩm | `app/san-pham/[id]/product-page.tsx` |
| Kiểu dáng (màu, cỡ chữ, giao diện điện thoại) | `app/globals.css` |
| Số Zalo | `lib/contact.ts` |
| Form tư vấn | `app/lead-form.tsx`, `app/api/leads/route.ts` |
| Trang quản trị | `app/admin/` |
| Đăng nhập | `lib/auth.ts`, `app/admin/login/` |
| Cấu trúc CSDL | `lib/schema.ts` |
| Danh mục, định dạng tiền | `lib/catalog.ts` |
| 64 mẫu khởi tạo (chỉ nạp **một lần**) | `data/squishy-import.json` |

Ảnh có sẵn nằm trong `public/products` (ảnh gốc) và `public/studio` (ảnh nền studio). `data/studio-images.json` ghép ảnh gốc với ảnh studio.

---

## 5. Thay đổi so với bản ChatGPT Sites

- Cloudflare D1 → **Neon Postgres**; R2 → **Vercel Blob**; đăng nhập ChatGPT → **mật khẩu quản trị**.
- Thêm trang đăng nhập/đăng xuất, giới hạn số lần nhập sai mật khẩu.
- Túi hàng có nút **Gửi yêu cầu đặt hàng** (trước đây chỉ sao chép danh sách). Yêu cầu vào thẳng mục Khách hàng.
- Trạng thái xử lý và nút xoá cho yêu cầu khách hàng.
- SEO: tiêu đề + ảnh chia sẻ riêng cho từng sản phẩm, `sitemap.xml`, `robots.txt` (chặn `/admin`), trang 404.
- Font Be Vietnam Pro / Playfair Display được đóng gói kèm web, đủ bộ chữ tiếng Việt (bản cũ không tải được font, chữ nghiêng tiếng Việt bị lệch dấu).
- Giao diện điện thoại: ô nhập 16px để iPhone không tự phóng to, bảng quản trị chuyển thành thẻ, header không còn lối vào quản trị (vẫn có ở chân trang).
