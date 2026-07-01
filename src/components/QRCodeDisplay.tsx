"use client";

import { useId } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Props = {
  value: string;
  size?: number;
  downloadName?: string;
};

export function QRCodeDisplay({ value, size = 256, downloadName = "qr-code" }: Props) {
  const canvasId = useId();

  const handleDownload = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    alert("URL이 클립보드에 복사되었습니다.");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
        <QRCodeCanvas id={canvasId} value={value} size={size} level="H" includeMargin />
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
