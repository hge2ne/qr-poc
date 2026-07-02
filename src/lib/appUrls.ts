export function getBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = process.env.BASE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return baseUrl.replace(/\/$/, "");
}

export function buildReservationDetailPath(reservationId: string): string {
  return `/reserve/${encodeURIComponent(reservationId)}`;
}

export function buildQrPath(qrToken: string): string {
  return `/verify/${encodeURIComponent(qrToken)}`;
}

export function buildReservationUrl(reservationId: string): string {
  return `${getBaseUrl()}${buildReservationDetailPath(reservationId)}`;
}

export function buildShortReservationUrl(reservationId: string): string {
  return `${getBaseUrl()}/r/${encodeURIComponent(reservationId)}`;
}

export function buildQrUrl(qrToken: string): string {
  return `${getBaseUrl()}${buildQrPath(qrToken)}`;
}

export function buildShortQrUrl(qrToken: string): string {
  return `${getBaseUrl()}/q/${encodeURIComponent(qrToken)}`;
}

function getPathSegments(url: string): string[] {
  const parsedUrl = new URL(url, getBaseUrl());
  return parsedUrl.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

export function toShortReservationUrl(url: string): string {
  try {
    const [prefix, reservationId] = getPathSegments(url);
    if ((prefix === "reserve" || prefix === "r") && reservationId) {
      return buildShortReservationUrl(reservationId);
    }
  } catch {
    return url;
  }
  return url;
}

export function toShortQrUrl(url: string): string {
  try {
    const [prefix, qrToken] = getPathSegments(url);
    if ((prefix === "verify" || prefix === "q") && qrToken) return buildShortQrUrl(qrToken);
  } catch {
    return url;
  }
  return url;
}
