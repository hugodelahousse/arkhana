import { useState } from "react";
import { Export, Check } from "@phosphor-icons/react";
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
      className={buttonClass(size, "outline", "inline-flex items-center gap-2")}
      aria-label={copied ? "Link copied!" : label}
    >
      {copied ? (
        <><Check weight="light" size={13} aria-hidden />Copied!</>
      ) : (
        <><Export weight="light" size={13} aria-hidden />{label}</>
      )}
    </button>
  );
}
