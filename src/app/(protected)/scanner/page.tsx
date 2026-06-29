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
        return;
      }
      setResult({ success: true, ...res.data });

      // 3초 후 다음 스캔을 위해 마지막 토큰 초기화
      setTimeout(() => setLastToken(""), 3000);
    },
    [lastToken]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">QR 스캐너</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">카메라 스캔</h2>
          <QRScanner onScan={handleScan} />
        </div>

        <div>
          {processing && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-blue-600 font-medium">처리 중...</p>
            </div>
          )}

          {!processing && !result && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-400">
              <div className="text-4xl mb-3">📷</div>
              <p>QR 코드를 스캔하면</p>
              <p>여기에 결과가 표시됩니다</p>
            </div>
          )}

          {!processing && result && (
            <div
              className={`border rounded-xl p-8 text-center ${
                !result.success
                  ? "bg-red-50 border-red-200"
                  : result.alreadyEntered
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              {!result.success ? (
                <>
                  <div className="text-5xl mb-3">❌</div>
                  <p className="text-red-600 font-semibold text-lg mb-1">인식 실패</p>
                  <p className="text-red-500 text-sm">{result.error}</p>
                </>
              ) : result.alreadyEntered ? (
                <>
                  <div className="text-5xl mb-3">⚠️</div>
                  <p className="text-yellow-700 font-semibold text-lg mb-3">이미 입장한 QR</p>
                  <p className="text-gray-900 font-bold text-xl">{result.attendeeName}</p>
                  <p className="text-gray-500 text-sm mt-1">{result.phone}</p>
                  <p className="text-gray-500 text-sm">{result.eventTitle}</p>
                  <p className="text-yellow-600 text-xs mt-2">
                    최초 입장: {result.enteredAt && new Date(result.enteredAt).toLocaleString("ko-KR")}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-green-700 font-semibold text-lg mb-3">입장 완료</p>
                  <p className="text-gray-900 font-bold text-2xl">{result.attendeeName}</p>
                  <p className="text-gray-500 text-sm mt-1">{result.phone}</p>
                  <p className="text-gray-500 text-sm">{result.eventTitle}</p>
                  <p className="text-green-600 text-xs mt-2">
                    {result.enteredAt && new Date(result.enteredAt).toLocaleString("ko-KR")}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
