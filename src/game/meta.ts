import type { Txt } from "./types";

/* ---------------- Blinds ---------------- */

export interface BossDef {
  key: string;
  name: Txt;
  text: Txt;
  minAnte: number;
  mult: number;
  color: string;
  final?: boolean;
  icon: string;
}

const B = (key: string, en: string, vi: string, minAnte: number, color: string, icon: string, ten: string, tvi: string, extra: Partial<BossDef> = {}): BossDef => ({
  key, name: { en, vi }, text: { en: ten, vi: tvi }, minAnte, mult: 2, color, icon, ...extra,
});

export const BOSSES: BossDef[] = [
  B("hook", "The Hook", "Lưỡi Câu", 1, "#a84024", "🎣", "Discards {a|2} random cards held in hand after every played hand", "Bỏ {a|2} lá ngẫu nhiên trên tay sau mỗi tay bài được chơi"),
  B("ox", "The Ox", "Con Bò", 6, "#b95b08", "🐂", "Playing your {a|most played hand} sets money to {$|$0}", "Chơi {a|tay bài chơi nhiều nhất} sẽ đặt tiền về {$|$0}"),
  B("house", "The House", "Ngôi Nhà", 2, "#5186a8", "🏠", "First hand is drawn {a|face down}", "Tay bài đầu tiên được rút {a|úp mặt}"),
  B("wall", "The Wall", "Bức Tường", 2, "#8a59a5", "🧱", "Extra large blind", "Blind cực lớn", { mult: 4 }),
  B("wheel", "The Wheel", "Bánh Xe", 2, "#50bf7c", "☸️", "{g|1 in 7} cards get drawn {a|face down}", "{g|1/7} số lá được rút {a|úp mặt}"),
  B("arm", "The Arm", "Cánh Tay", 2, "#6865f3", "💪", "Decrease level of played {a|poker hand}", "Giảm cấp {a|tay bài} được chơi"),
  B("club", "The Club", "Cây Gậy", 1, "#b9cb92", "♣", "All {C|Club} cards are debuffed", "Mọi lá {C|Chuồn} bị vô hiệu"),
  B("fish", "The Fish", "Con Cá", 2, "#3e85bd", "🐟", "Cards drawn {a|face down} after each hand played", "Lá rút sau mỗi tay bài đều {a|úp mặt}"),
  B("psychic", "The Psychic", "Nhà Ngoại Cảm", 1, "#efc03c", "🔮", "Must play {a|5} cards", "Phải chơi đủ {a|5} lá"),
  B("goad", "The Goad", "Cây Thúc", 1, "#b95c96", "♠", "All {S|Spade} cards are debuffed", "Mọi lá {S|Bích} bị vô hiệu"),
  B("water", "The Water", "Dòng Nước", 2, "#c6e0eb", "💧", "Start with {a|0} discards", "Bắt đầu với {a|0} lượt bỏ bài"),
  B("window", "The Window", "Ô Cửa", 1, "#a9a295", "♦", "All {D|Diamond} cards are debuffed", "Mọi lá {D|Rô} bị vô hiệu"),
  B("manacle", "The Manacle", "Còng Tay", 1, "#575757", "⛓️", "{m|-1} hand size", "{m|-1} kích thước tay"),
  B("eye", "The Eye", "Con Mắt", 3, "#4b71e4", "👁️", "No repeat hand types this round", "Không được lặp lại loại tay bài trong vòng"),
  B("mouth", "The Mouth", "Cái Miệng", 2, "#ae718e", "👄", "Play only {a|1} hand type this round", "Chỉ được chơi {a|1} loại tay bài trong vòng"),
  B("plant", "The Plant", "Cái Cây", 4, "#709284", "🌿", "All {a|face} cards are debuffed", "Mọi lá {a|mặt người} bị vô hiệu"),
  B("serpent", "The Serpent", "Con Rắn", 5, "#439a4f", "🐍", "After Play or Discard, always draw {a|3} cards", "Sau khi chơi hoặc bỏ bài, luôn chỉ rút {a|3} lá"),
  B("pillar", "The Pillar", "Cột Đá", 1, "#7e6752", "🏛️", "Cards played previously this Ante are debuffed", "Lá đã chơi trong Ante này bị vô hiệu"),
  B("needle", "The Needle", "Cây Kim", 2, "#5c6e31", "📍", "Play only {a|1} hand", "Chỉ được chơi {a|1} tay bài", { mult: 1 }),
  B("head", "The Head", "Cái Đầu", 1, "#ac9db4", "♥", "All {H|Heart} cards are debuffed", "Mọi lá {H|Cơ} bị vô hiệu"),
  B("tooth", "The Tooth", "Cái Răng", 3, "#b52d2d", "🦷", "Lose {$|$1} per card played", "Mất {$|$1} cho mỗi lá được chơi"),
  B("flint", "The Flint", "Đá Lửa", 2, "#e56a2f", "🔥", "Base Chips and Mult are halved", "Chip và Mult gốc bị chia đôi"),
  B("mark", "The Mark", "Dấu Ấn", 2, "#6a3847", "❌", "All {a|face} cards are drawn face down", "Mọi lá {a|mặt người} được rút úp mặt"),
  B("acorn", "Amber Acorn", "Hạt Dẻ Hổ Phách", 8, "#fda200", "🌰", "Flips and shuffles all {a|Joker} cards", "Lật úp và xáo trộn mọi lá {a|Joker}", { final: true }),
  B("leaf", "Verdant Leaf", "Lá Xanh Biếc", 8, "#56a786", "🍃", "All cards debuffed until {a|1} Joker sold", "Mọi lá bị vô hiệu cho tới khi bán {a|1} Joker", { final: true }),
  B("vessel", "Violet Vessel", "Bình Tím", 8, "#8a71e1", "🏺", "Very large blind", "Blind siêu lớn", { final: true, mult: 6 }),
  B("heart", "Crimson Heart", "Trái Tim Đỏ Thắm", 8, "#ac3232", "❤️", "One random {a|Joker} disabled every hand", "Một {a|Joker} ngẫu nhiên bị vô hiệu mỗi tay bài", { final: true }),
  B("bell", "Cerulean Bell", "Chuông Thiên Thanh", 8, "#009cfd", "🔔", "Forces {a|1} card to always be selected", "Luôn bắt buộc chọn {a|1} lá", { final: true }),
];
export const BOSS_MAP: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.key, b]));

export const BLIND_NAMES: Txt[] = [
  { en: "Small Blind", vi: "Mù Nhỏ" },
  { en: "Big Blind", vi: "Mù Lớn" },
  { en: "Boss Blind", vi: "Trùm" },
];

const BASE_AMOUNTS = [
  [300, 800, 2000, 5000, 11000, 20000, 35000, 50000],
  [300, 900, 2600, 8000, 20000, 36000, 60000, 100000],
  [300, 1000, 3200, 9000, 25000, 60000, 110000, 200000],
];

/** Base chip requirement for an ante (Small Blind = 1x). */
export function anteBase(ante: number, stake: number): number {
  const table = BASE_AMOUNTS[stake >= 6 ? 2 : stake >= 3 ? 1 : 0];
  if (ante < 1) return 100;
  if (ante <= 8) return table[ante - 1];
  const a = table[7];
  const b = 1.6;
  const c = ante - 8;
  const d = 1 + 0.2 * c;
  let amount = Math.floor(a * Math.pow(b + Math.pow(0.75 * c, d), c));
  if (!isFinite(amount)) return Number.MAX_VALUE;
  const mag = Math.pow(10, Math.floor(Math.log10(amount)) - 1);
  amount = amount - (amount % mag);
  return amount;
}

/* ---------------- Vouchers ---------------- */

export interface VoucherDef {
  key: string;
  name: Txt;
  text: Txt;
  icon: string;
  requires?: string;
}

const V = (key: string, en: string, vi: string, icon: string, ten: string, tvi: string, requires?: string): VoucherDef => ({
  key, name: { en, vi }, text: { en: ten, vi: tvi }, icon, requires,
});

export const VOUCHERS: VoucherDef[] = [
  V("overstock", "Overstock", "Kho Đầy", "📦", "{a|+1} card slot available in shop", "{a|+1} ô bài trong cửa hàng"),
  V("overstock_plus", "Overstock Plus", "Kho Đầy Plus", "🏬", "{a|+1} card slot available in shop", "{a|+1} ô bài trong cửa hàng", "overstock"),
  V("clearance", "Clearance Sale", "Xả Kho", "🏷️", "All cards and packs in shop are {a|25%} off", "Mọi lá và gói trong cửa hàng giảm {a|25%}"),
  V("liquidation", "Liquidation", "Thanh Lý", "💸", "All cards and packs in shop are {a|50%} off", "Mọi lá và gói trong cửa hàng giảm {a|50%}", "clearance"),
  V("hone", "Hone", "Mài Giũa", "💎", "{a|Foil}, {a|Holographic}, and {a|Polychrome} cards appear {a|2X} more often", "Lá {a|Ánh Kim}, {a|Ba Chiều}, {a|Đa Sắc} xuất hiện nhiều gấp {a|2}"),
  V("glow_up", "Glow Up", "Lột Xác", "✨", "{a|Foil}, {a|Holographic}, and {a|Polychrome} cards appear {a|4X} more often", "Lá {a|Ánh Kim}, {a|Ba Chiều}, {a|Đa Sắc} xuất hiện nhiều gấp {a|4}", "hone"),
  V("reroll_surplus", "Reroll Surplus", "Đổi Mới Dư Dả", "🔄", "Rerolls cost {$|$2} less", "Đổi mới rẻ hơn {$|$2}"),
  V("reroll_glut", "Reroll Glut", "Đổi Mới Tràn Lan", "♻️", "Rerolls cost {$|$2} less", "Đổi mới rẻ hơn {$|$2}", "reroll_surplus"),
  V("crystal_ball", "Crystal Ball", "Quả Cầu Pha Lê", "🔮", "{a|+1} consumable slot", "{a|+1} ô lá tiêu hao"),
  V("omen_globe", "Omen Globe", "Quả Cầu Điềm Báo", "🌐", "{s|Spectral} cards may appear in any of the {t|Arcana Packs}", "Lá {s|Spectral} có thể xuất hiện trong {t|Gói Arcana}", "crystal_ball"),
  V("telescope", "Telescope", "Kính Thiên Văn", "🔭", "{p|Celestial Packs} always contain the {p|Planet} card for your most played {a|poker hand}", "{p|Gói Thiên Văn} luôn có lá {p|Hành Tinh} của {a|tay bài} chơi nhiều nhất"),
  V("observatory", "Observatory", "Đài Thiên Văn", "🌌", "{p|Planet} cards in your {a|consumable} area give {x|X1.5} Mult for their specified {a|poker hand}", "Lá {p|Hành Tinh} trong ô {a|tiêu hao} cho {x|X1.5} Mult với {a|tay bài} tương ứng", "telescope"),
  V("grabber", "Grabber", "Bàn Tay Vồ", "✋", "Permanently gain {c|+1} hand per round", "Vĩnh viễn {c|+1} lượt chơi mỗi vòng"),
  V("nacho_tong", "Nacho Tong", "Kẹp Nacho", "🥢", "Permanently gain {c|+1} hand per round", "Vĩnh viễn {c|+1} lượt chơi mỗi vòng", "grabber"),
  V("wasteful", "Wasteful", "Hoang Phí", "🗑️", "Permanently gain {m|+1} discard each round", "Vĩnh viễn {m|+1} lượt bỏ bài mỗi vòng"),
  V("recyclomancy", "Recyclomancy", "Tái Chế Thuật", "♻️", "Permanently gain {m|+1} discard each round", "Vĩnh viễn {m|+1} lượt bỏ bài mỗi vòng", "wasteful"),
  V("tarot_merchant", "Tarot Merchant", "Thương Nhân Tarot", "🧾", "{t|Tarot} cards appear {a|2X} more frequently in the shop", "Lá {t|Tarot} xuất hiện nhiều gấp {a|2} trong cửa hàng"),
  V("tarot_tycoon", "Tarot Tycoon", "Trùm Tarot", "💼", "{t|Tarot} cards appear {a|4X} more frequently in the shop", "Lá {t|Tarot} xuất hiện nhiều gấp {a|4} trong cửa hàng", "tarot_merchant"),
  V("planet_merchant", "Planet Merchant", "Thương Nhân Hành Tinh", "🪐", "{p|Planet} cards appear {a|2X} more frequently in the shop", "Lá {p|Hành Tinh} xuất hiện nhiều gấp {a|2} trong cửa hàng"),
  V("planet_tycoon", "Planet Tycoon", "Trùm Hành Tinh", "🌠", "{p|Planet} cards appear {a|4X} more frequently in the shop", "Lá {p|Hành Tinh} xuất hiện nhiều gấp {a|4} trong cửa hàng", "planet_merchant"),
  V("seed_money", "Seed Money", "Vốn Mồi", "🌱", "Raise the cap on interest earned in each round to {$|$10}", "Nâng trần tiền lãi mỗi vòng lên {$|$10}"),
  V("money_tree", "Money Tree", "Cây Tiền", "🌳", "Raise the cap on interest earned in each round to {$|$20}", "Nâng trần tiền lãi mỗi vòng lên {$|$20}", "seed_money"),
  V("blank", "Blank", "Trống Rỗng", "⬜", "{d|Does nothing?}", "{d|Không làm gì cả?}"),
  V("antimatter", "Antimatter", "Phản Vật Chất", "⚫", "{a|+1} Joker slot", "{a|+1} ô Joker", "blank"),
  V("magic_trick", "Magic Trick", "Ảo Thuật", "🐇", "{a|Playing cards} can be purchased from the shop", "Có thể mua {a|lá bài thường} trong cửa hàng"),
  V("illusion", "Illusion", "Ảo Ảnh", "🎆", "{a|Playing cards} in shop may have an {a|Enhancement}, {a|Edition}, and/or a {a|Seal}", "{a|Lá bài thường} trong cửa hàng có thể có {a|cường hóa}, {a|phiên bản} và/hoặc {a|dấu}", "magic_trick"),
  V("hieroglyph", "Hieroglyph", "Chữ Tượng Hình", "📜", "{a|-1} Ante, {c|-1} hand each round", "{a|-1} Ante, {c|-1} lượt chơi mỗi vòng"),
  V("petroglyph", "Petroglyph", "Khắc Đá", "🗿", "{a|-1} Ante, {m|-1} discard each round", "{a|-1} Ante, {m|-1} lượt bỏ bài mỗi vòng", "hieroglyph"),
  V("directors_cut", "Director's Cut", "Bản Đạo Diễn", "🎬", "Reroll Boss Blind {a|1} time per Ante, {$|$10} per roll", "Đổi Trùm {a|1} lần mỗi Ante, {$|$10} mỗi lần"),
  V("retcon", "Retcon", "Viết Lại", "📼", "Reroll Boss Blind {a|unlimited} times, {$|$10} per roll", "Đổi Trùm {a|không giới hạn}, {$|$10} mỗi lần", "directors_cut"),
  V("paint_brush", "Paint Brush", "Cọ Vẽ", "🖌️", "{a|+1} hand size", "{a|+1} kích thước tay"),
  V("palette", "Palette", "Bảng Màu", "🎨", "{a|+1} hand size", "{a|+1} kích thước tay", "paint_brush"),
];
export const VOUCHER_MAP: Record<string, VoucherDef> = Object.fromEntries(VOUCHERS.map((v) => [v.key, v]));

/* ---------------- Tags ---------------- */

export interface TagDef {
  key: string;
  name: Txt;
  text: Txt;
  icon: string;
  minAnte: number;
}

const T = (key: string, en: string, vi: string, icon: string, minAnte: number, ten: string, tvi: string): TagDef => ({
  key, name: { en, vi }, text: { en: ten, vi: tvi }, icon, minAnte,
});

export const TAGS: TagDef[] = [
  T("uncommon", "Uncommon Tag", "Thẻ Không Phổ Biến", "🟢", 1, "Shop has a free {g|Uncommon Joker}", "Cửa hàng kế tiếp có một {g|Joker Không Phổ Biến} miễn phí"),
  T("rare", "Rare Tag", "Thẻ Hiếm", "🔴", 1, "Shop has a free {m|Rare Joker}", "Cửa hàng kế tiếp có một {m|Joker Hiếm} miễn phí"),
  T("negative", "Negative Tag", "Thẻ Âm Bản", "⚫", 2, "Next base edition shop Joker is free and becomes {d|Negative}", "Joker thường kế tiếp trong cửa hàng miễn phí và thành {d|Âm Bản}"),
  T("foil", "Foil Tag", "Thẻ Ánh Kim", "🔷", 1, "Next base edition shop Joker is free and becomes {c|Foil}", "Joker thường kế tiếp trong cửa hàng miễn phí và thành {c|Ánh Kim}"),
  T("holo", "Holographic Tag", "Thẻ Ba Chiều", "🔶", 1, "Next base edition shop Joker is free and becomes {m|Holographic}", "Joker thường kế tiếp trong cửa hàng miễn phí và thành {m|Ba Chiều}"),
  T("poly", "Polychrome Tag", "Thẻ Đa Sắc", "🌈", 1, "Next base edition shop Joker is free and becomes {x|Polychrome}", "Joker thường kế tiếp trong cửa hàng miễn phí và thành {x|Đa Sắc}"),
  T("investment", "Investment Tag", "Thẻ Đầu Tư", "📈", 1, "After defeating the Boss Blind, gain {$|$25}", "Sau khi hạ Trùm, nhận {$|$25}"),
  T("voucher", "Voucher Tag", "Thẻ Phiếu", "🎫", 1, "Adds one {a|Voucher} to the next shop", "Thêm một {a|Phiếu} vào cửa hàng kế tiếp"),
  T("boss", "Boss Tag", "Thẻ Trùm", "👹", 1, "Rerolls the {a|Boss Blind}", "Đổi {a|Trùm} của Ante này"),
  T("standard", "Standard Tag", "Thẻ Tiêu Chuẩn", "🂠", 2, "Gives a free {a|Mega Standard Pack}", "Tặng một {a|Gói Tiêu Chuẩn Khổng Lồ}"),
  T("charm", "Charm Tag", "Thẻ Bùa", "🔮", 1, "Gives a free {t|Mega Arcana Pack}", "Tặng một {t|Gói Arcana Khổng Lồ}"),
  T("meteor", "Meteor Tag", "Thẻ Thiên Thạch", "☄️", 2, "Gives a free {p|Mega Celestial Pack}", "Tặng một {p|Gói Thiên Văn Khổng Lồ}"),
  T("buffoon", "Buffoon Tag", "Thẻ Hề", "🤡", 2, "Gives a free {a|Mega Buffoon Pack}", "Tặng một {a|Gói Hề Khổng Lồ}"),
  T("handy", "Handy Tag", "Thẻ Khéo Tay", "🖐️", 2, "Gives {$|$1} per played hand this run", "Nhận {$|$1} cho mỗi tay bài đã chơi trong ván"),
  T("garbage", "Garbage Tag", "Thẻ Rác", "🗑️", 2, "Gives {$|$1} per unused discard this run", "Nhận {$|$1} cho mỗi lượt bỏ bài chưa dùng trong ván"),
  T("ethereal", "Ethereal Tag", "Thẻ Siêu Linh", "👻", 2, "Gives a free {s|Spectral Pack}", "Tặng một {s|Gói Spectral}"),
  T("coupon", "Coupon Tag", "Thẻ Giảm Giá", "🎟️", 1, "Initial cards and booster packs in next shop are free", "Các lá và gói ban đầu ở cửa hàng kế tiếp miễn phí"),
  T("double", "Double Tag", "Thẻ Nhân Đôi", "✌️", 1, "Gives a copy of the next selected {a|Tag}", "Nhân đôi {a|Thẻ} kế tiếp bạn nhận"),
  T("juggle", "Juggle Tag", "Thẻ Tung Hứng", "🤹", 1, "{a|+3} hand size next round", "{a|+3} kích thước tay ở vòng kế tiếp"),
  T("d6", "D6 Tag", "Thẻ Xúc Xắc", "🎲", 1, "Rerolls in next shop start at {$|$0}", "Đổi mới ở cửa hàng kế tiếp bắt đầu từ {$|$0}"),
  T("topup", "Top-up Tag", "Thẻ Nạp Thêm", "⬆️", 2, "Create up to {a|2} {c|Common} Jokers (Must have room)", "Tạo tối đa {a|2} Joker {c|Thường} (cần còn chỗ)"),
  T("speed", "Speed Tag", "Thẻ Tốc Độ", "⏩", 2, "Gives {$|$5} per skipped Blind this run", "Nhận {$|$5} cho mỗi Blind đã bỏ qua trong ván"),
  T("orbital", "Orbital Tag", "Thẻ Quỹ Đạo", "🛸", 2, "Upgrade a random {a|poker hand} by {a|3} levels", "Tăng {a|3} cấp cho một {a|tay bài} ngẫu nhiên"),
  T("economy", "Economy Tag", "Thẻ Kinh Tế", "💰", 2, "Doubles your money (Max of {$|$40})", "Nhân đôi số tiền (tối đa {$|$40})"),
];
export const TAG_MAP: Record<string, TagDef> = Object.fromEntries(TAGS.map((t) => [t.key, t]));

/* ---------------- Packs ---------------- */

export interface PackDef {
  key: string;
  kind: "arcana" | "celestial" | "buffoon" | "standard" | "spectral";
  size: "normal" | "jumbo" | "mega";
  cost: number;
  options: number;
  picks: number;
  weight: number;
  name: Txt;
}

const PK = (kind: PackDef["kind"], size: PackDef["size"], cost: number, options: number, picks: number, weight: number, en: string, vi: string): PackDef => ({
  key: `${kind}_${size}`, kind, size, cost, options, picks, weight, name: { en, vi },
});

export const PACKS: PackDef[] = [
  PK("arcana", "normal", 4, 3, 1, 4, "Arcana Pack", "Gói Arcana"),
  PK("arcana", "jumbo", 6, 5, 1, 2, "Jumbo Arcana Pack", "Gói Arcana Lớn"),
  PK("arcana", "mega", 8, 5, 2, 0.5, "Mega Arcana Pack", "Gói Arcana Khổng Lồ"),
  PK("celestial", "normal", 4, 3, 1, 4, "Celestial Pack", "Gói Thiên Văn"),
  PK("celestial", "jumbo", 6, 5, 1, 2, "Jumbo Celestial Pack", "Gói Thiên Văn Lớn"),
  PK("celestial", "mega", 8, 5, 2, 0.5, "Mega Celestial Pack", "Gói Thiên Văn Khổng Lồ"),
  PK("standard", "normal", 4, 3, 1, 4, "Standard Pack", "Gói Tiêu Chuẩn"),
  PK("standard", "jumbo", 6, 5, 1, 2, "Jumbo Standard Pack", "Gói Tiêu Chuẩn Lớn"),
  PK("standard", "mega", 8, 5, 2, 0.5, "Mega Standard Pack", "Gói Tiêu Chuẩn Khổng Lồ"),
  PK("buffoon", "normal", 4, 2, 1, 1.2, "Buffoon Pack", "Gói Hề"),
  PK("buffoon", "jumbo", 6, 4, 1, 0.6, "Jumbo Buffoon Pack", "Gói Hề Lớn"),
  PK("buffoon", "mega", 8, 4, 2, 0.15, "Mega Buffoon Pack", "Gói Hề Khổng Lồ"),
  PK("spectral", "normal", 4, 2, 1, 0.6, "Spectral Pack", "Gói Spectral"),
  PK("spectral", "jumbo", 6, 4, 1, 0.3, "Jumbo Spectral Pack", "Gói Spectral Lớn"),
  PK("spectral", "mega", 8, 4, 2, 0.07, "Mega Spectral Pack", "Gói Spectral Khổng Lồ"),
];
export const PACK_MAP: Record<string, PackDef> = Object.fromEntries(PACKS.map((p) => [p.key, p]));

export const PACK_TEXT: Record<PackDef["kind"], Txt> = {
  arcana: { en: "Choose {a|%0} of up to {a|%1} {t|Tarot} cards to be used immediately", vi: "Chọn {a|%0} trong {a|%1} lá {t|Tarot} để dùng ngay" },
  celestial: { en: "Choose {a|%0} of up to {a|%1} {p|Planet} cards to be used immediately", vi: "Chọn {a|%0} trong {a|%1} lá {p|Hành Tinh} để dùng ngay" },
  standard: { en: "Choose {a|%0} of up to {a|%1} Playing cards to add to your deck", vi: "Chọn {a|%0} trong {a|%1} lá bài để thêm vào bộ bài" },
  buffoon: { en: "Choose {a|%0} of up to {a|%1} {a|Joker} cards", vi: "Chọn {a|%0} trong {a|%1} lá {a|Joker}" },
  spectral: { en: "Choose {a|%0} of up to {a|%1} {s|Spectral} cards to be used immediately", vi: "Chọn {a|%0} trong {a|%1} lá {s|Spectral} để dùng ngay" },
};

/* ---------------- Decks & stakes ---------------- */

export interface DeckDef {
  key: string;
  name: Txt;
  text: Txt;
  color: string;
}

const D = (key: string, en: string, vi: string, color: string, ten: string, tvi: string): DeckDef => ({ key, name: { en, vi }, text: { en: ten, vi: tvi }, color });

export const DECKS: DeckDef[] = [
  D("red", "Red Deck", "Bộ Đỏ", "#e5483f", "{m|+1} discard every round", "{m|+1} lượt bỏ bài mỗi vòng"),
  D("blue", "Blue Deck", "Bộ Xanh Dương", "#3c8be0", "{c|+1} hand every round", "{c|+1} lượt chơi mỗi vòng"),
  D("yellow", "Yellow Deck", "Bộ Vàng", "#f4b22e", "Start with extra {$|$10}", "Khởi đầu thêm {$|$10}"),
  D("green", "Green Deck", "Bộ Xanh Lá", "#3fb26b", "At end of each Round: {$|$2} per remaining Hand, {$|$1} per remaining Discard. Earn no {a|Interest}", "Cuối mỗi vòng: {$|$2} mỗi lượt chơi còn lại, {$|$1} mỗi lượt bỏ còn lại. Không nhận {a|tiền lãi}"),
  D("black", "Black Deck", "Bộ Đen", "#3a3a4a", "{a|+1} Joker slot. {c|-1} hand every round", "{a|+1} ô Joker. {c|-1} lượt chơi mỗi vòng"),
  D("magic", "Magic Deck", "Bộ Phép Thuật", "#8a5bd6", "Start run with the {a|Crystal Ball} voucher and {a|2} copies of {t|The Fool}", "Khởi đầu với phiếu {a|Quả Cầu Pha Lê} và {a|2} lá {t|The Fool}"),
  D("nebula", "Nebula Deck", "Bộ Tinh Vân", "#4a5fc1", "Start run with the {p|Telescope} voucher. {m|-1} consumable slot", "Khởi đầu với phiếu {p|Kính Thiên Văn}. {m|-1} ô lá tiêu hao"),
  D("ghost", "Ghost Deck", "Bộ Bóng Ma", "#9fb4c7", "{s|Spectral} cards may appear in the shop, start with a {s|Hex} card", "Lá {s|Spectral} có thể xuất hiện trong cửa hàng, khởi đầu với một lá {s|Hex}"),
  D("abandoned", "Abandoned Deck", "Bộ Bỏ Hoang", "#7d8a7b", "Start run with no {a|Face Cards} in your deck", "Khởi đầu không có lá {a|mặt người} trong bộ bài"),
  D("checkered", "Checkered Deck", "Bộ Caro", "#c94a6a", "Start run with {a|26} {S|Spades} and {a|26} {H|Hearts} in deck", "Khởi đầu với {a|26} lá {S|Bích} và {a|26} lá {H|Cơ}"),
  D("zodiac", "Zodiac Deck", "Bộ Hoàng Đạo", "#2f7f8f", "Start run with {t|Tarot Merchant}, {p|Planet Merchant}, and {a|Overstock}", "Khởi đầu với {t|Thương Nhân Tarot}, {p|Thương Nhân Hành Tinh} và {a|Kho Đầy}"),
  D("painted", "Painted Deck", "Bộ Sơn Vẽ", "#d77a2e", "{a|+2} hand size, {m|-1} Joker slot", "{a|+2} kích thước tay, {m|-1} ô Joker"),
  D("anaglyph", "Anaglyph Deck", "Bộ 3D", "#5f3fb0", "After defeating each {a|Boss Blind}, gain a {a|Double Tag}", "Sau mỗi lần hạ {a|Trùm}, nhận một {a|Thẻ Nhân Đôi}"),
  D("plasma", "Plasma Deck", "Bộ Plasma", "#b04ad6", "Balance {c|Chips} and {m|Mult} when calculating score for played hand. {m|X2} base Blind size", "Cân bằng {c|Chip} và {m|Mult} khi tính điểm. Blind gốc {m|X2}"),
  D("erratic", "Erratic Deck", "Bộ Hỗn Loạn", "#4b9f9a", "All {a|Ranks} and {a|Suits} in deck are randomized", "Mọi {a|số} và {a|chất} trong bộ bài đều ngẫu nhiên"),
];
export const DECK_MAP: Record<string, DeckDef> = Object.fromEntries(DECKS.map((d) => [d.key, d]));

export interface StakeDef {
  n: number;
  name: Txt;
  text: Txt;
  color: string;
}

export const STAKES: StakeDef[] = [
  { n: 1, name: { en: "White Stake", vi: "Cược Trắng" }, text: { en: "Base Difficulty", vi: "Độ khó cơ bản" }, color: "#f0f0f0" },
  { n: 2, name: { en: "Red Stake", vi: "Cược Đỏ" }, text: { en: "{a|Small Blind} gives no reward money", vi: "{a|Mù Nhỏ} không cho tiền thưởng" }, color: "#e5483f" },
  { n: 3, name: { en: "Green Stake", vi: "Cược Xanh Lá" }, text: { en: "Required score scales faster for each {a|Ante}", vi: "Điểm yêu cầu tăng nhanh hơn mỗi {a|Ante}" }, color: "#3fb26b" },
  { n: 4, name: { en: "Black Stake", vi: "Cược Đen" }, text: { en: "Shop can have {a|Eternal} Jokers (can't be sold or destroyed)", vi: "Cửa hàng có thể có Joker {a|Vĩnh Cửu} (không thể bán hay phá)" }, color: "#4a4a5a" },
  { n: 5, name: { en: "Blue Stake", vi: "Cược Xanh Dương" }, text: { en: "{m|-1} Discard", vi: "{m|-1} lượt bỏ bài" }, color: "#3c8be0" },
  { n: 6, name: { en: "Purple Stake", vi: "Cược Tím" }, text: { en: "Required score scales even faster for each {a|Ante}", vi: "Điểm yêu cầu tăng còn nhanh hơn mỗi {a|Ante}" }, color: "#8a5bd6" },
  { n: 7, name: { en: "Orange Stake", vi: "Cược Cam" }, text: { en: "Shop can have {a|Perishable} Jokers (debuffed after 5 Rounds)", vi: "Cửa hàng có thể có Joker {a|Mau Hỏng} (vô hiệu sau 5 vòng)" }, color: "#e98a2e" },
  { n: 8, name: { en: "Gold Stake", vi: "Cược Vàng" }, text: { en: "Shop can have {a|Rental} Jokers (costs {$|$3} per round)", vi: "Cửa hàng có thể có Joker {a|Thuê} (tốn {$|$3} mỗi vòng)" }, color: "#f4b22e" },
];
