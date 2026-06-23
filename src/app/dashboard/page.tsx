import { getUser } from '@/lib/auth'
import { getUsageStats } from '@/lib/usage'
import UsageMeter from '@/components/UsageMeter'
import PlanBadge from '@/components/PlanBadge'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const stats = await getUsageStats(user.id)
  const plan = user.subscription?.plan || 'FREE'

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <PlanBadge plan={plan} />
        </div>

        <div className="space-y-6">
          <UsageMeter plan={plan} />

          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Account</h3>
            <p className="text-gray-400">Email: {user.email}</p>
            <p className="text-gray-400">Plan: {plan}</p>
          </div>

          {plan !== 'FREE' && (
            <form action="/api/stripe/portal" method="POST">
              <button type="submit" className="w-full py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition">
                Manage Subscription
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
