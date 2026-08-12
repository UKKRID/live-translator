import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})
