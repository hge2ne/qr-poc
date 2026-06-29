import { getMyQRCodes } from "@/actions/verify";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

export default async function MyQRPage() {
  const result = await getMyQRCodes();

  if (!result.success) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>{result.error}</p>
      </div>
    );
  }

  const codes = result.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">내 QR 코드</h1>

      {codes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🎫</div>
          <p>등록된 QR 코드가 없습니다</p>
          <p className="text-sm mt-1">관리자에게 등록을 요청하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {codes.map((code) => (
            <div key={code.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">{code.eventTitle}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(code.eventDate).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <span
                  className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                    code.status === "ENTERED"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {code.status === "ENTERED" ? "✓ 입장 완료" : "미입장"}
                </span>
              </div>
              <QRCodeDisplay
                value={code.qrUrl}
                size={180}
                downloadName={`${code.eventTitle}_QR`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
