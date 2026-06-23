import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getUsageStats } from '@/lib/usage'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getUsageStats(user.id)
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 })
  }
}