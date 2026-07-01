"use client";

import { createEvent } from "@/actions/events";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewEventPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;

    const result = await createEvent({
      title: get("title"),
      date: get("date"),
      location: get("location"),
      description: get("description") || undefined,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "설명회 생성에 실패했습니다.");
      return;
    }
    router.push(`/events/${result.data?.id}`);
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
            <label className="block text-sm font-medium text-foreground mb-1">설명 (선택)</label>
            <textarea
              name="description"
              rows={3}
              placeholder="설명회에 대한 추가 안내사항"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            />
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
