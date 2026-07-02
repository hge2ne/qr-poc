"use client";

import type { ReservationStudent } from "@/actions/reservationTypes";

type StudentLookupResultListProps = {
  students: ReservationStudent[];
  selectedStudentId: string;
  onSelect: (studentId: string) => void;
};

export function StudentLookupResultList({
  students,
  selectedStudentId,
  onSelect,
}: StudentLookupResultListProps) {
  if (students.length === 0) return null;

  return (
    <div className="rounded-xl border border-success/30 bg-success/10 p-4">
      <div className="mb-3 flex items-start gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-xs text-success">
          ✓
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            조회된 재원생 {students.length}명
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            예약할 학생을 선택해 주세요.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {students.map((student) => {
          const selected = student.id === selectedStudentId;
          return (
            <button
              key={student.id}
              type="button"
              onClick={() => onSelect(student.id)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                selected
                  ? "border-primary bg-card"
                  : "border-transparent bg-card/70 hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-foreground">{student.name}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {student.school} · {student.grade} · {student.className}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    selected ? "bg-accent text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {selected ? "선택됨" : "선택"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
