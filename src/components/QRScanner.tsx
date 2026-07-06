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

type RangeCameraCapability = {
  isSupported: () => boolean;
  apply: (value: number) => Promise<void>;
  value: () => number | null;
  min: () => number;
  max: () => number;
  step: () => number;
};

type FocusTrackCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  exposureMode?: string[];
  pointsOfInterest?: Array<{ x: number; y: number }>;
  whiteBalanceMode?: string[];
};

type CameraTuningConstraint = "exposureMode" | "focusMode" | "whiteBalanceMode";

const CAMERA_QUALITY_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30, max: 30 },
};

const FRONT_CAMERA_START_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
};

const REAR_CAMERA_START_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { exact: "environment" },
};

const REAR_CAMERA_FALLBACK_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "environment",
};

// iPad/태블릿 전면 카메라는 고정 초점 광각이라 QR 이 작고 흐리게 잡힙니다.
// 터치 기기에서만 살짝 확대해 디코더가 읽을 픽셀을 확보합니다. (Mac 은 정상이라 제외)
const FRONT_CAMERA_TARGET_ZOOM = 2;
const REAR_CAMERA_TARGET_ZOOM = 1.6;
const REAR_CAMERA_FOCUS_SETTLE_MS = 180;
const ZOOM_NUDGE_SETTLE_MS = 120;
const ZOOM_EPSILON = 0.01;
const isTouchDevice =
  typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getZoomCapability(scanner: Html5Qrcode): RangeCameraCapability | null {
  try {
    const zoom = scanner.getRunningTrackCameraCapabilities().zoomFeature() as RangeCameraCapability;
    return zoom.isSupported() ? zoom : null;
  } catch {
    return null;
  }
}

async function applyCameraTuningConstraint(
  scanner: Html5Qrcode,
  capabilities: FocusTrackCapabilities,
  constraint: CameraTuningConstraint,
  value: string,
) {
  if (!capabilities[constraint]?.includes(value)) return false;

  try {
    await scanner.applyVideoConstraints({
      advanced: [{ [constraint]: value } as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}

async function applyFocusMode(scanner: Html5Qrcode, focusMode: string) {
  try {
    await scanner.applyVideoConstraints({
      advanced: [{ focusMode } as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}

async function applyCenterPointOfInterest(scanner: Html5Qrcode) {
  try {
    await scanner.applyVideoConstraints({
      advanced: [
        { pointsOfInterest: [{ x: 0.5, y: 0.5 }] } as MediaTrackConstraintSet,
      ],
    });
    return true;
  } catch {
    return false;
  }
}

async function applyContinuousCameraTuning(scanner: Html5Qrcode) {
  try {
    const capabilities = scanner.getRunningTrackCapabilities() as FocusTrackCapabilities;
    let applied = false;

    applied =
      (await applyCameraTuningConstraint(scanner, capabilities, "focusMode", "continuous")) ||
      applied;
    applied =
      (await applyCameraTuningConstraint(scanner, capabilities, "exposureMode", "continuous")) ||
      applied;
    applied =
      (await applyCameraTuningConstraint(
        scanner,
        capabilities,
        "whiteBalanceMode",
        "continuous",
      )) || applied;
    applied = (await applyCenterPointOfInterest(scanner)) || applied;

    return applied;
  } catch {
    return false;
  }
}

async function applyCameraZoom(scanner: Html5Qrcode, targetZoom: number) {
  const zoom = getZoomCapability(scanner);
  if (!zoom) return false;

  const target = clamp(targetZoom, zoom.min(), zoom.max());
  if (target <= (zoom.value() ?? 1) + ZOOM_EPSILON) return false;

  await zoom.apply(target);
  return true;
}

async function nudgeCameraZoom(scanner: Html5Qrcode, targetZoom: number) {
  const zoom = getZoomCapability(scanner);
  if (!zoom) return false;

  const min = zoom.min();
  const max = zoom.max();
  const current = clamp(zoom.value() ?? 1, min, max);
  const target = clamp(Math.max(targetZoom, current), min, max);

  if (Math.abs(target - current) > ZOOM_EPSILON) {
    await zoom.apply(target);
    return true;
  }

  const step = Math.max(zoom.step() || 0.1, 0.1);
  const bumped =
    current + step <= max
      ? current + step
      : current - step >= min
        ? current - step
        : current;

  if (Math.abs(bumped - current) <= ZOOM_EPSILON) return false;

  await zoom.apply(bumped);
  await wait(ZOOM_NUDGE_SETTLE_MS);
  await zoom.apply(current);
  return true;
}

async function tuneCameraForScanning(
  scanner: Html5Qrcode,
  zoomTarget: number | null,
  shouldSettleAfterZoom: boolean,
) {
  await applyContinuousCameraTuning(scanner);

  if (!isTouchDevice || zoomTarget === null) return;

  // 모바일 카메라에서 QR 확대를 위해 줌을 적용합니다.
  try {
    const zoomApplied = await applyCameraZoom(scanner, zoomTarget);
    if (zoomApplied && shouldSettleAfterZoom) {
      await wait(REAR_CAMERA_FOCUS_SETTLE_MS);
      await applyContinuousCameraTuning(scanner);
    }
  } catch {
    // 줌 미지원 기기는 기본 배율로 계속 진행합니다.
  }
}

function isCameraSelectionError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "NotFoundError" || error.name === "OverconstrainedError")
  );
}

async function startScannerWithConstraints(
  scanner: Html5Qrcode,
  constraints: MediaTrackConstraints,
  scanConfig: Html5QrcodeCameraScanConfig,
  onScan: (decodedText: string) => void,
) {
  await scanner.start(constraints, scanConfig, onScan, () => {});
}

async function requestCameraRefocus(scanner: Html5Qrcode, zoomTarget: number | null) {
  let applied = await applyContinuousCameraTuning(scanner);

  try {
    const capabilities = scanner.getRunningTrackCapabilities() as FocusTrackCapabilities;
    const focusModes = capabilities.focusMode ?? [];

    if (focusModes.includes("single-shot")) {
      applied = (await applyFocusMode(scanner, "single-shot")) || applied;
    }

    if (focusModes.includes("continuous")) {
      applied = (await applyFocusMode(scanner, "continuous")) || applied;
    }
  } catch {
    // Focus controls are not available on every mobile browser.
  }

  if (zoomTarget !== null) {
    try {
      applied = (await nudgeCameraZoom(scanner, zoomTarget)) || applied;
      await wait(REAR_CAMERA_FOCUS_SETTLE_MS);
      applied = (await applyContinuousCameraTuning(scanner)) || applied;
    } catch {
      // Zoom nudge is best-effort only.
    }
  }

  return applied;
}

function createScanConfig(preferRearCamera: boolean): Html5QrcodeCameraScanConfig {
  return {
    fps: preferRearCamera && isTouchDevice ? 15 : 20,
    disableFlip: preferRearCamera,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const shortestEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const maxSize = Math.max(120, shortestEdge - 20);
      const preferredSize = Math.max(220, Math.floor(shortestEdge * 0.82));
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
  const [refocusing, setRefocusing] = useState(false);
  const [refocusMessage, setRefocusMessage] = useState("");
  const [startAttempt, setStartAttempt] = useState(0);
  const refocusMessageTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const showRefocusMessage = useCallback((message: string) => {
    setRefocusMessage(message);

    if (refocusMessageTimerRef.current !== null) {
      window.clearTimeout(refocusMessageTimerRef.current);
    }

    refocusMessageTimerRef.current = window.setTimeout(() => {
      setRefocusMessage("");
      refocusMessageTimerRef.current = null;
    }, 1800);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runScanner() {
      try {
        setStatus("loading");
        setErrorMsg("");
        setTorchSupported(false);
        setTorchOn(false);
        setRefocusing(false);
        setRefocusMessage("");

        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(previewId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = scanner;

        const cameraStartConstraints = preferRearCamera
          ? REAR_CAMERA_START_CONSTRAINTS
          : FRONT_CAMERA_START_CONSTRAINTS;
        const scanConfig = createScanConfig(preferRearCamera);

        try {
          await startScannerWithConstraints(
            scanner,
            cameraStartConstraints,
            scanConfig,
            (text) => onScanRef.current(text),
          );
        } catch (error) {
          if (!preferRearCamera || !isCameraSelectionError(error)) throw error;

          await startScannerWithConstraints(
            scanner,
            REAR_CAMERA_FALLBACK_CONSTRAINTS,
            scanConfig,
            (text) => onScanRef.current(text),
          );
        }

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

        const zoomTarget = preferRearCamera
          ? REAR_CAMERA_TARGET_ZOOM
          : FRONT_CAMERA_TARGET_ZOOM;
        await tuneCameraForScanning(scanner, zoomTarget, preferRearCamera);

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
          setRefocusing(false);
          if (scanner) await stopScanner(scanner);

          setStatus("error");
          setErrorMsg(getCameraErrorMessage(error, preferRearCamera));
        }
      }
    }

    runScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      torchCapabilityRef.current = null;
      setTorchSupported(false);
      setTorchOn(false);
      setRefocusing(false);
      if (refocusMessageTimerRef.current !== null) {
        window.clearTimeout(refocusMessageTimerRef.current);
        refocusMessageTimerRef.current = null;
      }
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

  const handleRefocusCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || refocusing) return;

    setRefocusing(true);
    try {
      const applied = await requestCameraRefocus(
        scanner,
        preferRearCamera ? REAR_CAMERA_TARGET_ZOOM : FRONT_CAMERA_TARGET_ZOOM,
      );
      showRefocusMessage(
        applied
          ? "초점을 다시 맞췄습니다."
          : "이 브라우저는 수동 초점을 지원하지 않습니다.",
      );
    } catch {
      showRefocusMessage("초점 재조정에 실패했습니다.");
    } finally {
      setRefocusing(false);
    }
  }, [preferRearCamera, refocusing, showRefocusMessage]);

  const handleRetryCamera = useCallback(() => {
    setStartAttempt((attempt) => attempt + 1);
  }, []);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
      {/* html5-qrcode 가 여기에 video 엘리먼트를 주입합니다 */}
      <div
        id={previewId}
        className={`w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${
          preferRearCamera ? "" : "[&_video]:-scale-x-100"
        }`}
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
            style={{ width: "min(82%, 360px)" }}
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

      {status === "active" && preferRearCamera && (
        <button
          type="button"
          onClick={handleRefocusCamera}
          disabled={refocusing}
          aria-label="후면 카메라 초점 재조정"
          className="absolute left-3 top-3 rounded-lg bg-black/65 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur transition-colors hover:bg-black/80 disabled:opacity-50"
        >
          {refocusing ? "초점 조정 중" : "초점 맞추기"}
        </button>
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

      {status === "active" && refocusMessage && (
        <p
          className="absolute left-3 top-14 max-w-[calc(100%-1.5rem)] rounded-md bg-black/65 px-3 py-1.5 text-xs text-white/85 shadow-sm backdrop-blur"
          aria-live="polite"
        >
          {refocusMessage}
        </p>
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
