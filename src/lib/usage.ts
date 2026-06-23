import { prisma } from './prisma'

const QUOTA = {
  FREE: { whisperPerHour: 30, translatePerDay: 100 },
  PRO: { whisperPerHour: 500, translatePerDay: -1 },
  ENTERPRISE: { whisperPerHour: -1, translatePerDay: -1 },
}

export async function checkQuota(userId: string, feature: 'whisper' | 'translate') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  })

  const plan = (user?.subscription?.plan || 'FREE') as keyof typeof QUOTA
  const quota = QUOTA[plan]

  if (feature === 'whisper') {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const count = await prisma.usageLog.count({
      where: { userId, feature: 'whisper', createdAt: { gte: oneHourAgo } },
    })
    if (quota.whisperPerHour === -1) return { allowed: true, remaining: -1 }
    return { allowed: count < quota.whisperPerHour, remaining: quota.whisperPerHour - count }
  }

  if (feature === 'translate') {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const count = await prisma.usageLog.count({
      where: { userId, feature: 'translate', createdAt: { gte: today } },
    })
    if (quota.translatePerDay === -1) return { allowed: true, remaining: -1 }
    return { allowed: count < quota.translatePerDay, remaining: quota.translatePerDay - count }
  }

  return { allowed: false, remaining: 0 }
}

export async function logUsage(userId: string, feature: string, tokens: number = 1) {
  return prisma.usageLog.create({
    data: { userId, feature, tokens },
  })
}

export async function getUsageStats(userId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const [whisperHour, translateDay, totalAll] = await Promise.all([
    prisma.usageLog.count({ where: { userId, feature: 'whisper', createdAt: { gte: oneHourAgo } } }),
    prisma.usageLog.count({ where: { userId, feature: 'translate', createdAt: { gte: today } } }),
    prisma.usageLog.count({ where: { userId } }),
  ])

  return { whisperHour, translateDay, totalAll }
}