import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Route } from "./+types/api.og";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, type Rarity } from "../lib/cards";
import { cardImageUrl } from "../lib/cardImages";

function getFonts(): Array<{ name: string; data: Buffer; weight: 400; style: "normal" }> {
  const fontsDir = resolve(process.cwd(), "public/fonts");
  return [
    { name: "Cormorant Garamond", data: readFileSync(resolve(fontsDir, "cormorant-garamond.ttf")), weight: 400, style: "normal" },
    { name: "DM Sans", data: readFileSync(resolve(fontsDir, "dm-sans.ttf")), weight: 400, style: "normal" },
  ];
}

let fontsCache: ReturnType<typeof getFonts> | null = null;
function loadFonts() {
  if (!fontsCache) fontsCache = getFonts();
  return fontsCache;
}

const RARITY_COLORS: Record<number, string> = {
  1: "#9ca3af",
  2: "#60a5fa",
  3: "#a855f7",
  4: "#f97316",
  5: "#eab308",
};

const BG = "#0a0a0f";
const SURFACE = "#13131a";
const BONE_100 = "#e8e4de";
const BONE_400 = "#b0aca6";
const STONE = "#303038";

const imageCache = new Map<string, string>();

async function fetchAsDataUri(url: string): Promise<string | null> {
  if (imageCache.has(url)) return imageCache.get(url)!;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    const uri = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
    imageCache.set(url, uri);
    return uri;
  } catch {
    return null;
  }
}

function AppCard() {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, #a855f7, #60a5fa, #a855f7)",
          display: "flex",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 20, color: BONE_400, fontSize: 18, opacity: 0.4, fontFamily: "DM Sans" }}>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
        </div>
        <h1
          style={{
            fontSize: 108,
            letterSpacing: 28,
            color: BONE_100,
            fontFamily: "Cormorant Garamond",
            fontWeight: 400,
            margin: 0,
            lineHeight: 1,
          }}
        >
          ARKHANA
        </h1>
        <p
          style={{
            fontSize: 18,
            letterSpacing: 5,
            color: BONE_400,
            fontFamily: "DM Sans",
            margin: 0,
            opacity: 0.6,
            textTransform: "uppercase",
          }}
        >
          Daily Tarot · One card. Every day.
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, #a855f7, #60a5fa, #a855f7)",
          display: "flex",
        }}
      />
    </div>
  );
}

// Card image fills the full height; text panel on the right
function CardOG({
  cardId,
  rarity,
  isReversed,
  isRadiant,
  cardImage,
}: {
  cardId: number;
  rarity: Rarity;
  isReversed: boolean;
  isRadiant: boolean;
  cardImage: string | null;
}) {
  const card = CARD_BY_ID[cardId];
  if (!card) return <AppCard />;

  const rarityColor = RARITY_COLORS[rarity] ?? BONE_400;
  const rarityLabel = RARITY_LABELS[rarity];

  // Card aspect ratio ~220:380 ≈ 0.579. At 630px height the natural width is ~365px.
  const CARD_W = 365;
  const CARD_H = 630;

  const arcanaLabel =
    card.arcana === "major"
      ? "Major Arcana"
      : `Minor Arcana · ${card.suit ? card.suit.charAt(0).toUpperCase() + card.suit.slice(1) : ""}`;

  const rawDescription = getCardDescription(card, rarity, isReversed);
  const description =
    rawDescription.length > 140 ? rawDescription.slice(0, 137) + "…" : rawDescription;

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: BG,
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Full-height card image */}
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          background: SURFACE,
          display: "flex",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {cardImage ? (
          <img
            src={cardImage}
            width={CARD_W}
            height={CARD_H}
            style={{
              objectFit: "cover",
              objectPosition: "center top",
              ...(isReversed ? { transform: "rotate(180deg)" } : {}),
            }}
          />
        ) : (
          <div
            style={{
              width: CARD_W,
              height: CARD_H,
              background: STONE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: BONE_400, fontSize: 64, fontFamily: "Cormorant Garamond", opacity: 0.2 }}>✦</span>
          </div>
        )}
        {/* Rarity color wash at the bottom of the card */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: rarityColor,
            display: "flex",
          }}
        />
      </div>

      {/* Right text panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
        }}
      >
        {/* Main content block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Arcana metadata */}
          <span
            style={{
              fontSize: 11,
              letterSpacing: 5,
              color: BONE_400,
              fontFamily: "DM Sans",
              textTransform: "uppercase",
              opacity: 0.4,
              marginBottom: 16,
            }}
          >
            {arcanaLabel}
          </span>

          {/* Card name — hero element */}
          <h1
            style={{
              fontSize: 80,
              color: BONE_100,
              fontFamily: "Cormorant Garamond",
              fontWeight: 400,
              margin: 0,
              lineHeight: 1.0,
              marginBottom: 20,
            }}
          >
            {card.name}
            {isReversed ? " ↓" : ""}
          </h1>

          {/* Rarity + radiant */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
            <span
              style={{
                fontSize: 13,
                letterSpacing: 5,
                color: rarityColor,
                fontFamily: "DM Sans",
                textTransform: "uppercase",
              }}
            >
              {rarityLabel}
            </span>
            {isRadiant && (
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: 3,
                  color: "#eab308",
                  fontFamily: "DM Sans",
                  textTransform: "uppercase",
                }}
              >
                ✦ Radiant
              </span>
            )}
          </div>

          {/* Rarity accent line */}
          <div
            style={{
              width: 40,
              height: 2,
              background: rarityColor,
              opacity: 0.6,
              display: "flex",
              marginBottom: 24,
            }}
          />

          {/* Rarity-matched description */}
          <p
            style={{
              fontSize: 19,
              color: BONE_400,
              fontFamily: "Cormorant Garamond",
              margin: 0,
              lineHeight: 1.55,
              opacity: 0.75,
            }}
          >
            {description}
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span
            style={{
              fontSize: 13,
              letterSpacing: 5,
              color: BONE_400,
              fontFamily: "DM Sans",
              textTransform: "uppercase",
              opacity: 0.3,
            }}
          >
            ARKHANA ✦
          </span>
        </div>
      </div>
    </div>
  );
}

function CollectionOG({
  username,
  discovered,
  total = 78,
}: {
  username: string;
  discovered: number;
  total?: number;
}) {
  const pct = Math.round((discovered / total) * 100);
  const progressWidth = Math.round((discovered / total) * 680);

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: BG,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 120px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, #a855f7, #60a5fa, #a855f7)",
          display: "flex",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <p
          style={{
            fontSize: 13,
            letterSpacing: 5,
            color: BONE_400,
            fontFamily: "DM Sans",
            textTransform: "uppercase",
            opacity: 0.4,
            margin: 0,
          }}
        >
          Arkhana · Collection
        </p>
        <h1
          style={{
            fontSize: 80,
            color: BONE_100,
            fontFamily: "Cormorant Garamond",
            fontWeight: 400,
            margin: 0,
            lineHeight: 1,
          }}
        >
          @{username}
        </h1>
        <p style={{ fontSize: 26, color: BONE_400, fontFamily: "DM Sans", margin: 0, opacity: 0.7 }}>
          {discovered}
          <span style={{ opacity: 0.4 }}>/{total}</span>{" "}
          <span style={{ fontSize: 16, letterSpacing: 3, textTransform: "uppercase", opacity: 0.5 }}>
            cards discovered
          </span>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              width: 680,
              height: 3,
              background: STONE,
              borderRadius: 2,
              display: "flex",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: progressWidth,
                height: "100%",
                background:
                  pct >= 80 ? "#eab308" : pct >= 50 ? "#f97316" : pct >= 25 ? "#a855f7" : "#60a5fa",
                display: "flex",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 3,
              color: BONE_400,
              fontFamily: "DM Sans",
              opacity: 0.35,
              textTransform: "uppercase",
            }}
          >
            {pct}% complete
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 48, right: 120, display: "flex", alignItems: "center" }}>
        <span
          style={{
            fontSize: 13,
            letterSpacing: 5,
            color: BONE_400,
            fontFamily: "DM Sans",
            textTransform: "uppercase",
            opacity: 0.25,
          }}
        >
          ARKHANA ✦
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, #a855f7, #60a5fa, #a855f7)",
          display: "flex",
        }}
      />
    </div>
  );
}

// 4-card spread: cards in a row, spread name on the right
function SpreadOG({
  spreadName,
  spreadSubtitle,
  positions,
  cardImages,
  rarities,
}: {
  spreadName: string;
  spreadSubtitle: string;
  positions: string[];
  cardImages: (string | null)[];
  rarities: number[];
}) {
  const count = positions.length;
  // Fit cards in the left ~560px with equal spacing
  const PANEL_W = 560;
  const CARD_H = 480;
  const gap = 12;
  const cardW = Math.floor((PANEL_W - gap * (count + 1)) / count);

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: BG,
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Cards panel */}
      <div
        style={{
          width: PANEL_W,
          height: 630,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap,
          flexShrink: 0,
          padding: `0 ${gap}px`,
        }}
      >
        {positions.map((label, i) => {
          const img = cardImages[i] ?? null;
          const rarityColor = RARITY_COLORS[rarities[i]] ?? BONE_400;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: cardW,
                  height: CARD_H,
                  background: SURFACE,
                  display: "flex",
                  position: "relative",
                  overflow: "hidden",
                  borderBottom: `3px solid ${rarityColor}`,
                }}
              >
                {img ? (
                  <img src={img} width={cardW} height={CARD_H} style={{ objectFit: "cover", objectPosition: "center top" }} />
                ) : (
                  <div
                    style={{
                      width: cardW,
                      height: CARD_H,
                      background: STONE,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: BONE_400, fontSize: 24, fontFamily: "Cormorant Garamond", opacity: 0.2 }}>✦</span>
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  color: BONE_400,
                  fontFamily: "DM Sans",
                  textTransform: "uppercase",
                  opacity: 0.5,
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: "100%", background: STONE, flexShrink: 0, display: "flex" }} />

      {/* Right text panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "56px 64px",
        }}
      >
        <p
          style={{
            fontSize: 13,
            letterSpacing: 5,
            color: BONE_400,
            fontFamily: "DM Sans",
            textTransform: "uppercase",
            opacity: 0.45,
            margin: 0,
            marginBottom: 24,
          }}
        >
          {spreadSubtitle}
        </p>
        <h1
          style={{
            fontSize: 52,
            color: BONE_100,
            fontFamily: "Cormorant Garamond",
            fontWeight: 400,
            margin: 0,
            lineHeight: 1.1,
            marginBottom: 32,
          }}
        >
          {spreadName}
        </h1>
        <div style={{ width: 40, height: 2, background: BONE_400, opacity: 0.25, display: "flex", marginBottom: "auto" }} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span
            style={{
              fontSize: 13,
              letterSpacing: 5,
              color: BONE_400,
              fontFamily: "DM Sans",
              textTransform: "uppercase",
              opacity: 0.3,
            }}
          >
            ARKHANA ✦
          </span>
        </div>
      </div>
    </div>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "app";
  const rawCardId = parseInt(url.searchParams.get("cardId") ?? "0", 10);
  const cardId = Number.isNaN(rawCardId) || rawCardId < 0 || rawCardId > 77 ? 0 : rawCardId;
  const rarity = (parseInt(url.searchParams.get("rarity") ?? "1", 10) || 1) as Rarity;
  const isReversed = url.searchParams.get("reversed") === "true";
  const isRadiant = url.searchParams.get("radiant") === "true";
  const username = url.searchParams.get("username") ?? "arkhana";
  const discovered = parseInt(url.searchParams.get("discovered") ?? "0", 10);

  let element: React.ReactNode;

  if (type === "card") {
    const imgUrl = cardImageUrl(cardId);
    const cardImage = await fetchAsDataUri(imgUrl);
    element = (
      <CardOG cardId={cardId} rarity={rarity} isReversed={isReversed} isRadiant={isRadiant} cardImage={cardImage} />
    );
  } else if (type === "collection") {
    element = <CollectionOG username={username} discovered={discovered} total={78} />;
  } else if (type === "spread") {
    // cardIds, rarities, reversed are comma-separated; positions is comma-separated labels
    const cardIds = (url.searchParams.get("cardIds") ?? "").split(",").map(Number).filter((n) => !isNaN(n));
    const rarityList = (url.searchParams.get("rarities") ?? "").split(",").map(Number);
    const _reversedList = (url.searchParams.get("reversals") ?? "").split(",").map((v) => v === "true");
    const positionLabels = (url.searchParams.get("positions") ?? "").split(",").filter(Boolean);
    const spreadName = url.searchParams.get("spreadName") ?? "Reading";
    const spreadSubtitle = url.searchParams.get("spreadSubtitle") ?? "";

    const cardImages = await Promise.all(
      positionLabels.map((_, i) => {
        const id = cardIds[i];
        return id != null ? fetchAsDataUri(cardImageUrl(id)) : Promise.resolve(null);
      })
    );

    element = (
      <SpreadOG
        spreadName={spreadName}
        spreadSubtitle={spreadSubtitle}
        positions={positionLabels}
        cardImages={cardImages}
        rarities={rarityList}
      />
    );
  } else {
    element = <AppCard />;
  }

  const fonts = loadFonts();

  const svg = await satori(element, { width: 1200, height: 630, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng() as Uint8Array;

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
