import type { NextConfig } from "next";

// 브라우저가 보내는 /api/v1/* 요청을 Next 서버가 백엔드로 프록시한다.
// 이렇게 하면 브라우저는 같은 출처로만 요청하므로 CORS preflight가 발생하지 않는다.
// localhost / ngrok / 배포된 프런트 어디서 접속해도 같은 방식으로 동작.
//
// 백엔드 CORS가 모든 origin을 정상 허용하게 되면 이 rewrites는 제거하고
// .env.local의 NEXT_PUBLIC_API_BASE_URL을 백엔드 URL로 채워서 직접 호출해도 됨.
const BACKEND_URL =
  "https://port-0-back-end-micz9ngy8b0679ee.sel3.cloudtype.app";

const nextConfig: NextConfig = {
  // ngrok 등 비-localhost origin에서 dev 서버에 접속할 때 필요.
  // 이게 없으면 Next 16 dev가 일부 응답을 거부하거나 깨뜨릴 수 있다.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
    "*.ngrok-free.dev",
  ],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
