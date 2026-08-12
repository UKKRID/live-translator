import { prisma } from './prisma'

export async function getUser() {
  if (!prisma) return null
  
  try {
    let user = await prisma.user.findFirst({
      include: { subscription: true }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@livetranslator.app',
          name: 'Demo User',
        },
        include: { subscription: true }
      })
    }
    
    return user
  } catch {
    return null
  }
}
