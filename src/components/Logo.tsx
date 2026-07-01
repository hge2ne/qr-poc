// 서비스 로고 (임시 텍스트 마크 'npr' — 정식 로고 확정 전까지 사용)
// 크기는 부모의 font-size(text-*)로 조절됩니다. padding이 em 단위라 함께 스케일됩니다.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block select-none font-black lowercase leading-none tracking-tight ${className}`}
      aria-label="npr"
    >
      <span className="rounded-md bg-primary px-[0.4em] py-[0.2em] text-white">npr</span>
    </span>
  );
}
