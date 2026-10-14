"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Lang, Txt } from "@/game/types";
import { loadSettings, saveSettings } from "./storage";

const UI = {
  play: { en: "Play Hand", vi: "Đánh bài" },
  discard: { en: "Discard", vi: "Bỏ bài" },
  sortHand: { en: "Sort Hand", vi: "Xếp bài" },
  rank: { en: "Rank", vi: "Số" },
  suit: { en: "Suit", vi: "Chất" },
  hands: { en: "Hands", vi: "Lượt đánh" },
  discards: { en: "Discards", vi: "Lượt bỏ" },
  ante: { en: "Ante", vi: "Ante" },
  round: { en: "Round", vi: "Vòng" },
  roundScore: { en: "Round score", vi: "Điểm vòng" },
  scoreAtLeast: { en: "Score at least", vi: "Cần đạt ít nhất" },
  reward: { en: "Reward", vi: "Thưởng" },
  chooseBlind: { en: "Choose your next Blind", vi: "Chọn Blind tiếp theo" },
  select: { en: "Select", vi: "Chọn" },
  skipBlind: { en: "Skip Blind", vi: "Bỏ qua Blind" },
  or: { en: "or", vi: "hoặc" },
  upcoming: { en: "Upcoming", vi: "Sắp tới" },
  defeated: { en: "Defeated", vi: "Đã hạ" },
  skipped: { en: "Skipped", vi: "Đã bỏ qua" },
  current: { en: "Current", vi: "Hiện tại" },
  rerollBoss: { en: "Reroll Boss", vi: "Đổi Trùm" },
  cashOut: { en: "Cash Out", vi: "Nhận tiền" },
  nextRound: { en: "Next Round", vi: "Vòng tiếp" },
  reroll: { en: "Reroll", vi: "Đổi mới" },
  buy: { en: "Buy", vi: "Mua" },
  buyUse: { en: "Buy & Use", vi: "Mua & Dùng" },
  use: { en: "Use", vi: "Dùng" },
  sell: { en: "Sell", vi: "Bán" },
  redeem: { en: "Redeem", vi: "Đổi" },
  open: { en: "Open", vi: "Mở" },
  skip: { en: "Skip", vi: "Bỏ qua" },
  choose: { en: "Choose", vi: "Chọn" },
  take: { en: "Take", vi: "Lấy" },
  runInfo: { en: "Run Info", vi: "Thông tin" },
  options: { en: "Options", vi: "Tùy chọn" },
  gameOver: { en: "Game Over", vi: "Thua cuộc" },
  youWin: { en: "You Win!", vi: "Chiến thắng!" },
  newRun: { en: "New Run", vi: "Ván mới" },
  continue: { en: "Continue", vi: "Chơi tiếp" },
  mainMenu: { en: "Main Menu", vi: "Menu chính" },
  endless: { en: "Endless Mode", vi: "Chơi vô tận" },
  bestHand: { en: "Best Hand", vi: "Tay bài cao nhất" },
  mostPlayed: { en: "Most Played Hand", vi: "Tay bài chơi nhiều nhất" },
  cardsPlayed: { en: "Cards Played", vi: "Lá đã chơi" },
  cardsDiscarded: { en: "Cards Discarded", vi: "Lá đã bỏ" },
  purchases: { en: "Cards Purchased", vi: "Lá đã mua" },
  rerolls: { en: "Times Rerolled", vi: "Số lần đổi mới" },
  seed: { en: "Seed", vi: "Mã ván" },
  pokerHands: { en: "Poker Hands", vi: "Tay bài" },
  blinds: { en: "Blinds", vi: "Blind" },
  vouchers: { en: "Vouchers", vi: "Phiếu" },
  deck: { en: "Deck", vi: "Bộ bài" },
  fullDeck: { en: "Full Deck", vi: "Toàn bộ bài" },
  remaining: { en: "Remaining", vi: "Còn lại" },
  lvl: { en: "lvl.", vi: "cấp " },
  level: { en: "Level", vi: "Cấp" },
  played: { en: "Played", vi: "Đã chơi" },
  close: { en: "Close", vi: "Đóng" },
  back: { en: "Back", vi: "Quay lại" },
  speed: { en: "Game Speed", vi: "Tốc độ" },
  sound: { en: "Sound", vi: "Âm thanh" },
  on: { en: "On", vi: "Bật" },
  off: { en: "Off", vi: "Tắt" },
  language: { en: "Language", vi: "Ngôn ngữ" },
  contrast: { en: "High contrast suits", vi: "Màu chất tương phản cao" },
  abandon: { en: "Abandon run", vi: "Bỏ ván này" },
  abandonConfirm: { en: "Abandon this run? Progress will be lost.", vi: "Bỏ ván này? Tiến trình sẽ mất." },
  shop: { en: "Shop", vi: "Cửa hàng" },
  improveRun: { en: "Improve your run!", vi: "Nâng cấp ván chơi!" },
  notAllowed: { en: "Not allowed!", vi: "Không hợp lệ!" },
  jokers: { en: "Jokers", vi: "Joker" },
  consumables: { en: "Consumables", vi: "Lá tiêu hao" },
  tarots: { en: "Tarot Cards", vi: "Lá Tarot" },
  planets: { en: "Planet Cards", vi: "Lá Hành Tinh" },
  spectrals: { en: "Spectral Cards", vi: "Lá Spectral" },
  tags: { en: "Tags", vi: "Thẻ" },
  decks: { en: "Decks", vi: "Bộ bài" },
  stakes: { en: "Stakes", vi: "Mức cược" },
  bosses: { en: "Boss Blinds", vi: "Trùm" },
  enhancements: { en: "Enhancements", vi: "Cường hóa" },
  editions: { en: "Editions", vi: "Phiên bản" },
  seals: { en: "Seals", vi: "Dấu" },
  collection: { en: "Collection", vi: "Bộ sưu tập" },
  leaderboard: { en: "Leaderboard", vi: "Bảng xếp hạng" },
  howToPlay: { en: "How to play", vi: "Cách chơi" },
  daily: { en: "Daily Challenge", vi: "Thử thách hôm nay" },
  play_: { en: "Play", vi: "Chơi" },
  nickname: { en: "Nickname", vi: "Biệt danh" },
  syncCode: { en: "Sync code", vi: "Mã đồng bộ" },
  syncHint: {
    en: "Your progress is saved online. Paste this code on another device to continue there.",
    vi: "Tiến trình được lưu trên mạng. Dán mã này vào máy khác để chơi tiếp ở đó.",
  },
  useCode: { en: "Use code", vi: "Dùng mã" },
  copy: { en: "Copy", vi: "Sao chép" },
  copied: { en: "Copied!", vi: "Đã chép!" },
  saved: { en: "Saved online", vi: "Đã lưu online" },
  saving: { en: "Saving…", vi: "Đang lưu…" },
  offline: { en: "Offline — saved on this device", vi: "Ngoại tuyến — đã lưu trên máy" },
  start: { en: "Start", vi: "Bắt đầu" },
  stake: { en: "Stake", vi: "Mức cược" },
  customSeed: { en: "Seed (optional)", vi: "Mã ván (tùy chọn)" },
  discovered: { en: "Discovered", vi: "Đã khám phá" },
  all: { en: "All", vi: "Tất cả" },
  today: { en: "Today", vi: "Hôm nay" },
  allTime: { en: "All time", vi: "Mọi thời đại" },
  player: { en: "Player", vi: "Người chơi" },
  score: { en: "Score", vi: "Điểm" },
  noRuns: { en: "No runs yet — be the first!", vi: "Chưa có ván nào — hãy là người đầu tiên!" },
  runs: { en: "Runs", vi: "Số ván" },
  wins: { en: "Wins", vi: "Thắng" },
  bestAnte: { en: "Best Ante", vi: "Ante cao nhất" },
  yourRuns: { en: "Your recent runs", vi: "Các ván gần đây của bạn" },
  won: { en: "Won", vi: "Thắng" },
  lost: { en: "Lost", vi: "Thua" },
  deckEmpty: { en: "Deck", vi: "Chồng bài" },
  noRoom: { en: "No room!", vi: "Hết chỗ!" },
  tooPoor: { en: "Not enough money", vi: "Không đủ tiền" },
  selectCards: { en: "Select cards in hand", vi: "Chọn lá trên tay" },
  free: { en: "Free", vi: "Miễn phí" },
  eternal: { en: "Eternal", vi: "Vĩnh Cửu" },
  perishable: { en: "Perishable", vi: "Mau Hỏng" },
  rental: { en: "Rental", vi: "Thuê" },
  debuffed: { en: "Debuffed", vi: "Bị vô hiệu" },
  sellValue: { en: "Sell value", vi: "Giá bán" },
  compatible: { en: "Compatible", vi: "Tương thích" },
  incompatible: { en: "Incompatible", vi: "Không tương thích" },
  dailyDone: { en: "Daily seed — same deck for everyone today", vi: "Mã ván chung — mọi người cùng chơi bộ bài này hôm nay" },
  rotate: { en: "Tip: rotate your phone for a bigger table", vi: "Mẹo: xoay ngang điện thoại để bàn chơi rộng hơn" },
  disclaimer: {
    en: "Fan-made web tribute inspired by Balatro. Original art, code & sounds. Not affiliated with LocalThunk or Playstack.",
    vi: "Bản web do fan làm, lấy cảm hứng từ Balatro. Hình, code và âm thanh tự làm. Không liên kết với LocalThunk hay Playstack.",
  },
} satisfies Record<string, Txt>;

export type UIKey = keyof typeof UI;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: UIKey) => string;
  tx: (t: Txt | undefined) => string;
}

const Ctx = createContext<LangCtx>({
  lang: "vi",
  setLang: () => {},
  t: (k) => UI[k].vi,
  tx: (t) => t?.vi ?? "",
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");
  useEffect(() => {
    const s = loadSettings();
    if (s.lang) setLangState(s.lang);
    else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("vi")) setLangState("en");
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveSettings({ ...loadSettings(), lang: l });
  }, []);
  const t = useCallback((k: UIKey) => UI[k][lang], [lang]);
  const tx = useCallback((x: Txt | undefined) => (x ? x[lang] : ""), [lang]);
  return <Ctx.Provider value={{ lang, setLang, t, tx }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
