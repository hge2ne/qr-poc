"use client";

import { QRCodeCanvas } from "qrcode.react";

type Props = {
  value: string;
  size?: number;
  downloadName?: string;
};

const QR_CANVAS_ID = "qr-code-canvas";

export function QRCodeDisplay({ value, size = 256, downloadName = "qr-code" }: Props) {
  const handleDownload = () => {
    const canvas = document.getElementById(QR_CANVAS_ID) as HTMLCanvasElement | null;
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
      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <QRCodeCanvas id={QR_CANVAS_ID} value={value} size={size} level="H" includeMargin />
      </div>
      <p className="text-xs text-gray-400 break-all text-center max-w-xs">{value}</p>
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          PNG 다운로드
        </button>
        <button
          onClick={handleCopy}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          URL 복사
        </button>
      </div>
    </div>
  );
}
