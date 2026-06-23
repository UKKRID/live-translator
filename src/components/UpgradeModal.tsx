'use client'
import { useState } from 'react'
import { getStripe } from '@/lib/stripe-client'

export default function UpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleUpgrade = async () => {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">Upgrade to Pro</h2>
        <ul className="text-gray-300 space-y-2 mb-6">
          <li>✓ Whisper API (Accuracy สูงกว่า)</li>
          <li>✓ 13 ภาษาเต็ม</li>
          <li>✓ Microphone Mode</li>
          <li>✓ ไม่จำกัดเวลา</li>
        </ul>
        <p className="text-3xl font-bold text-white mb-6">฿199<span className="text-sm text-gray-400">/เดือน</span></p>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-gray-700 text-white">Cancel</button>
          <button onClick={handleUpgrade} disabled={loading} className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold">
            {loading ? 'Processing...' : 'Upgrade Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
