import { getStudentRoster } from "@/actions/students";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function StudentsPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/my-qr");

  const roster = await getStudentRoster();
  const students = roster.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">학원 재원생 목록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          수동 예약과 태블릿 QR 입장 처리에 사용하는 재원생 기본 명단입니다.
        </p>
      </div>

      {!roster.success ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {roster.error ?? "재원생 목록을 불러오지 못했습니다."}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-muted px-5 py-4">
              <h2 className="font-semibold text-foreground">
                재원생 명단 ({students.length}명)
              </h2>
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary">
                활성
              </span>
            </div>

            {students.length === 0 ? (
              <div className="px-5 py-12 text-center text-muted-foreground">
                <p className="text-sm font-medium">등록된 재원생이 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-muted bg-background">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        학생이름
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        학교
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        학년
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        학부모 연락처
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-background">
                    {students.map((student) => (
                      <tr key={student.id} className="transition-colors hover:bg-background">
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                          {student.name}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {student.school}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {student.grade}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {student.parentPhone}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
