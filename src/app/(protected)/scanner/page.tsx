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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">기기 선택</h1>
        <p className="text-gray-500 text-sm mb-2">이 기기의 번호를 선택하세요</p>
        {deviceType && (
          <p className="text-xs text-blue-500 mb-8">감지된 기기: {deviceType}</p>
        )}
        <div className="grid grid-cols-2 gap-4">
          {GATE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => selectGate(n)}
              className="aspect-square flex flex-col items-center justify-center bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group cursor-pointer"
            >
              <span className="text-5xl font-bold text-gray-300 group-hover:text-blue-500 transition-colors">
                {n}
              </span>
              <span className="text-xs text-gray-400 group-hover:text-blue-400 mt-1">
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
          <h1 className="text-2xl font-bold text-gray-900">QR 스캐너</h1>
          <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
            기기 {gateNumber}
          </span>
          {deviceType && (
            <span className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full">
              {deviceType}
            </span>
          )}
        </div>
        <button
          onClick={clearGate}
          className="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer shrink-0"
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
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-8 text-center">
              <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-blue-600 font-medium text-sm">인증 처리 중...</p>
            </div>
          )}

          {!processing && !result && (
            <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
              <div className="text-5xl mb-3 opacity-40">🎫</div>
              <p className="text-sm">QR 코드를 스캔하면</p>
              <p className="text-sm">결과가 여기에 표시됩니다</p>
            </div>
          )}

          {!processing && result && (
            <>
              {!result.success && (
                <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">❌</div>
                  <p className="text-red-600 font-semibold mb-1">인식 실패</p>
                  <p className="text-red-400 text-sm">{result.error}</p>
                </div>
              )}

              {result.success && result.alreadyEntered && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">⚠️</div>
                  <p className="text-yellow-700 font-semibold mb-3">이미 입장한 QR</p>
                  <p className="text-gray-900 font-bold text-xl">{result.attendeeName}</p>
                  <p className="text-gray-500 text-sm mt-1">{result.phone}</p>
                  <p className="text-gray-400 text-sm">{result.eventTitle}</p>
                  <div className="mt-3 bg-yellow-100 rounded-lg px-3 py-1.5">
                    <p className="text-yellow-700 text-xs">
                      최초 입장:{" "}
                      {result.enteredAt &&
                        new Date(result.enteredAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              )}

              {result.success && !result.alreadyEntered && (
                <div className="border border-green-200 bg-green-50 rounded-xl p-6 text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-green-700 font-semibold mb-3">입장 완료</p>
                  <p className="text-gray-900 font-bold text-2xl">{result.attendeeName}</p>
                  <p className="text-gray-500 text-sm mt-1">{result.phone}</p>
                  <p className="text-gray-400 text-sm">{result.eventTitle}</p>
                  <div className="mt-3 bg-green-100 rounded-lg px-3 py-1.5">
                    <p className="text-green-700 text-xs">
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
