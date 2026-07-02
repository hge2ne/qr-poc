"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode, Html5QrcodeCameraScanConfig } from "html5-qrcode";

type Props = {
  onScan: (decodedText: string) => void;
};

type ScannerStatus = "loading" | "active" | "error";
type TorchCapability = {
  isSupported: () => boolean;
  apply: (value: boolean) => Promise<void>;
  value: () => boolean | null;
};

const CAMERA_START_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
};

const CAMERA_QUALITY_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30, max: 30 },
};

const SCAN_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 20,
  disableFlip: false,
  qrbox: (viewfinderWidth, viewfinderHeight) => {
    const shortestEdge = Math.min(viewfinderWidth, viewfinderHeight);
    const maxSize = Math.max(120, shortestEdge - 24);
    const preferredSize = Math.max(220, Math.floor(shortestEdge * 0.78));
    const size = Math.min(maxSize, preferredSize);

    return { width: size, height: size };
  },
};

async function stopScanner(scanner: Html5Qrcode) {
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
    scanner.clear();
  } catch {
    // Camera teardown can race with route changes or permission prompts.
  }
}

export function QRScanner({ onScan }: Props) {
  const generatedId = useId();
  const previewId = `qr-preview-${generatedId.replaceAll(":", "")}`;
  const onScanRef = useRef(onScan);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const torchCapabilityRef = useRef<TorchCapability | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchChanging, setTorchChanging] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(previewId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = scanner;

        await scanner.start(
          CAMERA_START_CONSTRAINTS,
          SCAN_CONFIG,
          (text) => onScanRef.current(text),
          () => {}
        );

        if (cancelled) {
          await stopScanner(scanner);
          return;
        }

        try {
          await scanner.applyVideoConstraints(CAMERA_QUALITY_CONSTRAINTS);
        } catch {
          // Some Android WebViews reject quality upgrades after permission.
          // Keep the scanner running with the browser-selected camera settings.
        }

        try {
          const torchCapability = scanner
            .getRunningTrackCameraCapabilities()
            .torchFeature() as TorchCapability;
          if (torchCapability.isSupported()) {
            torchCapabilityRef.current = torchCapability;
            setTorchSupported(true);
            setTorchOn(Boolean(torchCapability.value()));
          }
        } catch {
          torchCapabilityRef.current = null;
          setTorchSupported(false);
        }

        setStatus("active");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("카메라 접근 권한을 허용해 주세요.");
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      torchCapabilityRef.current = null;
      setTorchSupported(false);
      setTorchOn(false);
      if (scanner) void stopScanner(scanner);
    };
  }, [previewId]);

  const handleToggleTorch = useCallback(async () => {
    const torchCapability = torchCapabilityRef.current;
    if (!torchCapability || torchChanging) return;

    const nextValue = !torchOn;
    setTorchChanging(true);
    try {
      await torchCapability.apply(nextValue);
      setTorchOn(nextValue);
    } catch {
      setTorchSupported(false);
      torchCapabilityRef.current = null;
    } finally {
      setTorchChanging(false);
    }
  }, [torchChanging, torchOn]);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
      {/* html5-qrcode 가 여기에 video 엘리먼트를 주입합니다 */}
      <div
        id={previewId}
        className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
      />

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
          <div
            className="relative aspect-square"
            style={{ width: "min(78%, 340px)" }}
          >
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

      {status === "active" && torchSupported && (
        <button
          type="button"
          onClick={handleToggleTorch}
          disabled={torchChanging}
          className="absolute right-3 top-3 rounded-lg bg-black/65 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur transition-colors hover:bg-black/80 disabled:opacity-50"
        >
          {torchOn ? "조명 끄기" : "조명 켜기"}
        </button>
      )}

      {/* 하단 안내 텍스트 */}
      {status === "active" && (
        <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs">
          QR 코드를 사각형 안에 크게 맞춰주세요
        </p>
      )}
    </div>
  );
}
