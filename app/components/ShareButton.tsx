import { useState } from "react";
import { buttonClass } from "./Button";

interface ShareButtonProps {
  title: string;
  url: string;
  text?: string;
  label?: string;
  size?: "sm" | "md";
}

export function ShareButton({
  title,
  url,
  text,
  label = "Share",
  size = "sm",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const fullUrl = new URL(url, globalThis.location?.href).toString();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: text || undefined, url: fullUrl });
        return;
      } catch {
        // user cancelled or API unavailable — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={buttonClass(size)}
      aria-label={copied ? "Link copied!" : label}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
