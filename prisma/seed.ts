import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@coachify.com' },
    update: {},
    create: {
      email: 'admin@coachify.com',
      password: adminPassword,
      name: 'Admin',
      role: 'admin'
    }
  })

  // Create customer user
  const customerPassword = await bcrypt.hash('customer123', 10)
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      password: customerPassword,
      name: 'Test Customer',
      role: 'customer'
    }
  })

  // Create mentors
  const mentor1 = await prisma.mentor.upsert({
    where: { email: 'john@coach.com' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'john@coach.com',
      specialty: 'Career Coaching'
    }
  })

  const mentor2 = await prisma.mentor.upsert({
    where: { email: 'jane@coach.com' },
    update: {},
    create: {
      name: 'Jane Doe',
      email: 'jane@coach.com',
      specialty: 'Life Coaching'
    }
  })

  // Create packages
  await prisma.package.createMany({
    data: [
      {
        mentorId: mentor1.id,
        title: 'Basic Career Package',
        price: 100,
        duration: 4
      },
      {
        mentorId: mentor1.id,
        title: 'Premium Career Package',
        price: 250,
        duration: 12
      },
      {
        mentorId: mentor2.id,
        title: 'Life Coaching Starter',
        price: 150,
        duration: 6
      },
      {
        mentorId: mentor2.id,
        title: 'Life Coaching Pro',
        price: 300,
        duration: 16
      }
    ]
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })