import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI News App - スマートなニュースアプリ',
  description: 'AIが要約する、本当に必要なニュースだけを配信するスマートなニュースアプリ',
  keywords: ['ニュース', 'AI', '要約', '翻訳', 'テック', 'ビジネス'],
  authors: [{ name: 'AI News App' }],
  openGraph: {
    title: 'AI News App',
    description: 'AIが要約する、本当に必要なニュースだけを配信',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI News App',
    description: 'AIが要約する、本当に必要なニュースだけを配信',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${inter.className} h-full bg-[#8B4513] dark:bg-[#5D2F0D] text-white dark:text-amber-100`}>
        <div className="min-h-full flex flex-col">
          {/* ヘッダー */}
          <header className="sticky top-0 z-40 bg-[#F5E6D3]/95 dark:bg-[#3E2723]/95 backdrop-blur-sm border-b border-[#D2691E] dark:border-[#8B6914]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AI</span>
                  </div>
                  <h1 className="text-xl font-bold text-[#3E2723] dark:text-[#F5E6D3]">
                    News App
                  </h1>
                </div>
                
                {/* ダークモード切り替えボタン（後で実装） */}
                <div className="flex items-center space-x-2">
                  <button className="p-2 rounded-lg bg-[#FFF8E1] dark:bg-[#5D4037] hover:bg-[#FAEBD7] dark:hover:bg-[#6D4C41] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* メインコンテンツ */}
          <main className="flex-1">
            {children}
          </main>

          {/* フッター */}
          <footer className="bg-[#F5E6D3] dark:bg-[#3E2723] border-t border-[#D2691E] dark:border-[#8B6914]">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-[#5D4037] dark:text-[#D2B48C]">
                © 2024 AI News App. AIが要約する、スマートなニュース体験。
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}