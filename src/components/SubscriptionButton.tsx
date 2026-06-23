'use client'
import { getStripe } from '@/lib/stripe-client'

const PLANS = {
  PRO: { priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!, name: 'Pro', price: '฿199/เดือน' },
  ENTERPRISE: { priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE!, name: 'Enterprise', price: '฿999/เดือน' },
}

export default function SubscriptionButton({ plan }: { plan: 'PRO' | 'ENTERPRISE' }) {
  const handleSubscribe = async () => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: PLANS[plan].priceId }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  return (
    <button
      onClick={handleSubscribe}
      className="w-full py-3 px-6 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
    >
      Subscribe {PLANS[plan].name} - {PLANS[plan].price}
    </button>
  )
}
