import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 실기기(같은 Wi-Fi)에서 dev 서버 접속 시 클라이언트 리소스(HMR/하이드레이션) 허용.
  // Next.js는 기본적으로 다른 origin의 dev 리소스 요청을 차단함.
  allowedDevOrigins: ["192.168.0.143"],
};

export default nextConfig;
