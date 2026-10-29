import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Volume Lab", template: "%s · Volume Lab" },
  description: "볼륨을 키우는 운동 기록, 단백질 중심 식단, 인바디 추적",
  appleWebApp: { capable: true, title: "Volume Lab", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="app-glow min-h-full">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{ style: { background: "#141516", border: "1px solid rgb(255 255 255 / 0.08)" } }}
        />
      </body>
    </html>
  );
}
