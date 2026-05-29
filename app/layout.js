// app/layout.js
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { ToastProvider } from "@/lib/ToastContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  title: "Familjeappen",
  description: "Delade listor och kalender för familjen",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Familjen",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#2D3142",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ServiceWorkerRegister />
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
