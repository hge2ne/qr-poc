# 디자인 시스템 (QR 입장 관리 POC)

> 코드베이스에서 실제 사용 중인 스타일 규칙을 정리한 문서입니다.
> 새 화면/컴포넌트는 **반드시 이 토큰과 패턴을 재사용**하여 기존 UI와 어우러지게 구현합니다.
> 프레임워크: Tailwind CSS v4 (`@import "tailwindcss"` in `src/app/globals.css`).

---

## 1. 색상 (Color Tokens)

| 용도 | 클래스 | 비고 |
|------|--------|------|
| Primary (브랜드/버튼/링크) | `blue-600` (hover `blue-700`) | 로그인, 등록, 링크 강조 |
| Primary 배지 배경/텍스트 | `bg-blue-100` / `text-blue-700` | 관리자 배지 |
| 성공/입장완료 | `green-600`, `bg-green-100` / `text-green-700` | 입장 완료, 통계 강조 |
| 경고/에러 | `text-red-500`, `bg-red-50` | 폼 에러 메시지 |
| 페이지 배경 | `bg-gray-50` | body 및 레이아웃 |
| 카드 배경 | `bg-white` | 모든 카드 |
| 테두리 | `border-gray-200` (카드), `border-gray-300` (입력) | |
| 본문 텍스트 | `text-gray-900` (제목), `text-gray-600` (본문), `text-gray-500` (보조), `text-gray-400` (placeholder/empty) | |

CSS 변수 (`globals.css`): `--background: #ffffff`, `--foreground: #171717`.
폰트: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, `antialiased`.

---

## 2. 반경 (Radius)

| 요소 | 클래스 |
|------|--------|
| 입력/버튼/작은 카드 | `rounded-lg` |
| 콘텐츠 카드/패널 | `rounded-xl` |
| 강조 카드(로그인 등) | `rounded-2xl` |
| 배지(pill) | `rounded-full` |

## 3. 그림자 (Shadow)
- 기본 카드: 그림자 없음, `border`로 구분.
- 강조 카드(로그인): `shadow-sm`.

---

## 4. 컴포넌트 패턴 (복사해서 사용)

### 4-1. 카드
```html
<div class="bg-white border border-gray-200 rounded-xl p-6"> ... </div>
```
통계/작은 카드는 `p-4`, 강조 카드는 `rounded-2xl shadow-sm p-8`.

### 4-2. Primary 버튼
```html
<button class="bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium
               hover:bg-blue-700 disabled:opacity-50 transition-colors">
```
전체폭 버튼은 `w-full` 추가. 인라인 CTA는 `px-4 py-2`.

### 4-3. Secondary(취소) 버튼
```html
<a class="border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm font-medium
          hover:bg-gray-50 transition-colors text-center">
```

### 4-4. 입력 필드
```html
<label class="block text-sm font-medium text-gray-700 mb-1">라벨 *</label>
<input class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
```
폼 필드 간격: `space-y-4`.

### 4-5. 에러 메시지
```html
<p class="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{메시지}</p>
```

### 4-6. 배지 (상태 pill)
```html
<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">✓ 입장 완료</span>
<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">미입장</span>
```

### 4-7. 성공 아이콘 원형
```html
<div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
  <span class="text-green-600 text-xl">✓</span>
</div>
```

### 4-8. Breadcrumb
```html
<div class="flex items-center gap-2 mb-6">
  <a class="text-sm text-gray-400 hover:text-gray-600">대시보드</a>
  <span class="text-gray-300">/</span>
  <span class="text-sm text-gray-900 font-medium">현재</span>
</div>
```

---

## 5. 타이포그래피

| 용도 | 클래스 |
|------|--------|
| 페이지 제목 | `text-2xl font-bold text-gray-900` |
| 카드/섹션 제목 | `text-lg`~`text-xl font-bold` 또는 `font-semibold text-gray-900` |
| 본문 | `text-sm text-gray-600` |
| 보조/설명 | `text-sm text-gray-500` |
| 라벨/캡션 | `text-xs font-medium text-gray-500`, 통계 라벨은 `uppercase tracking-wide` |
| 큰 숫자(통계) | `text-3xl font-bold` |

---

## 6. 레이아웃

- 콘텐츠 최대폭: `max-w-5xl mx-auto px-4`, 폼 화면은 `max-w-lg` / `max-w-sm`.
- 상단 nav: `bg-white border-b border-gray-200 sticky top-0 z-10`, 링크 `text-sm text-gray-600 hover:text-gray-900 transition-colors`.
- 상호작용 요소에는 항상 `transition-colors`.
- 섹션 간격: `mb-6`.

---

## 7. 상호작용/상태 규칙

- 로딩 버튼 텍스트 전환: `{loading ? "처리 중..." : "실행"}` + `disabled:opacity-50`.
- 데이터 조작은 REST 없이 **Server Actions** 호출 (`ActionResult<T>` 반환). 목업 화면은 클라이언트 상태로만 처리.
- 날짜 표기: `toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric" })`.

---

## 8. 모바일 뷰 (신규)

관리자 nav의 **"모바일"** 탭에서 학부모 예약 화면을 폰 프레임 프리뷰로 제공.
- 폰 프레임: `max-w-[390px]`, `rounded-[2.5rem] border-[10px] border-gray-900`, 상단 노치 + 상태바.
- 내부 화면은 위 토큰(blue-600 primary, gray-50 배경, rounded-xl 카드, 동일 입력/버튼)을 그대로 사용하되 터치 타깃을 위해 세로 간격을 넉넉히(`py-3`, `gap-3`).
- 목업 데이터: 저장 없이 클라이언트 상태로만 동작 (POC).
