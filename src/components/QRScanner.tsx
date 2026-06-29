"use client";

import { useEffect, useRef } from "react";

type Props = {
  onScan: (decodedText: string) => void;
};

export function QRScanner({ onScan }: Props) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let scanner: import("html5-qrcode").Html5QrcodeScanner;

    import("html5-qrcode").then(({ Html5QrcodeScanner, Html5QrcodeScanType }) => {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          onScanRef.current(decodedText);
        },
        () => {}
      );
    });

    return () => {
      scanner?.clear().catch(() => {});
    };
  }, []);

  return (
    <div>
      <div id="qr-reader" className="w-full" />
      <p className="text-xs text-gray-400 text-center mt-2">
        카메라를 QR 코드에 맞춰주세요
      </p>
    </div>
  );
}
