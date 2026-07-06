"use client";

import { verifyQRToken } from "@/actions/verify";
import type { ScannerEntryEvent } from "@/actions/scannerTypes";
import { QRScanner } from "@/components/QRScanner";
import { ScannerManualEntry } from "@/components/ScannerManualEntry";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";

type ScanResult = {
  success: boolean;
  attendeeName?: string;
  phone?: string;
  eventTitle?: string;
  enteredAt?: string;
  alreadyEntered?: boolean;
  error?: string;
};

type ScannerClientProps = {
  initialEvents: ScannerEntryEvent[];
  initialEventsError?: string;
};

const GATE_OPTIONS = [1, 2, 3, 4];
const SCANNER_DEVICE_STORAGE_KEY = "scanner-device";
const SCANNER_DEVICE_CHANGE_EVENT = "scanner-device-change";
const SCANNER_EVENT_STORAGE_KEY = "scanner-event";
const SCANNER_EVENT_CHANGE_EVENT = "scanner-event-change";

function detectDevice(): string {
  const ua = navigator.userAgent;
  // iPadOS 13+ Safari 는 데스크톱 모드가 기본이라 userAgent 가 Macintosh 로 보고됩니다.
  // 실제 Mac 은 maxTouchPoints 가 0, iPad 는 5 이상이므로 터치 지원으로 구분합니다.
  const isIPad =
    /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIPad) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android.*Mobile/i.test(ua)) return "Android 폰";
  if (/Android/i.test(ua)) return "Android 태블릿";
  if (/Macintosh/.test(ua)) return "Mac";
  return "PC";
}

function shouldPreferRearCamera(deviceType: string): boolean {
  return deviceType === "iPhone" || deviceType.startsWith("Android");
}

function getStoredGateNumber(): number | null {
  if (typeof window === "undefined") return null;

  const saved = localStorage.getItem(SCANNER_DEVICE_STORAGE_KEY);
  if (!saved) return null;

  const gateNumber = Number(saved);
  return GATE_OPTIONS.includes(gateNumber) ? gateNumber : null;
}

function getStoredEventId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SCANNER_EVENT_STORAGE_KEY) ?? "";
}

function subscribeGateNumber(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SCANNER_DEVICE_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SCANNER_DEVICE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SCANNER_DEVICE_CHANGE_EVENT, onStoreChange);
  };
}

function subscribeEventId(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SCANNER_EVENT_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SCANNER_EVENT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SCANNER_EVENT_CHANGE_EVENT, onStoreChange);
  };
}

function subscribeToHydration(onStoreChange: () => void) {
  onStoreChange();
  return () => {};
}

function formatEventDate(value: string): string {
  return new Date(value).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventMeta(event: ScannerEntryEvent): string {
  return [formatEventDate(event.date), event.campus, event.round, event.location]
    .filter(Boolean)
    .join(" · ");
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function extractTokenFromPath(path: string): string {
  const pathname = path.split(/[?#]/)[0] ?? "";
  const segments = pathname.split("/").filter(Boolean).map(decodePathSegment);

  for (const prefix of ["verify", "q"]) {
    const index = segments.lastIndexOf(prefix);
    if (index === -1) continue;
    const token = segments[index + 1]?.trim();
    if (token) return token;
  }

  return "";
}

function extractQrToken(decodedText: string): string {
  const text = decodedText.trim();
  if (!text) return "";

  try {
    const url = new URL(text, "https://qr.local");
    const token = extractTokenFromPath(url.pathname);
    if (token) return token;
  } catch {
    const token = extractTokenFromPath(text);
    if (token) return token;
  }

  return text;
}

function ScanResultPanel({
  processing,
  result,
}: {
  processing: boolean;
  result: ScanResult | null;
}) {
  if (processing) {
    return (
      <div className="border border-accent bg-accent rounded-xl p-8 text-center">
        <div className="w-10 h-10 border-2 border-accent border-t-ring rounded-full animate-spin mx-auto mb-3" />
        <p className="text-primary font-medium text-sm">인증 처리 중...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="border border-dashed border-input rounded-xl p-8 text-center text-muted-foreground">
        <div className="text-5xl mb-3 opacity-40">🎫</div>
        <p className="text-sm">QR 코드를 스캔하면</p>
        <p className="text-sm">결과가 여기에 표시됩니다</p>
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="border border-destructive/30 bg-destructive/10 rounded-xl p-6 text-center">
        <div className="text-5xl mb-3">❌</div>
        <p className="text-destructive font-semibold mb-1">인식 실패</p>
        <p className="text-destructive text-sm">{result.error}</p>
      </div>
    );
  }

  if (result.alreadyEntered) {
    return (
      <div className="border border-warning/40 bg-warning/10 rounded-xl p-6 text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <p className="text-warning-foreground font-semibold mb-3">이미 입장한 QR</p>
        <p className="text-foreground font-bold text-xl">{result.attendeeName}</p>
        <p className="text-muted-foreground text-sm mt-1">{result.phone}</p>
        <p className="text-muted-foreground text-sm">{result.eventTitle}</p>
        <div className="mt-3 bg-warning/20 rounded-lg px-3 py-1.5">
          <p className="text-warning-foreground text-xs">
            최초 입장:{" "}
            {result.enteredAt && new Date(result.enteredAt).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-success/30 bg-success/10 rounded-xl p-6 text-center">
      <div className="text-5xl mb-3">✅</div>
      <p className="text-success/90 font-semibold mb-3">입장 완료</p>
      <p className="text-foreground font-bold text-2xl">{result.attendeeName}</p>
      <p className="text-muted-foreground text-sm mt-1">{result.phone}</p>
      <p className="text-muted-foreground text-sm">{result.eventTitle}</p>
      <div className="mt-3 bg-success/15 rounded-lg px-3 py-1.5">
        <p className="text-success/90 text-xs">
          {result.enteredAt && new Date(result.enteredAt).toLocaleString("ko-KR")}
        </p>
      </div>
    </div>
  );
}

export function ScannerClient({ initialEvents, initialEventsError }: ScannerClientProps) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const lastTokenRef = useRef("");
  const processingRef = useRef(false);
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const gateNumber = useSyncExternalStore(
    subscribeGateNumber,
    getStoredGateNumber,
    () => null
  );
  const storedEventId = useSyncExternalStore(subscribeEventId, getStoredEventId, () => "");
  const deviceType = useSyncExternalStore(
    subscribeToHydration,
    () => (typeof navigator === "undefined" ? "" : detectDevice()),
    () => ""
  );

  const selectedEvent = useMemo(
    () => initialEvents.find((event) => event.id === storedEventId) ?? null,
    [initialEvents, storedEventId]
  );
  const selectedEventId = selectedEvent?.id ?? "";
  const preferRearCamera = shouldPreferRearCamera(deviceType);

  const selectGate = (num: number) => {
    localStorage.setItem(SCANNER_DEVICE_STORAGE_KEY, String(num));
    window.dispatchEvent(new Event(SCANNER_DEVICE_CHANGE_EVENT));
  };

  const clearGate = () => {
    localStorage.removeItem(SCANNER_DEVICE_STORAGE_KEY);
    window.dispatchEvent(new Event(SCANNER_DEVICE_CHANGE_EVENT));
  };

  const selectEvent = (eventId: string) => {
    setResult(null);
    if (eventId) {
      localStorage.setItem(SCANNER_EVENT_STORAGE_KEY, eventId);
      window.dispatchEvent(new Event(SCANNER_EVENT_CHANGE_EVENT));
      return;
    }
    localStorage.removeItem(SCANNER_EVENT_STORAGE_KEY);
    window.dispatchEvent(new Event(SCANNER_EVENT_CHANGE_EVENT));
  };

  const handleScan = useCallback(
    async (decodedText: string) => {
      if (!selectedEventId) {
        setResult({ success: false, error: "설명회 회차를 선택해 주세요." });
        return;
      }

      const token = extractQrToken(decodedText);
      if (!token || token === lastTokenRef.current || processingRef.current) return;

      lastTokenRef.current = token;
      processingRef.current = true;
      setProcessing(true);
      setResult(null);

      try {
        const res = await verifyQRToken(token, selectedEventId);

        if (!res.success) {
          setResult({ success: false, error: res.error });
        } else {
          setResult({ success: true, ...res.data });
        }
      } catch {
        setResult({ success: false, error: "QR 처리 중 오류가 발생했습니다." });
      } finally {
        processingRef.current = false;
        setProcessing(false);

        setTimeout(() => {
          if (lastTokenRef.current === token) lastTokenRef.current = "";
        }, 2500);
      }
    },
    [selectedEventId]
  );

  if (!mounted) return null;

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">태블릿 QR</h1>
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
          className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer shrink-0"
        >
          기기 변경
        </button>
      </div>

      <section className="mb-5 rounded-xl border border-border bg-card p-4">
        <label htmlFor="scanner-event" className="block text-sm font-medium text-foreground mb-1">
          설명회 회차
        </label>
        <select
          id="scanner-event"
          value={selectedEventId}
          onChange={(event) => selectEvent(event.target.value)}
          className="w-fit max-w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50"
          disabled={initialEvents.length === 0}
        >
          <option value="">설명회 선택</option>
          {initialEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} · {eventMeta(event)}
            </option>
          ))}
        </select>
        {selectedEvent && (
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedEvent.title} · {eventMeta(selectedEvent)}
          </p>
        )}
        {initialEventsError && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {initialEventsError}
          </p>
        )}
      </section>

      {!selectedEvent ? (
        <div className="rounded-xl border border-dashed border-input bg-card px-5 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            설명회 회차를 선택하면 스캐너가 활성화됩니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr] gap-5 items-start">
          <div className="flex flex-col gap-3">
            <QRScanner onScan={handleScan} preferRearCamera={preferRearCamera} />
            <ScanResultPanel processing={processing} result={result} />
          </div>

          <ScannerManualEntry
            key={selectedEvent.id}
            selectedEvent={selectedEvent}
            onEntryComplete={(entryResult) =>
              setResult({ success: true, ...entryResult })
            }
          />
        </div>
      )}
    </div>
  );
}
