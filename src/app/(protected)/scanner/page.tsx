"use client";

import { verifyQRToken } from "@/actions/verify";
import { QRScanner } from "@/components/QRScanner";
import { useCallback, useState } from "react";

type ScanResult = {
  success: boolean;
  attendeeName?: string;
  phone?: string;
  eventTitle?: string;
  enteredAt?: string;
  alreadyEntered?: boolean;
  error?: string;
};

export default function ScannerPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastToken, setLastToken] = useState("");

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

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">QR 스캐너</h1>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5 items-start">
        {/* 카메라 프리뷰 */}
        <div>
          <QRScanner onScan={handleScan} />
        </div>

        {/* 스캔 결과 */}
        <div className="flex flex-col gap-3">
          {/* 처리 중 */}
          {processing && (
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-8 text-center">
              <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-blue-600 font-medium text-sm">인증 처리 중...</p>
            </div>
          )}

          {/* 대기 상태 */}
          {!processing && !result && (
            <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
              <div className="text-5xl mb-3 opacity-40">🎫</div>
              <p className="text-sm">QR 코드를 스캔하면</p>
              <p className="text-sm">결과가 여기에 표시됩니다</p>
            </div>
          )}

          {/* 결과 카드 */}
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
                      최초 입장: {result.enteredAt && new Date(result.enteredAt).toLocaleString("ko-KR")}
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
                      {result.enteredAt && new Date(result.enteredAt).toLocaleString("ko-KR")}
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
