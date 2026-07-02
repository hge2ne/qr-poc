"use client";

import { useRef, type CSSProperties } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Props = {
  value: string;
  size?: number;
  downloadName?: string;
};

const MIN_RENDER_SIZE = 224;
const QR_FOREGROUND = "#000000";
const QR_BACKGROUND = "#ffffff";

const qrSurfaceStyle = {
  colorScheme: "only light",
  forcedColorAdjust: "none",
} satisfies CSSProperties;

const qrCanvasStyle = {
  display: "block",
  imageRendering: "pixelated",
  backgroundColor: QR_BACKGROUND,
} satisfies CSSProperties;

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getCompactQrValue(value: string): string {
  try {
    const isAbsoluteUrl = /^https?:\/\//i.test(value);
    const url = new URL(value, "https://qr.local");
    const segments = url.pathname.split("/").filter(Boolean).map(decodePathSegment);

    for (const prefix of ["verify", "q"]) {
      const index = segments.lastIndexOf(prefix);
      const token = segments[index + 1]?.trim();
      if (token) {
        const shortPath = `/q/${encodeURIComponent(token)}`;
        return isAbsoluteUrl ? `${url.origin}${shortPath}` : shortPath;
      }
    }
  } catch {
    return value;
  }

  return value;
}

export function QRCodeDisplay({ value, size = 256, downloadName = "qr-code" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrValue = getCompactQrValue(value);
  const renderSize = Math.max(size, MIN_RENDER_SIZE);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${downloadName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }, "image/png");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    alert("URL이 클립보드에 복사되었습니다.");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="p-4 bg-white rounded-xl border border-border shadow-sm"
        style={qrSurfaceStyle}
      >
        <QRCodeCanvas
          ref={canvasRef}
          value={qrValue}
          size={renderSize}
          level="M"
          marginSize={4}
          fgColor={QR_FOREGROUND}
          bgColor={QR_BACKGROUND}
          boostLevel={false}
          aria-label="입장 QR 코드"
          style={qrCanvasStyle}
        />
      </div>
      <p className="text-xs text-muted-foreground break-all text-center max-w-xs">{value}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          QR 다운로드
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-border transition-colors"
        >
          URL 복사
        </button>
      </div>
    </div>
  );
}
