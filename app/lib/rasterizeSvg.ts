const W = 376 * 2;
const H = 634 * 2;

const LAYER_CSS: Record<string, string> = {
  back: `[data-layer="fg"],[data-layer="text"]{display:none}`,
  front: `[data-layer="bg"],[data-layer="strokes"],[data-layer="border"]{display:none}` +
    `svg>rect{display:none}`,
};

export function rasterizeSvg(
  svg: string,
  layer?: "back" | "front",
): Promise<string> {
  let svgStr = svg;
  if (layer && LAYER_CSS[layer]) {
    svgStr = svgStr.replace("</defs>", `<style>${LAYER_CSS[layer]}</style></defs>`);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          reject(new Error("toBlob failed"));
        }
      }, "image/png");
    };
    img.onerror = () => reject(new Error("SVG image load failed"));
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  });
}
