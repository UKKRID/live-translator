import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      if (userId) {
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            stripeSubId: session.subscription as string,
            plan: 'PRO',
            status: 'ACTIVE',
          },
          create: {
            userId,
            stripeSubId: session.subscription as string,
            plan: 'PRO',
            status: 'ACTIVE',
          },
        })
      }
      break
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await prisma.subscription.updateMany({
        where: { stripeSubId: subscription.id },
        data: {
          status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELED',
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await prisma.subscription.updateMany({
        where: { stripeSubId: subscription.id },
        data: { status: 'CANCELED', plan: 'FREE' },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
