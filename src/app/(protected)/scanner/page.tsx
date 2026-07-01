"use client";

import { verifyQRToken } from "@/actions/verify";
import { QRScanner } from "@/components/QRScanner";
import { useCallback, useEffect, useState } from "react";

type ScanResult = {
  success: boolean;
  attendeeName?: string;
  phone?: string;
  eventTitle?: string;
  enteredAt?: string;
  alreadyEntered?: boolean;
  error?: string;
};

const GATE_OPTIONS = [1, 2, 3, 4];

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android.*Mobile/i.test(ua)) return "Android 폰";
  if (/Android/i.test(ua)) return "Android 태블릿";
  if (/Macintosh/.test(ua)) return "Mac";
  return "PC";
}

export default function ScannerPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastToken, setLastToken] = useState("");
  const [gateNumber, setGateNumber] = useState<number | null>(null);
  const [deviceType, setDeviceType] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("scanner-device");
    if (saved) setGateNumber(Number(saved));
    setDeviceType(detectDevice());
    setMounted(true);
  }, []);

  const selectGate = (num: number) => {
    localStorage.setItem("scanner-device", String(num));
    setGateNumber(num);
  };

  const clearGate = () => {
    localStorage.removeItem("scanner-device");
    setGateNumber(null);
  };

  const handleScan = useCallback(
    async (decodedText: string) => {
      const parts = decodedText.split("/verify/");
      const token = parts[parts.length - 1]?.trim();
      if (!token || token === lastToken) return;

      setLastToken(token);
      setProcessing(true);
      setResult(null);

      const res = await verifyQRToken(token);
      setProcessing(false);

      if (!res.success) {
        setResult({ success: false, error: res.error });
      } else {
        setResult({ success: true, ...res.data });
      }

      setTimeout(() => setLastToken(""), 3000);
    },
    [lastToken]
  );

  if (!mounted) return null;

  // 게이트 미선택 — 선택 화면
  if (gateNumber === null) {
    return (
      <div className="max-w-sm mx-auto mt-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-1">기기 선택</h1>
        <p className="text-muted-foreground text-sm mb-2">이 기기의 번호를 선택하세요</p>
        {deviceType && (
          <p className="text-xs text-ring mb-8">감지된 기기: {deviceType}</p>
        )}
        <div className="grid grid-cols-2 gap-4">
          {GATE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => selectGate(n)}
              className="aspect-square flex flex-col items-center justify-center bg-card border-2 border-border rounded-2xl hover:border-primary hover:bg-accent transition-all group cursor-pointer"
            >
              <span className="text-5xl font-bold text-input group-hover:text-ring transition-colors">
                {n}
              </span>
              <span className="text-xs text-muted-foreground group-hover:text-primary mt-1">
                기기 {n}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">QR 스캐너</h1>
          <span className="bg-primary text-white text-sm font-bold px-3 py-1 rounded-full">
            기기 {gateNumber}
          </span>
          {deviceType && (
            <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">
              {deviceType}
            </span>
          )}
        </div>
        <button
          onClick={clearGate}
          className="text-xs text-muted-foreground hover:text-muted-foreground underline cursor-pointer shrink-0"
        >
          기기 변경
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5 items-start">
        {/* 카메라 프리뷰 */}
        <div>
          <QRScanner onScan={handleScan} />
        </div>

        {/* 스캔 결과 */}
        <div className="flex flex-col gap-3">
          {processing && (
            <div className="border border-accent bg-accent rounded-xl p-8 text-center">
              <div className="w-10 h-10 border-2 border-accent border-t-ring rounded-full animate-spin mx-auto mb-3" />
              <p className="text-primary font-medium text-sm">인증 처리 중...</p>
            </div>
          )}

          {!processing && !result && (
            <div className="border border-dashed border-input rounded-xl p-10 text-center text-muted-foreground">
              <div className="text-5xl mb-3 opacity-40">🎫</div>
              <p className="text-sm">QR 코드를 스캔하면</p>
              <p className="text-sm">결과가 여기에 표시됩니다</p>
            </div>
          )}

          {!processing && result && (
            <>
              {!result.success && (
                <div className="border border-destructive/30 bg-destructive/10 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">❌</div>
                  <p className="text-destructive font-semibold mb-1">인식 실패</p>
                  <p className="text-destructive text-sm">{result.error}</p>
                </div>
              )}

              {result.success && result.alreadyEntered && (
                <div className="border border-warning/40 bg-warning/10 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">⚠️</div>
                  <p className="text-warning-foreground font-semibold mb-3">이미 입장한 QR</p>
                  <p className="text-foreground font-bold text-xl">{result.attendeeName}</p>
                  <p className="text-muted-foreground text-sm mt-1">{result.phone}</p>
                  <p className="text-muted-foreground text-sm">{result.eventTitle}</p>
                  <div className="mt-3 bg-warning/20 rounded-lg px-3 py-1.5">
                    <p className="text-warning-foreground text-xs">
                      최초 입장:{" "}
                      {result.enteredAt &&
                        new Date(result.enteredAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              )}

              {result.success && !result.alreadyEntered && (
                <div className="border border-success/30 bg-success/10 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-success/90 font-semibold mb-3">입장 완료</p>
                  <p className="text-foreground font-bold text-2xl">{result.attendeeName}</p>
                  <p className="text-muted-foreground text-sm mt-1">{result.phone}</p>
                  <p className="text-muted-foreground text-sm">{result.eventTitle}</p>
                  <div className="mt-3 bg-success/15 rounded-lg px-3 py-1.5">
                    <p className="text-success/90 text-xs">
                      {result.enteredAt &&
                        new Date(result.enteredAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
