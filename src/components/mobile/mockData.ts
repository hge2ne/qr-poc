// 모바일 예약 화면에서 사용하는 고정 선택값.

export const CAMPUSES = ["송파캠퍼스", "위례캠퍼스", "광진캠퍼스"] as const;
export type Campus = (typeof CAMPUSES)[number];

export const DEFAULT_ATTENDEE_COUNT_OPTIONS = [1, 2, 3, 4, 5];
