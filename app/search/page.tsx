import SemanticSearch from '@/components/SemanticSearch'

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <SemanticSearch />
    </div>
  )
}

export const metadata = {
  title: 'セマンティック検索 | AIニュースアプリ',
  description: '自然な言葉でニュースを検索 - AIがあなたの検索意図を理解します',
}