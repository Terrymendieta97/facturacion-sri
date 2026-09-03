import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lojafac - Facturación Electrónica Ecuador | Sistema SRI y Punto de Venta POS",
  description: "Emite facturas electrónicas autorizadas por el SRI en Ecuador al instante. Punto de venta POS rápido, integración WooCommerce, Shopify y API REST.",
  keywords: [
    "facturación electrónica ecuador",
    "sri facturas",
    "lojafac",
    "sistema de facturacion sri",
    "facturacion pos ecuador",
    "api facturacion sri",
    "woocommerce sri ecuador",
    "shopify facturacion ecuador",
    "firma electronica p12 sri"
  ],
  authors: [{ name: "Lojafac Ecuador" }],
  creator: "Lojafac",
  publisher: "Lojafac",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_EC",
    url: "https://lojafac.com",
    title: "Lojafac - Facturación Electrónica Ecuador SRI",
    description: "La plataforma de facturación electrónica más rápida, moderna y económica de Ecuador. Emite facturas autorizadas en segundos.",
    siteName: "Lojafac Facturación SRI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lojafac - Facturación Electrónica Ecuador",
    description: "Emite facturas autorizadas por el SRI al instante. Punto de Venta POS y API REST.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Lojafac - Facturación Electrónica Ecuador",
    "operatingSystem": "Web, Windows, Android, iOS, macOS, Linux",
    "applicationCategory": "BusinessApplication, FinancialApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.10",
      "priceCurrency": "USD"
    },
    "description": "Sistema y API de Facturación Electrónica en Ecuador homologado con el SRI.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "128"
    }
  };

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900">{children}</body>
    </html>
  );
}
