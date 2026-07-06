"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode, Html5QrcodeCameraScanConfig } from "html5-qrcode";

type Props = {
  onScan: (decodedText: string) => void;
  preferRearCamera?: boolean;
};

type ScannerStatus = "loading" | "active" | "error";
type TorchCapability = {
  isSupported: () => boolean;
  apply: (value: boolean) => Promise<void>;
  value: () => boolean | null;
};

// 카메라 방향과 해상도를 스캔 시작 시점에 한 번에 요청합니다.
// - 시작 후 applyConstraints 로 해상도를 바꾸면 iOS Safari 가 스트림을 16:9 로
//   재협상해 디코드 품질이 나빠지는 부작용이 있었습니다.
// - 1440×1080(4:3)은 대부분 카메라 센서의 네이티브 비율이라 수용률이 높고,
//   같은 폭에서 16:9 보다 스캔 영역이 넓어 iOS 의 zxing 폴백 디코더에 유리합니다.
function buildVideoConstraints(preferRearCamera: boolean): MediaTrackConstraints {
  return {
    facingMode: preferRearCamera ? { exact: "environment" } : "user",
    width: { ideal: 1440 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  };
}

// iPad/태블릿 전면 카메라는 고정 초점 광각이라 QR 이 작고 흐리게 잡힙니다.
// 터치 기기에서만 살짝 확대해 디코더가 읽을 픽셀을 확보합니다. (Mac 은 정상이라 제외)
const FRONT_CAMERA_TARGET_ZOOM = 2;
const isTouchDevice =
  typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;

async function tuneCameraForScanning(scanner: Html5Qrcode, shouldApplyTouchZoom: boolean) {
  // 연속 초점을 지원하는 기기에서는 오토포커스를 켭니다.
  try {
    const capabilities = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & {
      focusMode?: string[];
    };
    if (capabilities.focusMode?.includes("continuous")) {
      await scanner.applyVideoConstraints({
        advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
      });
    }
  } catch {
    // 초점 제어를 지원하지 않는 브라우저는 무시합니다.
  }

  if (!isTouchDevice || !shouldApplyTouchZoom) return;

  // 고정 초점 전면 카메라에서 QR 확대를 위해 줌을 적용합니다.
  try {
    const zoom = scanner.getRunningTrackCameraCapabilities().zoomFeature();
    if (zoom.isSupported()) {
      const target = Math.min(FRONT_CAMERA_TARGET_ZOOM, zoom.max());
      if (target > (zoom.value() ?? 1)) {
        await zoom.apply(target);
      }
    }
  } catch {
    // 줌 미지원 기기는 기본 배율로 계속 진행합니다.
  }
}

function buildScanConfig(preferRearCamera: boolean): Html5QrcodeCameraScanConfig {
  return {
    fps: 20,
    // 카메라 스트림은 미러되어 들어오지 않으므로(전면 프리뷰 미러는 CSS 표시 전용)
    // 반전 프레임 재디코드는 낭비입니다. 끄면 프레임당 디코드가 1회로 줄어
    // iOS zxing 폴백의 실효 스캔 횟수가 2배가 됩니다.
    disableFlip: true,
    videoConstraints: buildVideoConstraints(preferRearCamera),
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const shortestEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const maxSize = Math.max(120, shortestEdge - 24);
      const preferredSize = Math.max(220, Math.floor(shortestEdge * 0.78));
      const size = Math.min(maxSize, preferredSize);

      return { width: size, height: size };
    },
  };
}

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

function getCameraErrorMessage(error: unknown, preferRearCamera: boolean) {
  const cameraLabel = preferRearCamera ? "후면" : "전면";

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "카메라 권한을 허용한 뒤 다시 요청해 주세요.";
    }

    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return `${cameraLabel} 카메라를 찾을 수 없습니다.`;
    }
  }

  return `카메라 권한 또는 ${cameraLabel} 카메라 상태를 확인해 주세요.`;
}

export function QRScanner({ onScan, preferRearCamera = false }: Props) {
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
  const [startAttempt, setStartAttempt] = useState(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        setStatus("loading");
        setErrorMsg("");
        setTorchSupported(false);
        setTorchOn(false);

        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(previewId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = scanner;

        await scanner.start(
          // config.videoConstraints 가 유효하면 라이브러리는 getUserMedia 에
          // 그 값을 사용하고 이 인자는 무시합니다. (폴백 겸 형식상 필수 인자)
          { facingMode: preferRearCamera ? { exact: "environment" } : "user" },
          buildScanConfig(preferRearCamera),
          (text) => onScanRef.current(text),
          () => {}
        );

        if (cancelled) {
          await stopScanner(scanner);
          return;
        }

        await tuneCameraForScanning(scanner, !preferRearCamera);

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
      } catch (error) {
        if (!cancelled) {
          const scanner = scannerRef.current;
          scannerRef.current = null;
          torchCapabilityRef.current = null;
          setTorchSupported(false);
          setTorchOn(false);
          if (scanner) await stopScanner(scanner);

          setStatus("error");
          setErrorMsg(getCameraErrorMessage(error, preferRearCamera));
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
  }, [preferRearCamera, previewId, startAttempt]);

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

  const handleRetryCamera = useCallback(() => {
    setStartAttempt((attempt) => attempt + 1);
  }, []);

  return (
    <div
      className={`relative bg-black rounded-xl overflow-hidden ${
        status === "active" ? "" : "min-h-[280px]"
      }`}
    >
      {/* html5-qrcode 가 여기에 video 엘리먼트를 주입합니다.
          video 표시 크기를 CSS 로 강제하면(w-full/h-full/object-cover) 라이브러리가
          표시/원본 비율을 축별로 곱해 만드는 디코드 캔버스가 비등방 압축되어
          iOS(zxing 폴백)에서 QR 인식이 깨집니다. 원본 비율 그대로 둡니다. */}
      <div
        id={previewId}
        className={preferRearCamera ? "" : "[&_video]:-scale-x-100"}
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
          <button
            type="button"
            onClick={handleRetryCamera}
            className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black shadow-sm transition-colors hover:bg-white/90"
          >
            카메라 다시 요청
          </button>
        </div>
      )}

      {/* 스캔 영역 코너 마커 + 스캔 라인 */}
      {status === "active" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative aspect-square"
            style={{ height: "min(74%, 320px)" }}
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
          {isTouchDevice
            ? "QR 을 20~30cm 정도 떨어뜨려 사각형 안에 맞춰주세요"
            : "QR 코드를 사각형 안에 크게 맞춰주세요"}
        </p>
      )}
    </div>
  );
}
