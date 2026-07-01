// 모바일 예약 프리뷰용 목업 데이터 (POC — DB 저장 없음)

export const CAMPUSES = ["송파캠퍼스", "위례캠퍼스", "광진캠퍼스"] as const;
export type Campus = (typeof CAMPUSES)[number];

export type MockSession = {
  id: string;
  campus: Campus;
  round: string; // 관리자/목업 식별용 라벨
  title: string;
  date: string; // ISO date
  time: string; // "10:00"
  location: string;
  capacity: number;
  reserved: number;
  attendeeCountEnabled?: boolean;
  attendeeCountOptions?: number[];
  createdAt?: string;
};

export type MockStudent = {
  name: string;
  phone: string;
  grade: string; // 학년
  className: string; // 반
};

export const MOCK_SESSIONS: MockSession[] = [
  {
    id: "s1",
    campus: "송파캠퍼스",
    round: "1회차",
    title: "2026 수시 대입설명회",
    date: "2026-07-12",
    time: "10:00",
    location: "본관 대강당",
    capacity: 200,
    reserved: 152,
  },
  {
    id: "s2",
    campus: "위례캠퍼스",
    round: "2회차",
    title: "2026 수시 대입설명회",
    date: "2026-07-12",
    time: "14:00",
    location: "위례 2관 세미나실",
    capacity: 200,
    reserved: 200,
  },
  {
    id: "s3",
    campus: "광진캠퍼스",
    round: "3회차",
    title: "2026 정시 대입설명회",
    date: "2026-07-19",
    time: "11:00",
    location: "광진 본관 세미나실",
    capacity: 120,
    reserved: 47,
  },
  {
    id: "s4",
    campus: "송파캠퍼스",
    round: "4회차",
    title: "2026 정시 대입설명회",
    date: "2026-07-19",
    time: "14:00",
    location: "제2세미나실",
    capacity: 120,
    reserved: 88,
  },
];

export const DEFAULT_ATTENDEE_COUNT_OPTIONS = [1, 2, 3, 4, 5];

// 재원생 명단 (연락처 조회용)
export const MOCK_STUDENTS: MockStudent[] = [
  { name: "김민준", phone: "010-1234-5678", grade: "고3", className: "3학년 2반" },
  { name: "이서연", phone: "010-2345-6789", grade: "고2", className: "2학년 5반" },
  { name: "박도윤", phone: "010-3456-7890", grade: "고3", className: "3학년 7반" },
  { name: "최지우", phone: "010-4567-8901", grade: "고1", className: "1학년 3반" },
];

// 연락처에서 숫자만 남겨 비교 (하이픈/공백 무시)
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function findStudentByPhone(phone: string): MockStudent | null {
  const target = normalizePhone(phone);
  if (target.length < 9) return null;
  return MOCK_STUDENTS.find((s) => normalizePhone(s.phone) === target) ?? null;
}
