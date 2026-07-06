# iOS(아이폰/아이패드) QR 스캐너 미인식 원인 분석

## 1. 증상

| 기기 | 브라우저 엔진 | 카메라 | 결과 |
| --- | --- | --- | --- |
| MacBook | Chromium/Blink | 전면 | 약 1초 내 인식 |
| Android 폰 | Chromium/Blink | 후면 | 약 1초 내 인식 |
| iPhone | WebKit (iOS는 전 브라우저 공통) | 후면 | **전혀 인식 안 됨** |
| iPad | WebKit | 전면 | **전혀 인식 안 됨** |

카메라 프리뷰는 네 기기 모두 정상 동작. 기존에 시도한 "카메라 보정(해상도 상향)",
"초점 다시 맞추기(continuous focus)", "줌 확대" 는 모두 효과가 없었다.

## 2. 결론 요약

원인은 한 가지가 아니라 **세 가지가 겹친 복합 원인**이며, 모두 iOS(WebKit)에서만 발현된다.

1. **iOS WebKit 은 `BarcodeDetector` API 를 구현하지 않는다.**
   Mac(Chrome)/Android 는 OS 네이티브 디코더로 인식하지만, iOS 는 html5-qrcode 에
   번들된 구형 zxing-js 포트로만 디코드한다. zxing-js 는 네이티브 디코더보다
   왜곡·저화질에 훨씬 취약하다. (아래 3.1)
2. **CSS 로 video 를 정사각형에 강제로 맞춘 것(`w-full h-full object-cover`)이
   디코드 캔버스를 가로로 최대 1.78배 압축시킨다.** html5-qrcode 는 video 의
   표시 크기와 원본 해상도의 비율을 가로/세로 **독립적으로** 계산해 프레임을 잘라내기
   때문에, 16:9 스트림을 1:1 박스에 채우면 디코더에는 정사각 QR 이 아니라
   가로로 눌린 직사각형 QR 이 들어간다. 네이티브 디코더(Mac/Android)는 이 왜곡을
   견디지만 zxing-js(iOS)는 사실상 못 읽는다. (아래 3.2)
3. **스캔 시작 후에 호출하던 해상도 보정(`applyVideoConstraints` 1920×1080)이
   iOS 에서는 오히려 왜곡을 키웠다.** iOS Safari 는 이 요청을 받아들여 스트림을
   4:3(640×480) → 16:9(1920×1080) 로 바꾸는데, 위 2번 구조 때문에 왜곡 배율이
   1.33배 → 1.78배로 커진다. 즉 "보정" 코드가 iOS 에서는 역효과였다. (아래 3.3)

보조 요인:

4. iPad 전면 카메라는 고정초점 + 낮은 기본 해상도(640×480)라 zxing-js 에 더 불리하다.
5. `disableFlip: false` 라서 매 프레임을 두 번(원본+반전) 디코드한다. 카메라 스트림은
   절대 미러되어 들어오지 않으므로(프리뷰 미러는 CSS 표시용) 순수 낭비이며,
   가뜩이나 느린 iOS zxing-js 의 실효 스캔 횟수를 절반으로 깎는다.

## 3. 상세 분석

### 3.1 iOS 는 BarcodeDetector 가 없어 zxing-js 폴백으로만 디코드한다

`QRScanner.tsx` 는 `useBarCodeDetectorIfSupported: true` 로 스캐너를 생성한다.
html5-qrcode 의 디코더 선택 로직(`src/code-decoder.ts`)은 다음과 같다.

```ts
if (useBarCodeDetectorIfSupported && BarcodeDetectorDelegate.isSupported()) {
    this.primaryDecoder = new BarcodeDetectorDelegate(...);   // OS 네이티브
    this.secondaryDecoder = new ZXingHtml5QrcodeDecoder(...); // 교대 사용
} else {
    this.primaryDecoder = new ZXingHtml5QrcodeDecoder(...);   // zxing 단독
}
```

- Chrome(Android/macOS)은 `BarcodeDetector` 를 OS 프레임워크(MLKit/Vision) 기반으로
  제공한다. → 흐림·왜곡에 강하고 빠르다. → "1초 인식"
- iOS 는 Safari 뿐 아니라 Chrome/Edge 등 모든 브라우저가 WebKit 을 쓰도록 강제되는데,
  WebKit 은 Shape Detection API(BarcodeDetector)를 구현하지 않았다.
  → iOS 에서는 항상 zxing-js 단독 경로.
- html5-qrcode 가 번들한 zxing-js 는 유지보수가 끝난 구형 포트로, iOS 미인식 관련
  이슈가 다수 보고되어 있다(대표: mebjas/html5-qrcode#484, #618, #820, #915).

즉 "Mac/Android 는 되고 iOS 만 안 되는" 1차 구조적 이유는 **디코더가 다르기 때문**이다.
다만 zxing-js 도 정상 품질 프레임이면 QR 은 읽는다. "아예 안 되는" 결정타는 3.2다.

### 3.2 (결정타) 강제 크롭 CSS 가 디코드 캔버스를 비등방 압축한다

`QRScanner.tsx` 의 프리뷰 컨테이너는 `aspectRatio: "1 / 1"` 고정이고, 주입되는
video 에 다음 클래스를 강제했다.

```
[&_video]:w-full [&_video]:h-full [&_video]:object-cover
```

그런데 html5-qrcode 의 프레임 캡처(`src/html5-qrcode.ts` `foreverScan`)는
video 가 **원본 비율 그대로(우그러짐 없이) 표시된다고 가정**하고, 표시 크기 대비
원본 해상도 비율을 축별로 따로 곱해 소스 영역을 잘라낸다.

```ts
const widthRatio  = videoElement.videoWidth  / videoElement.clientWidth;
const heightRatio = videoElement.videoHeight / videoElement.clientHeight;
// qrRegion(화면 px 기준 정사각형) × 축별 비율 → 소스 crop
context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, qrRegion.width, qrRegion.height);
```

정사각 컨테이너(S×S)에 16:9(1920×1080) 스트림을 `object-cover` 로 채우면:

- `widthRatio = 1920 / S`, `heightRatio = 1080 / S` → **비율이 서로 다름**
- 정사각 `qrRegion`(S×0.78)이 소스에서는 1497×842 직사각형으로 잘려나가고,
  이것이 다시 정사각 캔버스에 그려진다.
- 결과: 디코더 입력 이미지가 **가로 1.78배 압축**. 정사각 QR 모듈이 1:1.78
  직사각형이 된다.

이 왜곡은 네 기기 모두 동일하게 발생하지만,

- Mac/Android: 네이티브 BarcodeDetector 가 왜곡을 보정해 인식 → 문제 은폐
- iOS: zxing-js 는 파인더 패턴 비율 검사(1:1:3:1:1)가 축 왜곡에 민감해
  candidate 자체를 못 잡음 → **0% 인식**

### 3.3 시작 후 해상도 보정이 iOS 에서 왜곡을 1.33 → 1.78배로 키웠다

기존 코드는 `scanner.start()` 성공 **후에** `applyVideoConstraints({ width:1920, height:1080, frameRate:30 })` 를 호출했다.

- iOS Safari 기본 getUserMedia 해상도는 640×480(4:3) → 이때 왜곡 배율 640/480 ÷ 1 = 1.33배
- 보정이 적용되면 1920×1080(16:9) → 왜곡 배율 1.78배로 **악화**
- Android WebView/Chrome 은 이 재설정을 거부하거나(코드 주석에도 기록됨) 거부해도
  BarcodeDetector 라 영향이 없었다.

또한 스캔 도중 해상도를 바꾸는 것은 iOS 에서 스트림 재협상을 유발하는 불안정 요인이다.
해상도는 **시작 시점(videoConstraints)** 에 요청하는 것이 정석이다.

### 3.4 iPad 전면 카메라의 광학적 한계

iPad 전면 카메라는 고정초점(약 40~50cm 최적)이라 20~30cm 의 QR 은 흐리게 잡힌다.
줌 2배 시도는 iPadOS 가 전면 카메라에 `zoom` capability 를 노출하지 않으면 무시된다.
흐림 자체는 왜곡 제거 + 시작 시 고해상도 요청으로 상당 부분 상쇄 가능하다
(모듈당 픽셀 수가 늘어나 zxing 이진화가 견딤).

### 3.5 왜 기존 시도들이 전부 효과가 없었나

| 시도 | 무효였던 이유 |
| --- | --- |
| 해상도 상향(applyVideoConstraints) | 왜곡 배율만 키움 (3.3) |
| continuous focus | iOS 는 `focusMode` capability 미노출 → 조용히 skip |
| 줌 2배 | 전면 카메라 zoom 미노출 시 skip, 근본 원인(왜곡)과 무관 |
| 미러 프리뷰/후면 카메라 전환 | 프리뷰 표시 문제일 뿐 디코드 입력과 무관 |

## 4. 수정 내역 (fix/scanner-final)

1. **video 강제 크롭 CSS 제거** — 라이브러리 기본 레이아웃(원본 비율)을 유지해
   `widthRatio == heightRatio` 를 보장. 컨테이너는 검은 배경 letterbox 로 처리.
   → 디코드 캔버스 왜곡 제거 (핵심 수정)
2. **해상도·카메라 방향을 시작 시점 `videoConstraints` 로 통합** — 1440×1080(4:3)
   ideal 요청. 4:3 은 같은 폭에서 스캔 영역(캔버스)이 16:9 대비 약 53% 커지고
   대부분 카메라 센서의 네이티브 비율이라 수용률이 높다.
   시작 후 `applyVideoConstraints` 재설정 코드는 삭제.
3. **`disableFlip: true`** — 불필요한 반전 재디코드 제거로 iOS zxing 실효
   스캔률 2배 확보.
4. **디버그 오버레이 추가** — 스캐너 URL 에 `?scanDebug=1` 을 붙이면
   디코더 종류 / 스트림 해상도 / 표시 크기 / 트랙 설정을 실시간 표시.
   기기 현장 검증용.

유지한 것: 연속초점·줌 튜닝(무해, 지원 기기에서 이득), 후면 `exact: environment`
지정, 전면 프리뷰 CSS 미러(표시 전용이라 디코드 무영향).

## 5. 검증 방법

1. 배포(또는 로컬 HTTPS) 후 iPhone Safari 로 `/scanner?scanDebug=1` 접속
   - 디버그 라인에 `zxing` 표시(iOS 정상), `video 1440x1080`(또는 근접값) 확인
   - `video WxH` 비율과 `view WxH` 비율이 같으면 왜곡 제거 성공
2. iPhone 후면: 화면 QR·인쇄 QR 을 15~25cm 에서 스캔 → 1~2초 내 인식 기대
3. iPad 전면: QR 을 20~30cm, 안내 문구대로 사각형에 맞춰 스캔
4. 회귀 확인: Android/Mac 에서 기존처럼 1초 내 인식되는지 확인
   (`BarcodeDetector` 표기는 `native+zxing`)

## 6. 참고 자료

- [caniuse — BarcodeDetector API](https://caniuse.com/mdn-api_barcodedetector) (Safari/WebKit 미지원)
- [MDN — Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
- [html5-qrcode#484 — Doesn't scan on iOS and iPadOS devices](https://github.com/mebjas/html5-qrcode/issues/484)
- [html5-qrcode#618 — Fail to scan Barcode in iPhone (Safari)](https://github.com/mebjas/html5-qrcode/issues/618)
- [html5-qrcode#915 — iPhones aren't reading barcode](https://github.com/mebjas/html5-qrcode/issues/915)
- html5-qrcode 2.3.8 소스: `src/code-decoder.ts`(디코더 선택), `src/html5-qrcode.ts`
  `foreverScan`/`setupUi`(축별 비율 크롭), `src/camera/core-impl.ts`(video 생성/제약 적용)
