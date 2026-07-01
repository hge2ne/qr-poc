"use client";

import { createEvent } from "@/actions/events";
import { CAMPUSES } from "@/components/mobile/mockData";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ATTENDEE_COUNT_MAX_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function NewEventPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attendeeCountEnabled, setAttendeeCountEnabled] = useState(false);
  const [attendeeCountMax, setAttendeeCountMax] = useState(5);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;
    const title = get("title");
    const date = get("date");
    const campus = get("campus");
    const round = get("round") || undefined;
    const location = get("location");
    const capacity = Number(get("capacity"));
    const description = get("description") || undefined;

    const result = await createEvent({
      title,
      date,
      campus,
      round,
      location,
      capacity,
      description,
      attendeeCountEnabled,
      attendeeCountMax,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "설명회 생성에 실패했습니다.");
      return;
    }

    if (!result.data?.id) {
      setError("설명회 생성 결과를 확인할 수 없습니다.");
      return;
    }

    router.push(`/events/${result.data.id}`);
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-muted-foreground">
          대시보드
        </Link>
        <span className="text-input">/</span>
        <span className="text-sm text-foreground font-medium">새 설명회</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h1 className="text-xl font-bold text-foreground mb-5">설명회 생성</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">설명회명 *</label>
            <input
              name="title"
              type="text"
              required
              placeholder="예: 2026 서울대학교 입학설명회"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">날짜 *</label>
            <input
              name="date"
              type="datetime-local"
              required
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">캠퍼스 *</label>
              <select
                name="campus"
                required
                className="w-full border border-input bg-card rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                {CAMPUSES.map((campus) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">회차</label>
              <input
                name="round"
                type="text"
                placeholder="예: 1회차"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">장소 *</label>
            <input
              name="location"
              type="text"
              required
              placeholder="예: 서울대학교 교육문화회관 대강당"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">정원 *</label>
            <input
              name="capacity"
              type="number"
              min={1}
              required
              defaultValue={200}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">설명 (선택)</label>
            <textarea
              name="description"
              rows={3}
              placeholder="설명회에 대한 추가 안내사항"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            />
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-medium text-foreground">참석 인원 필드</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  예약 화면에서 참석 인원을 선택받습니다.
                </span>
              </span>
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={attendeeCountEnabled}
                  onChange={(e) => setAttendeeCountEnabled(e.target.checked)}
                  className="peer sr-only"
                  aria-label="참석 인원 필드 사용"
                />
                <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                <span className="absolute left-1 h-4 w-4 rounded-full bg-card transition-transform peer-checked:translate-x-5" />
              </span>
            </label>

            {attendeeCountEnabled && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-1">
                  선택 옵션
                </label>
                <select
                  value={attendeeCountMax}
                  onChange={(e) => setAttendeeCountMax(Number(e.target.value))}
                  className="w-full border border-input bg-card rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  {ATTENDEE_COUNT_MAX_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      1명 ~ {option}명
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {error && (
            <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "생성 중..." : "설명회 생성"}
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 border border-input rounded-lg text-sm text-muted-foreground hover:bg-background transition-colors text-center"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
