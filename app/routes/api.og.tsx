import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Route } from "./+types/api.og";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, type Rarity } from "../lib/cards";
import { cardImageUrl } from "../lib/cardImages";

function getFonts() {
  const fontsDir = resolve(process.cwd(), "public/fonts");
  return [
    { name: "Cormorant Garamond", data: readFileSync(resolve(fontsDir, "cormorant-garamond.ttf")), weight: 400 as const, style: "normal" as const },
    { name: "Cormorant Garamond", data: readFileSync(resolve(fontsDir, "cormorant-garamond-semibold.ttf")), weight: 600 as const, style: "normal" as const },
    { name: "DM Sans", data: readFileSync(resolve(fontsDir, "dm-sans.ttf")), weight: 400 as const, style: "normal" as const },
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
const ACCENT_GRADIENT = "linear-gradient(90deg, #a855f7, #60a5fa, #a855f7)";

// ─── Shared SVG ──────────────────────────────────────────────────────────────

function SparkleFill({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94L146,178l-19,51.62a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88L78,110l19-51.62a15.92,15.92,0,0,1,29.88,0L146,110l51.62,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z" />
    </svg>
  );
}

// ─── Shared layout primitives ─────────────────────────────────────────────────

/** Purple radial glow overlay — used by pulls/spreads to evoke the mystical */
function RadialGlow() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168, 85, 247, 0.15) 0%, rgba(10, 10, 15, 0) 70%)",
      }}
    />
  );
}

/** Top + bottom 2px accent bars — used by branding/collection cards */
function TopBottomBars() {
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: ACCENT_GRADIENT, display: "flex" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: ACCENT_GRADIENT, display: "flex" }} />
    </>
  );
}

/** Small dimmed uppercase tracking label */
function OGLabel({ children, mb = 0 }: { children: React.ReactNode; mb?: number }) {
  return (
    <p
      style={{
        fontSize: 12,
        letterSpacing: 5,
        color: BONE_400,
        fontFamily: "DM Sans",
        textTransform: "uppercase",
        opacity: 0.4,
        margin: 0,
        marginBottom: mb,
      }}
    >
      {children}
    </p>
  );
}

/** ARKHANA ✦ watermark — standardized across all previews */
function OGBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        ARKHANA
      </span>
      <SparkleFill size={12} color={BONE_400} />
    </div>
  );
}

/**
 * Footer row used by all content previews.
 * Left side shows optional attribution (@user / date), right side is the ARKHANA brand.
 */
function OGFooter({ attribution }: { attribution?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span
        style={{
          fontSize: 14,
          letterSpacing: 3,
          color: BONE_400,
          fontFamily: "DM Sans",
          textTransform: "uppercase",
          opacity: 0.45,
        }}
      >
        {attribution ?? ""}
      </span>
      <OGBrand />
    </div>
  );
}

/**
 * Single card image tile with rarity accent bar and optional reversed rotation.
 * Used at large size in CardOG and smaller sizes in SpreadOG.
 */
function CardTile({
  width,
  height,
  image,
  rarityColor,
  isReversed = false,
}: {
  width: number;
  height: number;
  image: string | null;
  rarityColor: string;
  isReversed?: boolean;
}) {
  return (
    <div
      style={{
        width,
        height,
        background: SURFACE,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {image ? (
        <img
          src={image}
          width={width}
          height={height}
          style={{
            objectFit: "cover",
            objectPosition: "center top",
            ...(isReversed ? { transform: "rotate(180deg)" } : {}),
          }}
        />
      ) : (
        <div
          style={{
            width,
            height,
            background: STONE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SparkleFill size={Math.max(24, Math.min(48, Math.floor(width / 4)))} color={BONE_400} />
        </div>
      )}
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
  );
}

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

// ─── Preview components ───────────────────────────────────────────────────────

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
      <TopBottomBars />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 20, opacity: 0.4 }}>
          <SparkleFill size={18} color={BONE_400} />
          <SparkleFill size={18} color={BONE_400} />
          <SparkleFill size={18} color={BONE_400} />
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
    </div>
  );
}

function CardOG({
  cardId,
  rarity,
  isReversed,
  isRadiant,
  cardImage,
  username,
  date,
}: {
  cardId: number;
  rarity: Rarity;
  isReversed: boolean;
  isRadiant: boolean;
  cardImage: string | null;
  username: string | null;
  date: string | null;
}) {
  const card = CARD_BY_ID[cardId];
  if (!card) return <AppCard />;

  const rarityColor = RARITY_COLORS[rarity] ?? BONE_400;
  const rarityLabel = RARITY_LABELS[rarity];
  const description = getCardDescription(card, rarity, isReversed);
  const attribution = [username ? `@${username}` : null, date].filter(Boolean).join("  /  ") || undefined;

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
      <RadialGlow />
      <CardTile width={365} height={630} image={cardImage} rarityColor={rarityColor} isReversed={isReversed} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1
            style={{
              fontSize: 80,
              color: BONE_100,
              fontFamily: "Cormorant Garamond",
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.0,
              marginBottom: 18,
            }}
          >
            {card.name}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
            {isReversed && (
              <span style={{ fontSize: 24, letterSpacing: 4, color: BONE_400, fontFamily: "DM Sans", textTransform: "uppercase" }}>
                Reversed
              </span>
            )}
            <span style={{ fontSize: 24, letterSpacing: 4, color: rarityColor, fontFamily: "DM Sans", textTransform: "uppercase" }}>
              {rarityLabel}
            </span>
            {isRadiant && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SparkleFill size={20} color="#eab308" />
                <span style={{ fontSize: 24, letterSpacing: 3, color: "#eab308", fontFamily: "DM Sans", textTransform: "uppercase" }}>
                  Radiant
                </span>
              </div>
            )}
          </div>

          <div style={{ width: 48, height: 2, background: rarityColor, display: "flex", marginBottom: 24 }} />

          <p style={{ fontSize: 28, color: BONE_400, fontFamily: "DM Sans", margin: 0, lineHeight: 1.55 }}>
            {description}
          </p>
        </div>

        <OGFooter attribution={attribution} />
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
  const progressColor = pct >= 80 ? "#eab308" : pct >= 50 ? "#f97316" : pct >= 25 ? "#a855f7" : "#60a5fa";

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: BG,
        display: "flex",
        flexDirection: "column",
        padding: "48px 120px",
        position: "relative",
      }}
    >
      <TopBottomBars />
      {/* Content — vertically centered in remaining space */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
        <OGLabel>Arkhana · Collection</OGLabel>
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
            <div style={{ width: progressWidth, height: "100%", background: progressColor, display: "flex" }} />
          </div>
          <span style={{ fontSize: 12, letterSpacing: 3, color: BONE_400, fontFamily: "DM Sans", opacity: 0.35, textTransform: "uppercase" }}>
            {pct}% complete
          </span>
        </div>
      </div>
      <OGFooter />
    </div>
  );
}

function SpreadOG({
  spreadName,
  spreadSubtitle,
  positions,
  cardImages,
  rarities,
  cardIds,
  reversals,
  username,
  date,
}: {
  spreadName: string;
  spreadSubtitle: string;
  positions: string[];
  cardImages: (string | null)[];
  rarities: number[];
  cardIds: number[];
  reversals: boolean[];
  username: string | null;
  date: string | null;
}) {
  const count = positions.length;
  const PANEL_W = 560;
  const CARD_H = 452;
  const gap = 12;
  const cardW = Math.floor((PANEL_W - gap * (count + 1)) / count);

  const cardNames = cardIds.map((id) => CARD_BY_ID[id]?.name ?? "");
  const attribution = [username ? `@${username}` : null, date].filter(Boolean).join("  /  ") || undefined;

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
      <RadialGlow />

      {/* Cards strip */}
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
          const rarityColor = RARITY_COLORS[rarities[i]] ?? BONE_400;
          const reversed = reversals[i] ?? false;
          const cardName = cardNames[i] ?? "";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <CardTile width={cardW} height={CARD_H} image={cardImages[i] ?? null} rarityColor={rarityColor} isReversed={reversed} />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: BONE_400,
                  fontFamily: "DM Sans",
                  textTransform: "uppercase",
                  opacity: 0.4,
                }}
              >
                {label}
              </span>
              {cardName && (
                <span
                  style={{
                    fontSize: 11,
                    color: BONE_100,
                    fontFamily: "Cormorant Garamond",
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.2,
                    opacity: 0.8,
                  }}
                >
                  {cardName}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: "100%", background: STONE, flexShrink: 0, display: "flex" }} />

      {/* Right panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <OGLabel mb={20}>{spreadSubtitle}</OGLabel>
          <h1
            style={{
              fontSize: 52,
              color: BONE_100,
              fontFamily: "Cormorant Garamond",
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.0,
              marginBottom: 20,
            }}
          >
            {spreadName}
          </h1>
          <div
            style={{
              width: 40,
              height: 2,
              background: "linear-gradient(90deg, #a855f7, #60a5fa)",
              display: "flex",
              marginBottom: 28,
            }}
          />
          {/* Position → card name list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {positions.map((label, i) => {
              const cardName = cardNames[i] ?? "";
              const rarityColor = RARITY_COLORS[rarities[i]] ?? BONE_400;
              const reversed = reversals[i] ?? false;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: 4,
                      color: BONE_400,
                      fontFamily: "DM Sans",
                      textTransform: "uppercase",
                      opacity: 0.4,
                    }}
                  >
                    {label}
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span
                      style={{
                        fontSize: 26,
                        color: rarityColor,
                        fontFamily: "Cormorant Garamond",
                        fontWeight: 600,
                        lineHeight: 1,
                      }}
                    >
                      {cardName}
                    </span>
                    {reversed && (
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: 3,
                          color: BONE_400,
                          fontFamily: "DM Sans",
                          textTransform: "uppercase",
                          opacity: 0.45,
                        }}
                      >
                        Reversed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <OGFooter attribution={attribution} />
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
    const cardUsername = url.searchParams.get("username") ?? null;
    const cardDate = url.searchParams.get("date") ?? null;
    element = (
      <CardOG cardId={cardId} rarity={rarity} isReversed={isReversed} isRadiant={isRadiant} cardImage={cardImage} username={cardUsername} date={cardDate} />
    );
  } else if (type === "collection") {
    element = <CollectionOG username={username} discovered={discovered} total={78} />;
  } else if (type === "spread") {
    const cardIds = (url.searchParams.get("cardIds") ?? "").split(",").map(Number).filter((n) => !isNaN(n));
    const rarityList = (url.searchParams.get("rarities") ?? "").split(",").map(Number);
    const reversedList = (url.searchParams.get("reversals") ?? "").split(",").map((v) => v === "true");
    const positionLabels = (url.searchParams.get("positions") ?? "").split(",").filter(Boolean);
    const spreadName = url.searchParams.get("spreadName") ?? "Reading";
    const spreadSubtitle = url.searchParams.get("spreadSubtitle") ?? "";
    const spreadUsername = url.searchParams.get("username") ?? null;
    const spreadDate = url.searchParams.get("date") ?? null;

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
        cardIds={cardIds}
        reversals={reversedList}
        username={spreadUsername}
        date={spreadDate}
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
