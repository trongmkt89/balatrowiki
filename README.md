# Balatro Wiki — poker roguelike chơi trên web

Bản web do fan làm, lấy cảm hứng từ Balatro: chơi ngay trên trình duyệt, lưu tiến trình online, không cần tài khoản.

**Chơi ngay:** https://balatrowiki.xmarketing.workers.dev

> A fan-made, browser-playable poker roguelike inspired by Balatro. Next.js on Cloudflare Workers (via OpenNext) with a D1 database. No accounts. Vietnamese and English UI.

## Có gì trong game

- Đủ vòng chơi: 8 Ante (Mù Nhỏ, Mù Lớn, Trùm) và chế độ vô tận sau khi thắng.
- 12 loại tay bài, chấm điểm Chip × Mult có hiệu ứng từng lá.
- 150 Joker (gồm Blueprint, Brainstorm và 5 lá Huyền Thoại), 22 Tarot, 12 Planet, 18 Spectral, 32 Phiếu, 24 Thẻ, 28 Trùm, 15 bộ bài, 8 mức cược.
- Cửa hàng, gói bài, cường hóa, phiên bản (Ánh Kim, Ba Chiều, Đa Sắc, Âm Bản) và dấu.
- Bộ sưu tập kiểu wiki, bảng xếp hạng, thử thách hằng ngày (cùng mã ván cho mọi người).
- Lưu online qua "mã đồng bộ" để chơi tiếp trên máy khác.
- Chơi được trên máy tính, điện thoại dọc và ngang.

Hình ảnh là emoji và CSS tự vẽ, âm thanh tạo bằng Web Audio. Không dùng tài nguyên của game gốc.

## Công nghệ

- Next.js 16.3 (App Router) + React 19, TypeScript
- [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) để chạy trên Cloudflare Workers
- Cloudflare D1 (SQLite) cho bản lưu, hồ sơ người chơi và bảng xếp hạng

> Next.js được giữ ở **16.3.8**: bản 16.4 đọc file `preview-props.json` mà OpenNext 1.20.11 chưa hỗ trợ, khiến mọi request trả lỗi 500 trên Workers.

## Cấu trúc

```
src/game/          Lõi game thuần TypeScript (không phụ thuộc React)
  engine.ts        Vòng đời ván chơi: blind, đánh/bỏ bài, tính tiền, cửa hàng, gói, tag
  scoring.ts       Chấm điểm: thứ tự kích hoạt, kích hoạt lại, Blueprint, hiệu ứng Trùm
  hands.ts         Nhận diện tay bài (Four Fingers, Shortcut, Smeared, Splash…)
  jokers.ts        150 Joker
  consumables.ts   Tarot, Planet, Spectral
  meta.ts          Trùm, phiếu, thẻ, gói bài, bộ bài, mức cược, điểm theo Ante
src/components/    Giao diện (bàn chơi, cửa hàng, bộ sưu tập, bảng xếp hạng)
src/app/api/       API: save, profile, runs, leaderboard (đọc/ghi D1)
migrations/        Schema D1
scripts/           Test chấm điểm và bot giả lập
```

## Chạy ở máy

```bash
npm install
npm run db:migrate:local      # tạo D1 cục bộ
npm run dev                   # http://localhost:3000
```

Chạy thử đúng runtime của Workers:

```bash
npx opennextjs-cloudflare build
npx wrangler dev
```

## Kiểm tra lõi game

```bash
npx esbuild scripts/scoretest.ts --bundle --platform=node --outfile=/tmp/scoretest.cjs && node /tmp/scoretest.cjs
npx esbuild scripts/sim.ts --bundle --platform=node --outfile=/tmp/sim.cjs && node /tmp/sim.cjs 200 cover
```

`scoretest` so điểm của 37 tình huống với kết quả tính tay. `sim` cho bot chơi hàng trăm ván và kiểm tra bất biến; tham số `cover` ép qua vòng để chạy tới chế độ vô tận.

## Deploy lên Cloudflare của bạn

1. `npx wrangler d1 create balatrowiki-db`, rồi chép `database_id` vào `wrangler.jsonc`.
2. `npm run db:migrate:remote`
3. `npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`

## Ghi chú

Dự án fan làm, không liên kết với LocalThunk hay Playstack. "Balatro" là thương hiệu của chủ sở hữu tương ứng.
