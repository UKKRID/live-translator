'use client'
import { useEffect, useState } from 'react'

export default function UsageMeter({ plan }: { plan: string }) {
  const [usage, setUsage] = useState<{ whisperHour: number; translateDay: number } | null>(null)

  useEffect(() => {
    fetch('/api/user/usage').then(r => r.json()).then(setUsage)
  }, [])

  if (!usage) return null

  const limits: Record<string, { whisper: number; translate: number }> = {
    FREE: { whisper: 30, translate: 100 },
    PRO: { whisper: 500, translate: -1 },
    ENTERPRISE: { whisper: -1, translate: -1 },
  }

  const limit = limits[plan] || limits.FREE

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Usage Today</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Whisper (ต่อชั่วโมง)</span>
            <span>{usage.whisperHour}/{limit.whisper === -1 ? '∞' : limit.whisper}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full">
            <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${limit.whisper === -1 ? 10 : (usage.whisperHour / limit.whisper) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Translation (ต่อวัน)</span>
            <span>{usage.translateDay}/{limit.translate === -1 ? '∞' : limit.translate}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full">
            <div className="h-2 bg-green-500 rounded-full" style={{ width: `${limit.translate === -1 ? 10 : (usage.translateDay / limit.translate) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}