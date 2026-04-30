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
