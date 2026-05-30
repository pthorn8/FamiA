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
  applicationName: "Familjeappen",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Familjen",
    startupImage: "/apple-touch-icon.png",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2D3142" },
    { media: "(prefers-color-scheme: dark)", color: "#16171f" },
  ],
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
