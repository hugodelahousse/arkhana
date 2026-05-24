import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Route } from "./+types/api.og";
import { CARD_BY_ID, RARITY_LABELS, type Rarity } from "../lib/cards";
import { cardImageUrl } from "../lib/cardImages";

const _require = createRequire(import.meta.url);

// Pre-converted TTF files committed to public/fonts/
// Server is always started from the project root, so process.cwd() is reliable
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 20,
            color: BONE_400,
            fontSize: 18,
            opacity: 0.4,
            fontFamily: "DM Sans",
          }}
        >
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
  const desc = (isReversed ? card.reversedDescriptions : card.descriptions)[
    rarity - 1
  ];
  const arcanaLabel =
    card.arcana === "major"
      ? "Major Arcana"
      : `${card.suit ? card.suit.charAt(0).toUpperCase() + card.suit.slice(1) : ""} · Minor Arcana`;

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
      {/* Left rarity accent bar */}
      <div
        style={{
          width: 4,
          height: "100%",
          background: rarityColor,
          flexShrink: 0,
          display: "flex",
        }}
      />

      {/* Card image panel */}
      <div
        style={{
          width: 300,
          height: 630,
          background: SURFACE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: "40px 30px",
          borderRight: `1px solid ${STONE}`,
        }}
      >
        {cardImage ? (
          <img
            src={cardImage}
            width={220}
            height={380}
            style={{
              objectFit: "contain",
              ...(isReversed ? { transform: "rotate(180deg)" } : {}),
              borderRadius: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 220,
              height: 380,
              background: STONE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: BONE_400,
                fontSize: 48,
                fontFamily: "Cormorant Garamond",
                opacity: 0.3,
              }}
            >
              ✦
            </span>
          </div>
        )}
      </div>

      {/* Card details panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 52px",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <p
            style={{
              fontSize: 12,
              letterSpacing: 4,
              color: BONE_400,
              fontFamily: "DM Sans",
              textTransform: "uppercase",
              opacity: 0.5,
              margin: 0,
            }}
          >
            {arcanaLabel}
          </p>
          <h1
            style={{
              fontSize: 64,
              color: BONE_100,
              fontFamily: "Cormorant Garamond",
              fontWeight: 400,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {card.name}
            {isReversed ? " ↓" : ""}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: 4,
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
                  fontSize: 11,
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
          <div
            style={{
              width: 32,
              height: 1,
              background: rarityColor,
              opacity: 0.5,
              display: "flex",
            }}
          />
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: BONE_400,
              fontFamily: "Cormorant Garamond",
              opacity: 0.85,
              margin: 0,
              maxWidth: 520,
            }}
          >
            {desc.length > 160 ? desc.slice(0, 157) + "…" : desc}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: 13,
              letterSpacing: 5,
              color: BONE_400,
              fontFamily: "DM Sans",
              textTransform: "uppercase",
              opacity: 0.35,
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
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
        <p
          style={{
            fontSize: 26,
            color: BONE_400,
            fontFamily: "DM Sans",
            margin: 0,
            opacity: 0.7,
          }}
        >
          {discovered}
          <span style={{ opacity: 0.4 }}>/{total}</span>{" "}
          <span
            style={{
              fontSize: 16,
              letterSpacing: 3,
              textTransform: "uppercase",
              opacity: 0.5,
            }}
          >
            cards discovered
          </span>
        </p>
        {/* Progress bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
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
                  pct >= 80
                    ? "#eab308"
                    : pct >= 50
                      ? "#f97316"
                      : pct >= 25
                        ? "#a855f7"
                        : "#60a5fa",
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
      <div
        style={{
          position: "absolute",
          bottom: 48,
          right: 120,
          display: "flex",
          alignItems: "center",
        }}
      >
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

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "app";
  const cardId = parseInt(url.searchParams.get("cardId") ?? "0", 10);
  const rarity = (parseInt(url.searchParams.get("rarity") ?? "1", 10) ||
    1) as Rarity;
  const isReversed = url.searchParams.get("reversed") === "true";
  const isRadiant = url.searchParams.get("radiant") === "true";
  const username = url.searchParams.get("username") ?? "arkhana";
  const discovered = parseInt(url.searchParams.get("discovered") ?? "0", 10);

  let element: React.ReactNode;

  if (type === "card") {
    const imgUrl = cardImageUrl(cardId);
    const cardImage = await fetchAsDataUri(imgUrl);
    element = (
      <CardOG
        cardId={cardId}
        rarity={rarity}
        isReversed={isReversed}
        isRadiant={isRadiant}
        cardImage={cardImage}
      />
    );
  } else if (type === "collection") {
    element = (
      <CollectionOG username={username} discovered={discovered} total={78} />
    );
  } else {
    element = <AppCard />;
  }

  const fonts = loadFonts();

  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts,
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng() as Uint8Array;

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
