/**
 * Helper script to check users in the database
 * Run with: node scripts/check-users.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Checking database users...\n')

  // Get all users
  const users = await prisma.user.findMany()

  console.log(`Total users: ${users.length}\n`)

  if (users.length === 0) {
    console.log('❌ No users found in the database!')
    console.log('You need to create at least one user first.')
    console.log('Try logging in through the login page to create a user,')
    console.log('or manually create one in the database.')
    return
  }

  users.forEach((user, index) => {
    console.log(`User ${index + 1}:`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Name: ${user.name}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Role: ${user.role}`)
    console.log('')
  })

  // Check for admin user
  const adminUsers = users.filter(u => u.role === 'admin')
  if (adminUsers.length > 0) {
    console.log(`✅ Found ${adminUsers.length} admin user(s)`)
    console.log(`   First admin ID: ${adminUsers[0].id}`)
  } else {
    console.log('⚠️  No admin users found')
    console.log('   Logging will use the first available user ID')
  }

  console.log('\n✅ Database check complete!')
}

main()
  .catch((e) => {
    console.error('Error checking database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
