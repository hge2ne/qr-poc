"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  value: string;
  size?: number;
  downloadName?: string;
};

export function QRCodeDisplay({ value, size = 256, downloadName = "qr-code" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${downloadName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    alert("URL이 클립보드에 복사되었습니다.");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
        <QRCodeSVG
          ref={svgRef}
          value={value}
          size={size}
          level="H"
          marginSize={4}
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
