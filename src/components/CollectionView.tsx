"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EDITION_NAME, EDITION_TEXT, ENH_NAME, ENH_TEXT, newCard, SEAL_NAME, SEAL_TEXT } from "@/game/cards";
import { CONS } from "@/game/consumables";
import { HAND_ORDER, HANDS } from "@/game/hands";
import { JOKERS, RARITY_NAME } from "@/game/jokers";
import { BOSSES, DECKS, STAKES, TAGS, VOUCHERS } from "@/game/meta";
import type { Card, Edition, Enh, Joker, Run, Seal } from "@/game/types";
import { useLang } from "@/lib/i18n";
import { loadProfile } from "@/lib/storage";
import { Background, MENU_COLORS } from "./Background";
import { BlindChip, ConsCard, JokerCard, PlayingCard, TagBadge, VoucherCard } from "./cards";
import { Rich } from "./Rich";

const SECTIONS = ["jokers", "tarots", "planets", "spectrals", "vouchers", "tags", "bosses", "decks", "stakes", "cards", "hands"] as const;
type Section = (typeof SECTIONS)[number];

function fakeJoker(key: string): Joker {
  const def = JOKERS.find((j) => j.key === key)!;
  return { id: 0, key, v: { ...(def.v0 ?? {}) }, cost: def.cost, extraSell: 0 };
}

const demoCard = (rank: number, suit: Card["suit"], extra: Partial<Card> = {}): Card =>
  ({ ...newCard({ nextId: 1 } as Run, rank as Card["rank"], suit), ...extra });

export default function CollectionView() {
  const { t, tx, lang } = useLang();
  const [section, setSection] = useState<Section>("jokers");
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState(0);
  const [found, setFound] = useState<Set<string>>(new Set());
  useEffect(() => {
    setFound(new Set(loadProfile().discovered));
    const h = window.location.hash.slice(1) as Section;
    if (SECTIONS.includes(h)) setSection(h);
  }, []);

  const label: Record<Section, string> = {
    jokers: t("jokers"),
    tarots: t("tarots"),
    planets: t("planets"),
    spectrals: t("spectrals"),
    vouchers: t("vouchers"),
    tags: t("tags"),
    bosses: t("bosses"),
    decks: t("decks"),
    stakes: t("stakes"),
    cards: `${t("enhancements")} / ${t("editions")} / ${t("seals")}`,
    hands: t("pokerHands"),
  };

  const query = q.trim().toLowerCase();
  const match = (...s: string[]) => !query || s.some((x) => x.toLowerCase().includes(query));

  const jokers = useMemo(
    () => JOKERS.filter((j) => (!rarity || j.rarity === rarity) && match(j.name, j.text.en, j.text.vi)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rarity, query],
  );

  const consOf = (kind: string) => CONS.filter((c) => c.kind === kind && match(c.name.en, c.text.en, c.text.vi));
  const jokersFound = JOKERS.filter((j) => found.has(j.key)).length;

  return (
    <div className="page-root">
      <Background colors={MENU_COLORS} />
      <div className="page wiki">
        <header className="page-head">
          <Link href="/" className="btn btn-orange small">
            ← {t("mainMenu")}
          </Link>
          <h1>{t("collection")}</h1>
          <input className="input search" placeholder="🔎 Joker, Tarot…" value={q} onChange={(e) => setQ(e.target.value)} />
        </header>
        <nav className="tabs page-tabs wrap">
          {SECTIONS.map((s) => (
            <button
              key={s}
              className={`tab ${section === s ? "on" : ""}`}
              onClick={() => {
                setSection(s);
                history.replaceState(null, "", `#${s}`);
              }}
            >
              {label[s]}
            </button>
          ))}
        </nav>

        {section === "jokers" && (
          <>
            <div className="filter-row">
              {[0, 1, 2, 3, 4].map((r) => (
                <button key={r} className={`chip-btn rar-${r} ${rarity === r ? "on" : ""}`} onClick={() => setRarity(r)}>
                  {r === 0 ? t("all") : RARITY_NAME[r][lang]}
                </button>
              ))}
              <span className="hint">
                {t("discovered")}: {jokersFound}/{JOKERS.length}
              </span>
            </div>
            <div className="wiki-grid">
              {jokers.map((j) => {
                const fj = fakeJoker(j.key);
                return (
                  <article key={j.key} className={`wiki-item ${found.has(j.key) ? "found" : ""}`} id={j.key}>
                    <JokerCard joker={fj} />
                    <div className="wi-text">
                      <h3>{j.name}</h3>
                      <span className={`badge rar-${j.rarity}`}>{RARITY_NAME[j.rarity][lang]}</span>
                      <span className="wi-cost">${j.cost}</span>
                      <p>
                        <Rich text={j.text[lang]} vars={j.vars?.(fj, null, lang)} />
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {(section === "tarots" || section === "planets" || section === "spectrals") && (
          <div className="wiki-grid">
            {consOf(section === "tarots" ? "tarot" : section === "planets" ? "planet" : "spectral").map((c) => (
              <article key={c.key} className={`wiki-item ${found.has(c.key) ? "found" : ""}`}>
                <ConsCard cons={{ key: c.key }} lang={lang} />
                <div className="wi-text">
                  <h3>{c.name[lang]}</h3>
                  {c.hand && <span className="badge k-planet">{tx(HANDS[c.hand].name)}</span>}
                  <p>
                    <Rich text={c.text[lang]} />
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {section === "vouchers" && (
          <div className="wiki-grid">
            {VOUCHERS.filter((v) => match(v.name.en, v.name.vi, v.text.en, v.text.vi)).map((v) => (
              <article key={v.key} className={`wiki-item ${found.has(v.key) ? "found" : ""}`}>
                <VoucherCard voucher={v.key} lang={lang} />
                <div className="wi-text">
                  <h3>{v.name[lang]}</h3>
                  {v.requires && <span className="badge k-voucher">{lang === "vi" ? "Cần" : "Requires"}: {VOUCHERS.find((x) => x.key === v.requires)?.name[lang]}</span>}
                  <p>
                    <Rich text={v.text[lang]} />
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {section === "tags" && (
          <div className="wiki-grid compact">
            {TAGS.filter((x) => match(x.name.en, x.name.vi, x.text.en, x.text.vi)).map((x) => (
              <article key={x.key} className={`wiki-item row ${found.has(x.key) ? "found" : ""}`}>
                <TagBadge tag={x.key} className="big" />
                <div className="wi-text">
                  <h3>{x.name[lang]}</h3>
                  <p>
                    <Rich text={x.text[lang]} />
                  </p>
                  {x.minAnte > 1 && <span className="hint">{t("ante")} ≥ {x.minAnte}</span>}
                </div>
              </article>
            ))}
          </div>
        )}

        {section === "bosses" && (
          <div className="wiki-grid compact">
            {BOSSES.filter((b) => match(b.name.en, b.name.vi, b.text.en, b.text.vi)).map((b) => (
              <article key={b.key} className="wiki-item row found">
                <BlindChip blind={2} boss={b.key} size={64} />
                <div className="wi-text">
                  <h3>
                    {b.name[lang]} {b.final && <span className="badge rar-4">Final</span>}
                  </h3>
                  <p>
                    <Rich text={b.text[lang]} />
                  </p>
                  <span className="hint">
                    {t("ante")} ≥ {b.minAnte} · {lang === "vi" ? "Điểm" : "Size"} ×{b.mult}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {section === "decks" && (
          <div className="wiki-grid compact">
            {DECKS.map((d) => (
              <article key={d.key} className="wiki-item row found">
                <div className="deck-card small" style={{ ["--deck" as string]: d.color }}>
                  <span className="back-pattern" />
                </div>
                <div className="wi-text">
                  <h3>{d.name[lang]}</h3>
                  <p>
                    <Rich text={d.text[lang]} />
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {section === "stakes" && (
          <div className="wiki-grid compact">
            {STAKES.map((s) => (
              <article key={s.n} className="wiki-item row found">
                <span className="stake-chip on big" style={{ ["--sc" as string]: s.color }}>
                  {s.n}
                </span>
                <div className="wi-text">
                  <h3>{s.name[lang]}</h3>
                  <p>
                    <Rich text={s.text[lang]} />
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {section === "cards" && (
          <div className="wiki-grid">
            {(Object.keys(ENH_NAME) as Enh[]).map((e) => (
              <article key={e} className="wiki-item found">
                <PlayingCard card={demoCard(13, "H", { enh: e })} />
                <div className="wi-text">
                  <h3>{ENH_NAME[e][lang]}</h3>
                  <span className="badge k-tarot">{t("enhancements")}</span>
                  <p>
                    <Rich text={ENH_TEXT[e][lang]} />
                  </p>
                </div>
              </article>
            ))}
            {(Object.keys(EDITION_NAME) as Edition[]).map((e) => (
              <article key={e} className="wiki-item found">
                <PlayingCard card={demoCard(14, "S", { ed: e })} />
                <div className="wi-text">
                  <h3>{EDITION_NAME[e][lang]}</h3>
                  <span className="badge ed-poly">{t("editions")}</span>
                  <p>
                    <Rich text={EDITION_TEXT[e][lang]} />
                  </p>
                </div>
              </article>
            ))}
            {(Object.keys(SEAL_NAME) as Seal[]).map((e) => (
              <article key={e} className="wiki-item found">
                <PlayingCard card={demoCard(7, "D", { seal: e })} />
                <div className="wi-text">
                  <h3>{SEAL_NAME[e][lang]}</h3>
                  <span className="badge k-spectral">{t("seals")}</span>
                  <p>
                    <Rich text={SEAL_TEXT[e][lang]} />
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {section === "hands" && (
          <div className="hand-table wiki-hands">
            {HAND_ORDER.map((h) => (
              <div key={h} className="ht-row">
                <span className="ht-name">{tx(HANDS[h].name)}</span>
                <span className="box chips sm">{HANDS[h].chips}</span>
                <span className="x">X</span>
                <span className="box mult sm">{HANDS[h].mult}</span>
                <span className="ht-played">
                  +{HANDS[h].lc} / +{HANDS[h].lm} {lang === "vi" ? "mỗi cấp" : "per level"}
                </span>
                <span className="ht-ex">{HANDS[h].example}</span>
              </div>
            ))}
          </div>
        )}
        <p className="disclaimer">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
