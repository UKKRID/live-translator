import SubscriptionButton from '@/components/SubscriptionButton'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-12">Pricing</h1>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free */}
          <div className="bg-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Free</h2>
            <p className="text-4xl font-bold text-white mb-6">฿0<span className="text-lg text-gray-400">/เดือน</span></p>
            <ul className="text-gray-300 space-y-3 mb-8">
              <li>✓ Tab Audio Mode</li>
              <li>✓ 3 ภาษา</li>
              <li>✓ 30 นาที/วัน</li>
            </ul>
            <button className="w-full py-3 px-6 rounded-lg bg-gray-700 text-white">Current Plan</button>
          </div>
          {/* Pro */}
          <div className="bg-gray-800 rounded-xl p-8 border-2 border-blue-500">
            <h2 className="text-2xl font-bold text-white mb-4">Pro</h2>
            <p className="text-4xl font-bold text-white mb-6">฿199<span className="text-lg text-gray-400">/เดือน</span></p>
            <ul className="text-gray-300 space-y-3 mb-8">
              <li>✓ Whisper API (แม่นยำกว่า)</li>
              <li>✓ 13 ภาษาเต็ม</li>
              <li>✓ Microphone Mode</li>
              <li>✓ ไม่จำกัดเวลา</li>
              <li>✓ Export History</li>
            </ul>
            <SubscriptionButton plan="PRO" />
          </div>
          {/* Enterprise */}
          <div className="bg-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Enterprise</h2>
            <p className="text-4xl font-bold text-white mb-6">฿999<span className="text-lg text-gray-400">/เดือน</span></p>
            <ul className="text-gray-300 space-y-3 mb-8">
              <li>✓ ทุกอย่างใน Pro</li>
              <li>✓ Custom API Key</li>
              <li>✓ Team seats</li>
              <li>✓ Admin Dashboard</li>
              <li>✓ Priority Support</li>
            </ul>
            <SubscriptionButton plan="ENTERPRISE" />
          </div>
        </div>
      </div>
    </div>
  )
}
