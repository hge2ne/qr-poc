# 디자인 시스템 (QR 입장 관리 · NP Edu)

> booking-service의 NP Edu 디자인 시스템(올리브-라임 그린 브랜드)을 이식했습니다.
> 새 화면/컴포넌트는 **반드시 아래 토큰 유틸리티를 사용**합니다. `blue-600`·`gray-50` 같은
> Tailwind 팔레트 클래스를 직접 쓰지 마세요 — 브랜드가 깨집니다.
> 프레임워크: Tailwind CSS v4. 토큰 정의는 `src/app/globals.css`의 `:root` / `.dark` / `@theme inline`.

---

## 1. 색상 토큰 (Color Tokens)

팔레트 숫자 대신 **시맨틱 토큰 유틸리티**를 씁니다. `bg-<token>` / `text-<token>` / `border-<token>` 형태.

| 용도 | 토큰 | 값(light) | 예시 |
|------|------|-----------|------|
| 브랜드/Primary | `primary` / `primary-foreground` | `#638402` 올리브 / 흰색 | `bg-primary text-white hover:bg-primary/90` |
| 올리브 틴트(hover/선택/배지) | `accent` / `accent-foreground` | `#e9f0d2` / `#1e2a00` | `bg-accent text-primary` |
| 페이지 배경 | `background` | `#f6f7f4` 미스트 | `bg-background` |
| 카드/표면 | `card` | `#ffffff` | `bg-card` |
| 섹션 밴드 | `muted` / `muted-foreground` | `#f2f3ef` / `#6b6f69` | `bg-muted text-muted-foreground` |
| 본문/제목 텍스트 | `foreground` | `#1c1f1e` 차콜 | `text-foreground` |
| 보조 텍스트 | `muted-foreground` | `#6b6f69` | `text-muted-foreground` |
| 테두리(hairline) | `border` | `#e5e6e2` | `border-border` |
| 입력 테두리 | `input` | `#e5e6e2` | `border-input` |
| 포커스 링 | `ring` | `#638402` | `focus:ring-ring` |
| 성공/입장완료 | `success` | `#2f9e44` | `text-success`, `bg-success/15` |
| 경고 | `warning` / `warning-foreground` | `#e8a33d` / `#3a2a00` | `bg-warning/20 text-warning-foreground` |
| 에러/필수 | `destructive` | `#d92d20` | `text-destructive`, `bg-destructive/10` |
| 네이비(보조 솔리드) | `navy` / `navy-foreground` | `#2c3d5e` / 흰색 | `bg-navy text-white` |
| 인포 콜아웃 | `info` / `info-bg` | `#3a6fb0` / `#dbe8fb` | `bg-info-bg text-info-bg-foreground` |

- 반투명이 필요하면 슬래시 모디파이어를 씁니다: `bg-success/15`, `bg-destructive/10`, `bg-primary/90`.
- `text-white`는 primary/success/destructive 등 **채도 높은 배경 위 글자**에만 사용(모든 `*-foreground`가 흰색이라 안전).
- **다크 모드**: `.dark` 클래스로 자동 전환(토큰이 라임 `#aed456` 브랜드로 반전). 별도 클래스 불필요.

폰트: `Noto Sans KR`(본문/한글) + `Poppins`(숫자/디스플레이). `globals.css`에서 `@fontsource`로 로드, `body`는 `font-sans`(Noto Sans KR).

---

## 2. 반경 (Radius) — `--radius: 0.5rem` 기준

| 요소 | 클래스 |
|------|--------|
| 입력/버튼/작은 카드 | `rounded-lg` |
| 콘텐츠 카드/패널 | `rounded-xl` |
| 강조 카드 | `rounded-2xl` |
| 배지(pill) | `rounded-full` |

## 3. 그림자 (Shadow)
- 기본 카드: 그림자 없음, `border-border`로 구분 (flat + hairline).
- 강조 카드: `shadow-sm`.

---

## 4. 컴포넌트 패턴 (복사해서 사용)

### 4-1. 카드
```html
<div class="bg-card border border-border rounded-xl p-6"> ... </div>
```
통계/작은 카드는 `p-4`, 강조 카드는 `rounded-2xl shadow-sm p-8`.

### 4-2. Primary 버튼
```html
<button class="bg-primary text-white rounded-lg py-2.5 text-sm font-medium
               hover:bg-primary/90 disabled:opacity-50 transition-colors">
```
전체폭은 `w-full`, 인라인 CTA는 `px-4 py-2`.

### 4-3. Secondary(취소) 버튼
```html
<a class="border border-input text-muted-foreground rounded-lg py-2.5 text-sm font-medium
          hover:bg-muted transition-colors text-center">
```

### 4-4. 입력 필드
```html
<label class="block text-sm font-medium text-foreground mb-1">라벨 *</label>
<input class="w-full border border-input rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent" />
```
폼 필드 간격: `space-y-4`.

### 4-5. 에러 메시지
```html
<p class="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">{메시지}</p>
```

### 4-6. 배지 (상태 pill)
```html
<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-success/15 text-success">✓ 입장 완료</span>
<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">미입장</span>
```

### 4-7. 성공 아이콘 원형
```html
<div class="inline-flex items-center justify-center w-12 h-12 bg-success/15 rounded-full">
  <span class="text-success text-xl">✓</span>
</div>
```

### 4-8. Breadcrumb
```html
<div class="flex items-center gap-2 mb-6">
  <a class="text-sm text-muted-foreground hover:text-foreground">대시보드</a>
  <span class="text-input">/</span>
  <span class="text-sm text-foreground font-medium">현재</span>
</div>
```

---

## 5. 타이포그래피

| 용도 | 클래스 |
|------|--------|
| 페이지 제목 | `text-2xl font-bold text-foreground` |
| 카드/섹션 제목 | `text-lg`~`text-xl font-bold` 또는 `font-semibold text-foreground` |
| 본문 | `text-sm text-muted-foreground` |
| 보조/설명 | `text-sm text-muted-foreground` |
| 라벨/캡션 | `text-xs font-medium text-muted-foreground`, 통계 라벨은 `uppercase tracking-wide` |
| 큰 숫자(통계) | `text-3xl font-bold` (필요 시 `font-display`로 Poppins) |

---

## 6. 레이아웃

- 콘텐츠 최대폭: `max-w-5xl mx-auto px-4`, 폼 화면은 `max-w-lg` / `max-w-sm`.
- 상단 nav: `bg-card border-b border-border sticky top-0 z-10`, 링크 `text-sm text-muted-foreground hover:text-foreground transition-colors`.
- 상호작용 요소에는 항상 `transition-colors`.
- 섹션 간격: `mb-6`.

---

## 7. 상호작용/상태 규칙

- 로딩 버튼 텍스트 전환: `{loading ? "처리 중..." : "실행"}` + `disabled:opacity-50`.
- 데이터 조작은 **Server Actions** 호출(`ActionResult<T>` 반환). 목업 화면은 클라이언트 상태로만 처리.
- 날짜 표기: `toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric" })`.

---

## 8. 모바일 뷰

관리자 nav의 **"모바일"** 탭에서 학부모 예약 화면을 폰 프레임 프리뷰로 제공.
- 폰 프레임: `max-w-[390px]`, `rounded-[2.5rem] border-[10px] border-foreground bg-foreground`(다크 베젤) + 노치 + 상태바.
- 내부 화면은 위 토큰(primary=올리브, background=미스트, `rounded-xl` 카드)을 그대로 사용하되 터치 타깃을 위해 세로 간격을 넉넉히(`py-3`, `gap-3`).
- 목업 데이터: 저장 없이 클라이언트 상태로만 동작.

---

## 9. 이식 출처

booking-service(`.stitch/DESIGN.md`)의 NP Edu 토큰을 이식. 토큰 원본은 `src/app/globals.css`의
`:root`/`.dark`/`@theme inline` 블록이며, booking-service와 동일한 값 체계를 공유합니다.
브랜드 색/폰트를 바꾸려면 이 블록만 수정하면 전 화면에 반영됩니다.
