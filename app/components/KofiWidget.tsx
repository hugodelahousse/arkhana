import { useEffect } from "react";

declare global {
  interface Window {
    kofiwidget2: {
      init: (text: string, color: string, id: string) => void;
      draw: () => void;
    };
  }
}

export function KofiWidget() {
  useEffect(() => {
    const init = () => {
      window.kofiwidget2.init("Support the Arkive", "#a855f7", "R3S320EKF6");
      window.kofiwidget2.draw();
    };

    if (window.kofiwidget2) {
      init();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  return null;
}
