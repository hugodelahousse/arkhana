const CDN = "https://cdn.jsdelivr.net/gh/metabismuth/tarot-json@master/cards";

export function cardImageUrl(cardId: number): string {
  let filename: string;
  if (cardId <= 21) {
    filename = `m${String(cardId).padStart(2, "0")}.jpg`;
  } else if (cardId <= 35) {
    filename = `w${String(cardId - 21).padStart(2, "0")}.jpg`;
  } else if (cardId <= 49) {
    filename = `c${String(cardId - 35).padStart(2, "0")}.jpg`;
  } else if (cardId <= 63) {
    filename = `s${String(cardId - 49).padStart(2, "0")}.jpg`;
  } else {
    filename = `p${String(cardId - 63).padStart(2, "0")}.jpg`;
  }
  return `${CDN}/${filename}`;
}
