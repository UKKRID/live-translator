import { NextRequest, NextResponse } from "next/server";
import { getUser } from '@/lib/auth';
import { checkQuota, logUsage } from '@/lib/usage';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quota = await checkQuota(user.id, 'whisper');
    if (!quota.allowed) {
      return NextResponse.json({ 
        error: 'Quota exceeded', 
        remaining: quota.remaining,
        upgradeUrl: '/pricing'
      }, { status: 429 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error: OPENAI_API_KEY not set" }, { status: 500 });
    }

    const formData = await req.formData();

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Whisper API error: ${res.status} ${errorText}` }, { status: res.status });
    }

    const data = await res.json();
    await logUsage(user.id, 'whisper');

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to transcribe' }, { status: 500 });
  }
}