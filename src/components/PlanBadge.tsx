export default function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    FREE: 'bg-gray-600',
    PRO: 'bg-blue-600',
    ENTERPRISE: 'bg-purple-600',
  }

  return (
    <span className={`${colors[plan] || colors.FREE} text-white text-xs font-bold px-2 py-1 rounded`}>
      {plan}
    </span>
  )
}
