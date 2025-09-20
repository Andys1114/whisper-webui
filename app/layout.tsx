import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Groq Whisper API 转 SRT 工具',
  description: '通过 Groq API 将音频文件转录并转换为 SRT 字幕的 Next.js WebUI。',
  icons: [{ rel: 'icon', url: '/favourite.webp' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hans" className="bg-transparent">
      <body className={`${inter.className} bg-transparent text-slate-100 antialiased`}>
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-8WF6G1CWV7" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8WF6G1CWV7');
          `}
        </Script>
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="19061520-f9e3-400e-812f-1c991c53cd1d"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
