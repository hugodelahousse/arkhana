import { useEffect } from "react";

declare global {
  interface Window {
    kofiwidget2: {
      init: (text: string, color: string, id: string) => void;
      draw: () => void;
    };
  }
}

// Matches --accent in dark / light mode from tokens.css
const COLOR_DARK = "#a855f7";  // --purple-500
const COLOR_LIGHT = "#e8b931"; // --gold-300

function accentColor() {
  return document.documentElement.classList.contains("dark") ? COLOR_DARK : COLOR_LIGHT;
}

function drawWidget() {
  window.kofiwidget2.init("Support the Arkive", accentColor(), "R3S320EKF6");
  window.kofiwidget2.draw();
}

export function KofiWidget() {
  useEffect(() => {
    if (window.kofiwidget2) {
      drawWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
      script.async = true;
      script.onload = drawWidget;
      document.head.appendChild(script);
    }

    // Re-draw when the theme class flips between dark/light
    const observer = new MutationObserver(() => {
      if (window.kofiwidget2) drawWidget();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
