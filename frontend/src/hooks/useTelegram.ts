declare global {
  interface Window {
    Telegram?: any;
  }
}

export function getTelegram() {
  return typeof window !== "undefined" ? window.Telegram?.WebApp : null;
}

export function tgReady() {
  const tg = getTelegram();
  if (tg) {
    try {
      tg.ready();
      tg.expand?.();
      tg.setHeaderColor?.("secondary_bg_color");
    } catch {}
  }
}

export function getStartParam(): string | null {
  const tg = getTelegram();
  return tg?.initDataUnsafe?.start_param || null;
}

export function shareInvite(link: string) {
  const tg = getTelegram();
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
    "Сыграем в шахматы! ♟",
  )}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
}

export function triggerHaptic(
  type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light",
) {
  const tg = getTelegram();
  try {
    if (type === "success" || type === "warning" || type === "error") {
      tg?.HapticFeedback?.notificationOccurred?.(type);
    } else {
      tg?.HapticFeedback?.impactOccurred?.(type);
    }
  } catch {}

  if ("vibrate" in navigator) {
    const pattern =
      type === "success"
        ? [12, 24, 28]
        : type === "warning" || type === "error"
          ? [30, 20, 30]
          : type === "heavy"
            ? 50
            : type === "medium"
              ? 30
              : 12;
    navigator.vibrate(pattern);
  }
}
