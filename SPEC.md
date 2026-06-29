# 대입설명회 QR 입장 관리 시스템 - 기능명세서 (POC)

> 작성일: 2026-06-29 | 상태: 확정 (Vercel 배포 포함)

---

## 1. 프로젝트 개요

대입설명회 운영 시 학부모 입장 QR을 생성하고 현장에서 스캐너로 신분 확인/입장 처리하는 웹 기반 POC 시스템.

---

## 2. 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| Framework | Next.js 14 (App Router) | 풀스택 단일 레포 |
| 데이터 레이어 | **Server Actions** | URL 없는 타입세이프 서버 함수 (REST API 대체) |
| Database | **PostgreSQL (Neon)** + Prisma | Vercel Storage에서 무료 생성. SQLite는 Vercel 서버리스 환경에서 동작 안 함 |
| QR 생성 | `qrcode.react` | 무료 오픈소스 |
| QR 스캐너 | `html5-qrcode` | 무료 오픈소스, 카메라 기반 |
| 스타일 | Tailwind CSS | 빠른 UI 개발 |
| 언어 | TypeScript | - |
| 배포 | **Vercel** | VSCode Vercel 플러그인으로 배포 |

---

## 3. 사용자 역할

| 역할 | 설명 | 주요 권한 |
|------|------|-----------|
| `ADMIN` | 관리자 (학교/운영팀) | 이벤트 CRUD, 참석자 CRUD, QR 발급, 스캐너 사용, 전체 현황 조회 |
| `PARENT` | 학부모 | 본인 QR 조회만 가능 |

---

## 4. 기능 명세

### 4-1. 인증 (Security 없이 단순 구현)

| 기능 | 설명 |
|------|------|
| 회원가입 | 이름, 이메일, 비밀번호 (plain text 저장, POC) |
| 로그인 | 이메일 + 비밀번호 매칭, 세션은 쿠키로 단순 관리 |
| 역할 구분 | 첫 번째 가입 계정은 ADMIN, 이후 가입은 PARENT (또는 admin이 수동 변경) |

### 4-2. 이벤트(설명회) 관리 - ADMIN 전용

| 기능 | 설명 |
|------|------|
| 이벤트 생성 | 설명회 이름, 날짜, 장소 |
| 이벤트 목록 | 전체 설명회 목록, 참석자 수 / 입장 수 통계 표시 |
| 이벤트 상세 | 해당 설명회 참석자 목록 + 입장 현황 |
| 이벤트 수정/삭제 | - |

### 4-3. 참석자 관리 - ADMIN 전용 (CRUD)

| 기능 | Server Action | 설명 |
|------|--------------|------|
| 참석자 등록 | `createAttendee()` | 이름, 연락처, 이벤트 선택 → QR 토큰 자동 생성 |
| 참석자 목록 | `getAttendees()` | 이름, 연락처, 상태(미입장/입장완료), 입장시간 |
| 참석자 수정 | `updateAttendee()` | 이름, 연락처 수정 |
| 참석자 삭제 | `deleteAttendee()` | 등록 취소 |
| 입장 처리 | `verifyQRToken()` | QR 스캔 시 status → ENTERED, enteredAt 기록 |

### 4-4. 회원별 고유 URL 생성 및 QR 코드 발급 ⭐ 핵심 기능

> 이 기능이 시스템의 중심입니다. 모든 다른 기능(스캐너, 입장 처리, 통계)은 이 URL을 기반으로 동작합니다.

**URL 생성 원칙:**
- 참석자 1명 × 이벤트 1개 = **고유 URL 1개**
- URL 형식: `https://{배포도메인}/verify/{qrToken}`
- `qrToken`: UUID v4 기반 (`crypto.randomUUID()` 사용), DB에 UNIQUE 제약
- 한번 생성된 토큰은 변경되지 않음 (QR 재발급 없이 안정적 운영)
- `BASE_URL` 환경 변수로 도메인 관리 (로컬: `http://localhost:3000`, 배포: Vercel 도메인)

**URL 생성 시점:** `createAttendee()` Server Action 호출 시 자동 생성

| 기능 | 설명 |
|------|------|
| 토큰 자동 생성 | 참석자 등록 시 `crypto.randomUUID()` 로 qrToken 발급 |
| 고유 URL 조합 | `${process.env.BASE_URL}/verify/${qrToken}` 형태로 URL 생성 |
| QR 화면 렌더링 | `qrcode.react`로 해당 URL을 QR 이미지로 변환하여 화면 표시 |
| QR PNG 다운로드 | Canvas → PNG 변환, 파일명: `{이름}_{이벤트명}_QR.png` |
| URL 직접 복사 | 클립보드에 고유 URL 복사 버튼 (카카오톡 공유 등 활용) |

**예시:**
```
참석자: 홍길동 (010-1234-5678)
이벤트: 2026 서울대학교 입학설명회
qrToken: 550e8400-e29b-41d4-a716-446655440000

생성 URL: https://qr-poc.vercel.app/verify/550e8400-e29b-41d4-a716-446655440000
QR 코드: 위 URL을 인코딩한 이미지
```

### 4-5. QR 스캐너 (현장 입장 처리) - ADMIN 전용

| 기능 | 설명 |
|------|------|
| 카메라 스캔 | 브라우저 카메라로 QR 인식 (html5-qrcode) |
| 입장 처리 | 스캔 성공 → URL에서 토큰 추출 → `verifyQRToken(token)` 호출 → 상태 ENTERED로 변경 |
| 중복 입장 감지 | 이미 입장한 QR 재스캔 시 경고 표시 |
| 스캔 결과 표시 | 학부모 이름, 연락처, 입장 시간 표시 |
| 오류 처리 | 유효하지 않은 QR 스캔 시 오류 표시 |

### 4-6. 본인 QR 조회 - PARENT 전용

| 기능 | 설명 |
|------|------|
| 내 QR 조회 | 로그인한 학부모가 본인의 QR 코드 확인 |
| 이벤트별 QR | 여러 이벤트에 등록된 경우 각 이벤트별 QR 표시 |

---

## 5. 데이터 모델

### User
```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(PARENT)
  createdAt DateTime @default(now())
  attendees Attendee[]
}

enum Role {
  ADMIN
  PARENT
}
```

### Event (설명회)
```prisma
model Event {
  id          String     @id @default(cuid())
  title       String
  date        DateTime
  location    String
  description String?
  createdAt   DateTime   @default(now())
  attendees   Attendee[]
}
```

### Attendee (참석자)
```prisma
model Attendee {
  id        String          @id @default(cuid())
  name      String
  phone     String
  eventId   String
  userId    String?         // 학부모 계정이 있는 경우 연결
  qrToken   String          @unique @default(cuid())
  status    AttendeeStatus  @default(PENDING)
  enteredAt DateTime?
  createdAt DateTime        @default(now())
  event     Event           @relation(...)
  user      User?           @relation(...)
}

enum AttendeeStatus {
  PENDING
  ENTERED
}
```

---

## 6. 화면 구성

| 경로 | 화면 | 접근 |
|------|------|------|
| `/` | 홈 → 로그인 페이지로 리다이렉트 | 공개 |
| `/auth/login` | 로그인 | 공개 |
| `/auth/signup` | 회원가입 | 공개 |
| `/dashboard` | 관리자 대시보드 (이벤트 목록 + 통계) | ADMIN |
| `/events/new` | 이벤트 생성 | ADMIN |
| `/events/[id]` | 이벤트 상세 + 참석자 목록 | ADMIN |
| `/events/[id]/attendees/new` | 참석자 등록 + QR 생성 | ADMIN |
| `/events/[id]/attendees/[attendeeId]` | 참석자 상세 + QR 표시/다운로드 | ADMIN |
| `/scanner` | QR 스캐너 | ADMIN |
| `/verify/[token]` | QR 인증 페이지 (외부 카메라 스캔 시 직접 접근) | 공개 |
| `/my-qr` | 본인 QR 조회 | PARENT |

---

## 7. QR 입장 흐름

```
[관리자 사전 작업]
  1. 이벤트(설명회) 생성
  2. 학부모 등록 (이름 + 연락처) → UUID 토큰 자동 생성
  3. QR 코드 화면에서 확인 → PNG 다운로드 → 학부모에게 전달 (출력 or 공유)

[현장 입장]
  4. 관리자가 /scanner 페이지 오픈
  5. 학부모 QR 스캔 (html5-qrcode가 URL 문자열 반환)
  6. 스캐너 컴포넌트에서 URL → token 파싱 후 verifyQRToken(token) 호출
     (fetch 없음, URL 지정 없음 — Server Action import 후 직접 호출)
  7. DB에서 토큰 조회 → status: PENDING → ENTERED, enteredAt 기록
  8. 스캐너 화면에 "입장 완료: 홍길동" 표시
  (이미 입장한 경우: "이미 입장 처리된 QR입니다" 경고)
```

---

## 8. Server Action 설계

> REST API 대신 Next.js Server Actions를 사용합니다.
> 프론트엔드 개발자는 URL을 알거나 지정할 필요 없이 함수를 import해서 호출합니다.
> TypeScript import 자체가 타입 계약입니다.

### 공통 반환 타입

```typescript
// app/actions/types.ts
type ActionResult<T = undefined> = {
  success: boolean
  error?: string   // 실패 시 사용자에게 보여줄 메시지
  data?: T
}
```

---

### 8-1. `actions/auth.ts` — 인증

```typescript
'use server'

// 회원가입 (최초 가입자 → ADMIN, 이후 → PARENT)
export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<ActionResult<{ role: 'ADMIN' | 'PARENT' }>>

// 로그인 → 세션 쿠키 설정
export async function login(
  email: string,
  password: string
): Promise<ActionResult<{ userId: string; role: 'ADMIN' | 'PARENT' }>>

// 로그아웃 → 세션 쿠키 삭제
export async function logout(): Promise<ActionResult>

// 현재 세션 조회 (Server Component에서 직접 호출)
export async function getSession(): Promise<{
  userId: string
  name: string
  role: 'ADMIN' | 'PARENT'
} | null>
```

**프론트엔드 사용 예시:**
```typescript
import { login } from '@/actions/auth'

// URL 없음, fetch 없음
const result = await login(email, password)
if (result.success) redirect('/dashboard')
```

---

### 8-2. `actions/events.ts` — 이벤트(설명회) 관리

```typescript
'use server'

export async function createEvent(data: {
  title: string
  date: string       // ISO 8601
  location: string
  description?: string
}): Promise<ActionResult<{ id: string }>>

export async function getEvents(): Promise<ActionResult<{
  id: string
  title: string
  date: string
  location: string
  totalCount: number    // 전체 참석자 수
  enteredCount: number  // 입장 완료 수
}[]>>

export async function getEvent(id: string): Promise<ActionResult<{
  id: string
  title: string
  date: string
  location: string
  description?: string
  attendees: Attendee[]
}>>

export async function updateEvent(
  id: string,
  data: { title?: string; date?: string; location?: string; description?: string }
): Promise<ActionResult>

export async function deleteEvent(id: string): Promise<ActionResult>
```

---

### 8-3. `actions/attendees.ts` — 참석자 관리

```typescript
'use server'

export async function createAttendee(data: {
  eventId: string
  name: string
  phone: string
  userId?: string  // 학부모 계정이 있는 경우 연결
}): Promise<ActionResult<{
  id: string
  qrToken: string
  qrUrl: string    // ex) https://example.com/verify/TOKEN
}>>

export async function getAttendees(eventId: string): Promise<ActionResult<{
  id: string
  name: string
  phone: string
  qrToken: string
  status: 'PENDING' | 'ENTERED'
  enteredAt: string | null
}[]>>

export async function getAttendee(id: string): Promise<ActionResult<{
  id: string
  name: string
  phone: string
  eventId: string
  qrToken: string
  qrUrl: string
  status: 'PENDING' | 'ENTERED'
  enteredAt: string | null
}>>

export async function updateAttendee(
  id: string,
  data: { name?: string; phone?: string }
): Promise<ActionResult>

export async function deleteAttendee(id: string): Promise<ActionResult>
```

---

### 8-4. `actions/verify.ts` — QR 인증 및 입장 처리

```typescript
'use server'

// QR 스캔 시 스캐너 컴포넌트에서 호출
// URL에서 파싱한 token을 인자로 넘김 — fetch 없음
export async function verifyQRToken(token: string): Promise<ActionResult<{
  attendeeName: string
  phone: string
  eventTitle: string
  enteredAt: string
  alreadyEntered: boolean  // true면 중복 입장 경고
}>>

// PARENT 로그인 후 본인 QR 목록 조회
export async function getMyQRCodes(): Promise<ActionResult<{
  id: string
  eventTitle: string
  eventDate: string
  qrToken: string
  qrUrl: string
  status: 'PENDING' | 'ENTERED'
}[]>>
```

**스캐너 컴포넌트 사용 예시:**
```typescript
import { verifyQRToken } from '@/actions/verify'

// html5-qrcode가 반환한 URL: "https://example.com/verify/abc123"
const token = scannedUrl.split('/verify/')[1]

// fetch('/api/verify/abc123') 대신 — URL 지정 없음
const result = await verifyQRToken(token)
if (result.data?.alreadyEntered) {
  showWarning('이미 입장 처리된 QR입니다')
} else {
  showSuccess(`입장 완료: ${result.data?.attendeeName}`)
}
```

---

### 8-5. Route Handler (최소화 — 1개만 유지)

Server Actions로 대체 불가한 경우에만 Route Handler를 사용합니다.

| 경로 | 유지 이유 |
|------|----------|
| `/verify/[token]` **(Page, API 아님)** | QR 코드에 담긴 URL. 외부 카메라 앱으로 스캔 시 브라우저가 직접 접근. Server Component로 구현하여 페이지 로드 시 자동 입장 처리. |

> **Route Handler(`/api/*`)는 0개** — 모든 데이터 조작은 Server Actions로 처리.

---

### 8-6. 전통 REST vs Server Actions 비교 (본 프로젝트 기준)

| 구분 | 전통 REST API | Server Actions (채택) |
|------|--------------|----------------------|
| 백엔드 | `POST /api/events` 라우트 정의 | `export async function createEvent()` |
| 프론트 | `fetch('/api/events', { method: 'POST', body })` | `import { createEvent }` 후 호출 |
| 타입 공유 | 별도 타입 파일 / OpenAPI 스펙 필요 | TypeScript import 자체가 계약 |
| URL 관리 | 백엔드·프론트 양쪽에서 URL 문자열 일치시켜야 함 | URL 없음 — 함수 이름이 곧 API |
| 에러 처리 | `res.status`, `res.json()` 파싱 | 반환 타입 `ActionResult<T>` 로 일관 처리 |

---

## 9. 환경 변수

| 변수명 | 설명 | 로컬 값 예시 | Vercel 값 |
|--------|------|-------------|-----------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | (Vercel에서 pull) | Neon DB URL (자동 주입) |
| `BASE_URL` | QR URL 생성 기준 도메인 | `http://localhost:3000` | `https://qr-poc.vercel.app` |
| `SESSION_SECRET` | 쿠키 서명용 키 (POC) | 임의 문자열 32자 이상 | 동일 |

**로컬 `.env.local` 예시:**
```env
DATABASE_URL="postgresql://..."
BASE_URL="http://localhost:3000"
SESSION_SECRET="your-secret-key-min-32-chars-here"
```

> `BASE_URL`은 QR에 담기는 URL의 도메인을 결정합니다.
> 배포 후 Vercel 도메인이 확정되면 이 값을 업데이트해야 QR이 올바른 URL을 가리킵니다.

---

## 10. Vercel 배포

### 10-1. 데이터베이스 설정 (SQLite → PostgreSQL 전환 이유)

| 항목 | SQLite | PostgreSQL (Neon) |
|------|--------|-------------------|
| Vercel 호환 | ❌ 서버리스 환경에서 파일 시스템 휘발 | ✅ 네트워크 기반, 영구 저장 |
| 무료 여부 | ✅ | ✅ (Neon 무료 티어) |
| 설정 난이도 | 없음 | Vercel 대시보드에서 클릭 몇 번 |

**Vercel Postgres(Neon) 생성 순서:**
1. Vercel 대시보드 → **Storage** 탭 → **Create Database** → **Postgres**
2. 생성 완료 → 해당 Vercel 프로젝트에 연결
3. `DATABASE_URL` 환경 변수 자동 등록됨

### 10-2. Prisma 빌드 설정

Vercel은 배포 시 `npm install` 후 `next build`를 실행합니다.
Prisma Client는 빌드 전에 생성되어야 하므로 `package.json`에 아래를 추가합니다:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma migrate deploy && next build"
  }
}
```

### 10-3. VSCode Vercel 플러그인 배포 워크플로우

```
[1단계 - 최초 1회]
VSCode → Vercel 익스텐션 → 로그인 (사용자 진행)
터미널: npx vercel link           → Vercel 프로젝트 연결
터미널: npx vercel env pull       → 환경 변수 로컬에 .env.local로 동기화

[2단계 - DB 초기화]
Vercel 대시보드 → Storage → PostgreSQL 생성 및 프로젝트 연결
터미널: npx prisma migrate deploy  → 스키마를 Neon DB에 적용

[3단계 - 배포]
터미널: npx vercel --prod          → 프로덕션 배포
또는 VSCode Vercel 익스텐션 사이드바 → Deploy 버튼
```

### 10-4. 배포 후 필수 확인

| 체크 항목 | 이유 |
|----------|------|
| `BASE_URL` 환경 변수를 Vercel 도메인으로 업데이트 | QR 코드에 담기는 URL이 올바른 배포 도메인을 가리켜야 함 |
| `/verify/[token]` 페이지 접근 테스트 | QR 핵심 기능 동작 확인 |
| `/scanner` 카메라 권한 (HTTPS 필수) | 브라우저 카메라 API는 HTTPS에서만 동작. Vercel은 기본 HTTPS 제공 |

> **카메라 주의:** `html5-qrcode`의 카메라 접근은 `https://` 또는 `localhost`에서만 허용됩니다.
> 로컬 개발은 `localhost:3000`에서 정상 동작하지만, Vercel 배포 도메인도 자동 HTTPS이므로 문제 없습니다.
