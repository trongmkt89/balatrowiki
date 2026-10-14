"use client";

import { memo } from "react";
import { chipValue, EDITION_NAME, EDITION_TEXT, ENH_NAME, ENH_TEXT, isStone, RANK_LABEL, SEAL_NAME, SEAL_TEXT, SUIT_SYM } from "@/game/cards";
import { CONS_MAP } from "@/game/consumables";
import { HANDS } from "@/game/hands";
import { JOKER_MAP, RARITY_NAME } from "@/game/jokers";
import { BOSS_MAP, DECK_MAP, PACK_MAP, PACK_TEXT, TAG_MAP, VOUCHER_MAP } from "@/game/meta";
import * as ops from "@/game/ops";
import { copyCompatible } from "@/game/scoring";
import type { Card, Consumable, Joker, Lang, Run } from "@/game/types";
import { Rich } from "./Rich";

/* ---------------- Tooltip content ---------------- */

export interface Tip {
  title: string;
  lines: { text: string; vars?: (string | number)[] }[];
  badges: { text: string; cls: string }[];
  foot?: string;
}

export function TipBox({ tip }: { tip: Tip }) {
  return (
    <div className="tip">
      <div className="tip-title">{tip.title}</div>
      {tip.lines.length > 0 && (
        <div className="tip-body">
          {tip.lines.map((l, i) => (
            <div key={i} className="tip-line">
              <Rich text={l.text} vars={l.vars} />
            </div>
          ))}
        </div>
      )}
      {tip.badges.length > 0 && (
        <div className="tip-badges">
          {tip.badges.map((b, i) => (
            <span key={i} className={`badge ${b.cls}`}>
              {b.text}
            </span>
          ))}
        </div>
      )}
      {tip.foot && <div className="tip-foot">{tip.foot}</div>}
    </div>
  );
}

const STICKER: Record<string, { en: string; vi: string; text: { en: string; vi: string } }> = {
  eternal: { en: "Eternal", vi: "Vĩnh Cửu", text: { en: "Can't be sold or destroyed", vi: "Không thể bán hay phá" } },
  perish: { en: "Perishable", vi: "Mau Hỏng", text: { en: "Debuffed after {a|%0} more rounds", vi: "Bị vô hiệu sau {a|%0} vòng nữa" } },
  rental: { en: "Rental", vi: "Thuê", text: { en: "Lose {$|$3} at end of round", vi: "Mất {$|$3} cuối mỗi vòng" } },
};

export function jokerTip(j: Joker, s: Run | null, lang: Lang): Tip {
  const def = JOKER_MAP[j.key];
  const lines: Tip["lines"] = [{ text: def.text[lang], vars: def.vars?.(j, s, lang) }];
  if (j.ed) lines.push({ text: `${EDITION_NAME[j.ed][lang]}: ${EDITION_TEXT[j.ed][lang]}` });
  if (j.eternal) lines.push({ text: `{a|${STICKER.eternal[lang]}}: ${STICKER.eternal.text[lang]}` });
  if (j.perish !== undefined) lines.push({ text: `{a|${STICKER.perish[lang]}}: ${STICKER.perish.text[lang]}`, vars: [j.perish] });
  if (j.rental) lines.push({ text: `{a|${STICKER.rental[lang]}}: ${STICKER.rental.text[lang]}` });
  const badges: Tip["badges"] = [{ text: RARITY_NAME[def.rarity][lang], cls: `rar-${def.rarity}` }];
  if (j.ed) badges.push({ text: EDITION_NAME[j.ed][lang], cls: `ed-${j.ed}` });
  if (j.debuff) badges.push({ text: lang === "vi" ? "Bị vô hiệu" : "Debuffed", cls: "b-bad" });
  let foot: string | undefined;
  if (s && (j.key === "blueprint" || j.key === "brainstorm") && s.jokers.includes(j)) {
    foot = copyCompatible(s, j) ? (lang === "vi" ? "✓ Tương thích" : "✓ Compatible") : lang === "vi" ? "✗ Không tương thích" : "✗ Incompatible";
  }
  return { title: def.name, lines, badges, foot };
}

export function consTip(key: string, lang: Lang, s: Run | null, neg?: boolean): Tip {
  const def = CONS_MAP[key];
  const lines: Tip["lines"] = [{ text: def.text[lang] }];
  if (def.kind === "planet" && def.hand && s) {
    const lvl = s.levels[def.hand];
    lines.push({ text: lang === "vi" ? `Hiện tại: {a|cấp ${lvl}}` : `Currently {a|level ${lvl}}` });
  }
  if (key === "fool" && s) {
    const last = s.lastCons ? CONS_MAP[s.lastCons]?.name[lang] : lang === "vi" ? "Chưa có" : "None";
    lines.push({ text: `{d|${lang === "vi" ? "Gần nhất" : "Last"}: ${last}}` });
  }
  if (neg) lines.push({ text: `${EDITION_NAME.negative[lang]}: {a|+1} ${lang === "vi" ? "ô tiêu hao" : "consumable slot"}` });
  const kindName = { tarot: { en: "Tarot", vi: "Tarot" }, planet: { en: "Planet", vi: "Hành Tinh" }, spectral: { en: "Spectral", vi: "Spectral" } }[def.kind];
  return { title: def.name[lang], lines, badges: [{ text: kindName[lang], cls: `k-${def.kind}` }] };
}

export function cardTip(c: Card, lang: Lang, debuffed = false): Tip {
  const lines: Tip["lines"] = [];
  let title: string;
  if (isStone(c)) {
    title = ENH_NAME.stone[lang];
    lines.push({ text: ENH_TEXT.stone[lang] });
  } else {
    title = `${RANK_LABEL[c.rank]} ${SUIT_SYM[c.suit]}`;
    lines.push({ text: `{c|+${chipValue(c.rank) + c.extra}} ${lang === "vi" ? "Chip" : "chips"}` });
    if (c.enh) lines.push({ text: `${ENH_NAME[c.enh][lang]}: ${ENH_TEXT[c.enh][lang]}` });
  }
  if (c.ed) lines.push({ text: `${EDITION_NAME[c.ed][lang]}: ${EDITION_TEXT[c.ed][lang]}` });
  if (c.seal) lines.push({ text: `${SEAL_NAME[c.seal][lang]}: ${SEAL_TEXT[c.seal][lang]}` });
  const badges: Tip["badges"] = [];
  if (debuffed) badges.push({ text: lang === "vi" ? "Bị vô hiệu" : "Debuffed", cls: "b-bad" });
  return { title, lines, badges };
}

export function voucherTip(key: string, lang: Lang): Tip {
  const v = VOUCHER_MAP[key];
  return { title: v.name[lang], lines: [{ text: v.text[lang] }], badges: [{ text: lang === "vi" ? "Phiếu" : "Voucher", cls: "k-voucher" }] };
}

export function packTip(key: string, lang: Lang): Tip {
  const p = PACK_MAP[key];
  return { title: p.name[lang], lines: [{ text: PACK_TEXT[p.kind][lang], vars: [p.picks, p.options] }], badges: [] };
}

export function tagTip(key: string, lang: Lang): Tip {
  const t = TAG_MAP[key];
  return { title: t.name[lang], lines: [{ text: t.text[lang] }], badges: [{ text: lang === "vi" ? "Thẻ" : "Tag", cls: "k-tag" }] };
}

export function bossTip(key: string, lang: Lang): Tip {
  const b = BOSS_MAP[key];
  return { title: b.name[lang], lines: [{ text: b.text[lang] }], badges: [] };
}

/* ---------------- Card faces ---------------- */

const PIPS: Record<number, [number, number][]> = {
  2: [[50, 18], [50, 82]],
  3: [[50, 18], [50, 50], [50, 82]],
  4: [[30, 18], [70, 18], [30, 82], [70, 82]],
  5: [[30, 18], [70, 18], [50, 50], [30, 82], [70, 82]],
  6: [[30, 18], [70, 18], [30, 50], [70, 50], [30, 82], [70, 82]],
  7: [[30, 18], [70, 18], [50, 34], [30, 50], [70, 50], [30, 82], [70, 82]],
  8: [[30, 18], [70, 18], [50, 34], [30, 50], [70, 50], [50, 66], [30, 82], [70, 82]],
  9: [[30, 16], [70, 16], [30, 39], [70, 39], [50, 50], [30, 61], [70, 61], [30, 84], [70, 84]],
  10: [[30, 16], [70, 16], [50, 28], [30, 39], [70, 39], [30, 61], [70, 61], [50, 72], [30, 84], [70, 84]],
};
const FACE_GLYPH: Record<number, string> = { 11: "♞", 12: "♛", 13: "♚" };

export interface CardProps {
  card: Card;
  faceDown?: boolean;
  debuffed?: boolean;
  selected?: boolean;
  forced?: boolean;
  deck?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const PlayingCard = memo(function PlayingCard({ card, faceDown, debuffed, selected, forced, deck = "red", className = "", style }: CardProps) {
  if (faceDown) {
    return (
      <div className={`pcard back ${className}`} style={{ ...style, ["--deck" as string]: DECK_MAP[deck]?.color ?? "#e5483f" }}>
        <div className="back-pattern" />
      </div>
    );
  }
  const stone = isStone(card);
  const cls = [
    "pcard",
    `suit-${card.suit}`,
    card.enh ? `enh-${card.enh}` : "",
    card.ed ? `ed-${card.ed}` : "",
    selected ? "selected" : "",
    forced ? "forced" : "",
    debuffed ? "debuffed" : "",
    className,
  ].join(" ");
  return (
    <div className={cls} style={style}>
      {!stone && (
        <>
          <div className="corner tl">
            <span className="r">{RANK_LABEL[card.rank]}</span>
            <span className="s">{SUIT_SYM[card.suit]}</span>
          </div>
          <div className="corner br">
            <span className="r">{RANK_LABEL[card.rank]}</span>
            <span className="s">{SUIT_SYM[card.suit]}</span>
          </div>
          <div className="pips">
            {card.rank === 14 ? (
              <span className="ace">{SUIT_SYM[card.suit]}</span>
            ) : card.rank >= 11 ? (
              <div className="face">
                <span className="glyph">{FACE_GLYPH[card.rank]}</span>
                <span className="fs">{SUIT_SYM[card.suit]}</span>
              </div>
            ) : (
              PIPS[card.rank].map(([x, y], i) => (
                <span key={i} className={`pip ${y > 55 ? "flip" : ""}`} style={{ left: `${x}%`, top: `${y}%` }}>
                  {SUIT_SYM[card.suit]}
                </span>
              ))
            )}
          </div>
        </>
      )}
      {stone && <div className="stone-face" />}
      {card.enh === "lucky" && <span className="enh-mark">🍀</span>}
      {card.enh === "gold" && <span className="enh-mark">★</span>}
      {card.enh === "bonus" && <span className="enh-tag chips">+30</span>}
      {card.enh === "mult" && <span className="enh-tag mult">+4</span>}
      {card.seal && <span className={`seal seal-${card.seal}`} />}
      {card.ed && <div className="ed-overlay" />}
      {debuffed && <div className="debuff-x">✕</div>}
    </div>
  );
});

export const JokerCard = memo(function JokerCard({ joker, className = "", style }: { joker: Joker; className?: string; style?: React.CSSProperties }) {
  const def = JOKER_MAP[joker.key];
  if (joker.flipped) {
    return (
      <div className={`jcard back ${className}`} style={style}>
        <div className="back-pattern" />
      </div>
    );
  }
  const cls = ["jcard", `rar-${def.rarity}`, joker.ed ? `ed-${joker.ed}` : "", joker.debuff ? "debuffed" : "", className].join(" ");
  return (
    <div className={cls} style={style}>
      <div className="j-art">
        <span className="j-icon">{def.icon}</span>
      </div>
      <div className="j-name">{def.name}</div>
      {joker.eternal && <span className="sticker eternal">∞</span>}
      {joker.perish !== undefined && <span className="sticker perish">⌛{joker.perish}</span>}
      {joker.rental && <span className="sticker rental">$</span>}
      {joker.ed && <div className="ed-overlay" />}
      {joker.debuff && <div className="debuff-x">✕</div>}
    </div>
  );
});

const ROMAN = /^([0IVXL]+) /;

export const ConsCard = memo(function ConsCard({ cons, className = "", style, lang }: { cons: Consumable | { key: string; neg?: boolean }; className?: string; style?: React.CSSProperties; lang: Lang }) {
  const def = CONS_MAP[cons.key];
  const name = def.name[lang];
  const roman = name.match(ROMAN)?.[1];
  const label = roman ? name.replace(ROMAN, "") : name;
  return (
    <div className={`ccard k-${def.kind} ${cons.neg ? "ed-negative" : ""} ${className}`} style={style}>
      {roman && <div className="c-roman">{roman}</div>}
      <div className="c-art">
        {def.kind === "planet" ? (
          <span
            className={`planet-orb ${["saturn", "uranus", "neptune", "ceres"].includes(def.key) ? "ringed" : ""}`}
            style={{ ["--hue" as string]: `${(Object.keys(HANDS).indexOf(def.hand!) * 47 + 20) % 360}` }}
          />
        ) : (
          <span className="c-icon">{def.icon}</span>
        )}
      </div>
      <div className="c-name">{label}</div>
      {cons.neg && <div className="ed-overlay" />}
    </div>
  );
});

export function VoucherCard({ voucher, lang, className = "" }: { voucher: string; lang: Lang; className?: string }) {
  const v = VOUCHER_MAP[voucher];
  return (
    <div className={`vcard ${v.requires ? "tier2" : ""} ${className}`}>
      <div className="v-icon">{v.icon}</div>
      <div className="v-name">{v.name[lang]}</div>
    </div>
  );
}

const PACK_ICON: Record<string, string> = { arcana: "🔮", celestial: "🪐", standard: "🂡", buffoon: "🤡", spectral: "👻" };

export function PackCard({ pack, lang, className = "" }: { pack: string; lang: Lang; className?: string }) {
  const p = PACK_MAP[pack];
  return (
    <div className={`kcard pk-${p.kind} pk-${p.size} ${className}`}>
      <div className="k-icon">{PACK_ICON[p.kind]}</div>
      <div className="k-name">{p.name[lang]}</div>
    </div>
  );
}

export function TagBadge({ tag, className = "", onPointerEnter, onPointerLeave }: { tag: string; className?: string; onPointerEnter?: React.PointerEventHandler; onPointerLeave?: React.PointerEventHandler }) {
  const t = TAG_MAP[tag];
  return (
    <span className={`tagbadge ${className}`} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      {t?.icon ?? "?"}
    </span>
  );
}

export function BlindChip({ blind, boss, size = 64 }: { blind: number; boss: string; size?: number }) {
  const b = BOSS_MAP[boss];
  const color = blind === 0 ? "#3c7fd1" : blind === 1 ? "#e9a23b" : b?.color ?? "#a33";
  const label = blind === 0 ? "S" : blind === 1 ? "B" : b?.icon ?? "☠";
  return (
    <span className="blindchip" style={{ width: size, height: size, ["--bc" as string]: color, fontSize: size * 0.42 }}>
      <span>{label}</span>
    </span>
  );
}

export function sellText(x: { cost: number; extraSell: number }) {
  return `$${ops.sellValue(x)}`;
}
