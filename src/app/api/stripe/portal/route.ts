import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getUser } from '@/lib/auth'

export async function POST() {
  try {
    const user = await getUser()
    if (!user?.subscription?.stripeSubId) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    const { url } = await stripe.billingPortal.sessions.create({
      customer: user.subscription.stripeSubId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })

    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
