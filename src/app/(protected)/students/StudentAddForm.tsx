"use client";

import { createStudent } from "@/actions/students";
import { GRADE_OPTIONS } from "@/lib/grades";
import { formatPhoneNumber } from "@/lib/phone";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type CreatedStudent = {
  name: string;
  school: string;
  grade: string;
  className: string;
};

const emptyForm = {
  name: "",
  school: "",
  grade: "",
  className: "",
  parentPhone: "",
};

export function StudentAddForm() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedStudent | null>(null);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await createStudent(form);

      if (!result.success || !result.data) {
        setError(result.error ?? "학생 등록에 실패했습니다.");
        return;
      }

      setCreated({
        name: result.data.name,
        school: result.data.school,
        grade: result.data.grade,
        className: result.data.className,
      });
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError("학생 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
          <span className="text-xl text-success">✓</span>
        </div>
        <h2 className="mb-1 text-lg font-bold text-foreground">
          {created.name} 학생 등록 완료
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {created.school} · {created.grade} · {created.className}
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setError("");
            }}
            className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            다음 학생 추가
          </button>
          <Link
            href="/students"
            className="flex-1 rounded-lg border border-input py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-background"
          >
            명단으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="mb-2 text-xl font-bold text-foreground">학생 추가</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        수동예약과 태블릿 QR 입장 처리에 사용할 재원생 정보를 입력합니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">학생 이름 *</label>
          <input
            name="studentName"
            type="text"
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="홍길동"
            className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">학교 *</label>
            <input
              name="school"
              type="text"
              required
              value={form.school}
              onChange={(event) => updateField("school", event.target.value)}
              placeholder="예: 방산중"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">학년 *</label>
            <select
              name="grade"
              required
              value={form.grade}
              onChange={(event) => updateField("grade", event.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                학년 선택
              </option>
              {GRADE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">반 *</label>
          <input
            name="className"
            type="text"
            required
            value={form.className}
            onChange={(event) => updateField("className", event.target.value)}
            placeholder="예: 3학년 2반"
            className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            학부모 연락처 *
          </label>
          <input
            name="parentPhone"
            type="tel"
            required
            value={form.parentPhone}
            onChange={(event) => updateField("parentPhone", formatPhoneNumber(event.target.value))}
            placeholder="010-0000-0000"
            className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "학생 등록"}
          </button>
          <Link
            href="/students"
            className="rounded-lg border border-input px-4 py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-background"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
