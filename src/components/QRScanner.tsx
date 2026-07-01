"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onScan: (decodedText: string) => void;
};

type ScannerStatus = "loading" | "active" | "error";

export function QRScanner({ onScan }: Props) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const initialized = useRef(false);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode("qr-preview");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          (text) => onScanRef.current(text),
          () => {}
        )
        .then(() => setStatus("active"))
        .catch(() => {
          setStatus("error");
          setErrorMsg("카메라 접근 권한을 허용해 주세요.");
        });
    });

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
      {/* html5-qrcode 가 여기에 video 엘리먼트를 주입합니다 */}
      <div id="qr-preview" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

      {/* 로딩 오버레이 */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/70 text-sm">카메라 시작 중...</p>
        </div>
      )}

      {/* 오류 오버레이 */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 p-6">
          <span className="text-4xl">📷</span>
          <p className="text-white font-medium">카메라 권한 필요</p>
          <p className="text-white/60 text-sm text-center">{errorMsg}</p>
        </div>
      )}

      {/* 스캔 영역 코너 마커 + 스캔 라인 */}
      {status === "active" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-56 h-56">
            {/* 코너 마커 */}
            <span className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-md" />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-md" />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-md" />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-md" />
            {/* 스캔 라인 애니메이션 */}
            <span className="absolute left-2 right-2 h-px bg-primary/80 shadow-[0_0_6px_2px_rgba(96,165,250,0.5)] animate-[scanline_2s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* 하단 안내 텍스트 */}
      {status === "active" && (
        <p className="absolute bottom-3 left-0 right-0 text-center text-white/60 text-xs">
          QR 코드를 사각형 안에 맞춰주세요
        </p>
      )}
    </div>
  );
}
