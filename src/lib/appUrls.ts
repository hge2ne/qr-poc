function getBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = process.env.BASE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return baseUrl.replace(/\/$/, "");
}

export function buildShortReservationUrl(reservationId: string): string {
  return `${getBaseUrl()}/r/${encodeURIComponent(reservationId)}`;
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
    if (prefix === "reserve" && reservationId) return buildShortReservationUrl(reservationId);
  } catch {
    return url;
  }
  return url;
}

export function toShortQrUrl(url: string): string {
  try {
    const [prefix, qrToken] = getPathSegments(url);
    if (prefix === "verify" && qrToken) return buildShortQrUrl(qrToken);
  } catch {
    return url;
  }
  return url;
}
