export default function TestSimplePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 テストページ
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-700">
            このページが表示されれば、Next.jsは正常に動作しています。
          </p>
          <p className="text-gray-500 mt-2">
            現在時刻: {new Date().toLocaleString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  )
}