import Link from "next/link";
import { StudentAddForm } from "../StudentAddForm";

export default function NewStudentPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/students" className="text-sm text-muted-foreground hover:text-foreground">
          학원 재원생 목록
        </Link>
        <span className="text-input">/</span>
        <span className="text-sm font-medium text-foreground">학생 추가</span>
      </div>

      <StudentAddForm />
    </div>
  );
}
