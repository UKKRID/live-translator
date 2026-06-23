'use client'
import Link from 'next/link'

export default function SubscriptionBanner({ plan, usage }: { plan: string; usage?: number }) {
  if (plan !== 'FREE') return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold">Upgrade to Pro</p>
          <p className="text-sm opacity-90">Unlock Whisper API + 13 languages + Unlimited</p>
        </div>
        <Link href="/pricing" className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition">
          Upgrade →
        </Link>
      </div>
    </div>
  )
}
