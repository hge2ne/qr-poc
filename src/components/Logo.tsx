// 서비스 로고 (임시 텍스트 마크 'NPR' — 정식 로고 확정 전까지 사용)
// 크기는 부모의 font-size(text-*)로 조절됩니다. 올리브 그린 볼드 텍스트 마크.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block select-none font-bold uppercase leading-none tracking-tight text-primary ${className}`}
      aria-label="NPR"
    >
      NPR
    </span>
  );
}
