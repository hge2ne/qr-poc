"use client";

import { createAttendee } from "@/actions/attendees";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

type CreatedResult = {
  id: string;
  qrToken: string;
  qrUrl: string;
  name: string;
};

export default function NewAttendeePage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedResult | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;

    const result = await createAttendee({ eventId: params.id, name, phone });
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "등록에 실패했습니다.");
      return;
    }
    setCreated({ ...result.data!, name });
  }

  if (created) {
    return (
      <div className="max-w-lg">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-success/15 rounded-full mb-4">
            <span className="text-success text-xl">✓</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">{created.name} 님 등록 완료</h2>
          <p className="text-sm text-muted-foreground mb-6">QR 코드를 다운로드하여 학부모에게 전달하세요</p>
          <QRCodeDisplay
            value={created.qrUrl}
            size={220}
            downloadName={`${created.name}_QR`}
          />
          <div className="flex gap-2 mt-6">
            <Link
              href={`/events/${params.id}/attendees/new`}
              onClick={() => setCreated(null)}
              className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors text-center"
            >
              다음 참석자 등록
            </Link>
            <Link
              href={`/events/${params.id}`}
              className="flex-1 border border-input text-muted-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-background transition-colors text-center"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-muted-foreground">대시보드</Link>
        <span className="text-input">/</span>
        <Link href={`/events/${params.id}`} className="text-sm text-muted-foreground hover:text-muted-foreground">설명회</Link>
        <span className="text-input">/</span>
        <span className="text-sm text-foreground font-medium">참석자 등록</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h1 className="text-xl font-bold text-foreground mb-5">참석자 등록</h1>
        <p className="text-sm text-muted-foreground mb-5">
          등록 완료 시 고유 QR 코드가 자동으로 생성됩니다.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">학부모 이름 *</label>
            <input
              name="name"
              type="text"
              required
              placeholder="홍길동"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">연락처 *</label>
            <input
              name="phone"
              type="tel"
              required
              placeholder="010-0000-0000"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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
              {loading ? "등록 중..." : "등록 및 QR 생성"}
            </button>
            <Link
              href={`/events/${params.id}`}
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
