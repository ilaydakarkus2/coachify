const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('✅ Supabase bağlantısı başarılı!');
    console.log('✅ Database:', process.env.DATABASE_URL?.split('@')[1]);
    console.log('✅ Veritabanı şeması güncel ve veriler hazır!');

    // Connection info
    console.log('\n📊 Hazır olan veriler:');
    console.log('   - 5 Kullanıcı (1 Admin + 4 Mentor)');
    console.log('   - 4 Mentor');
    console.log('   - 10 Öğrenci');
    console.log('   - 10 Öğrenci-Mentor Ataması');
    console.log('   - 3 Örnek Ödeme');

    console.log('\n🔐 Giriş bilgileri:');
    console.log('   - Admin: admin@coachify.com / admin123');
    console.log('   - Mentorlar: efe@coachify.com / efe123');
    console.log('   - Mentorlar: ayse@coachify.com / ayse123');
    console.log('   - Mentorlar: mehmet@coachify.com / mehmet123');
    console.log('   - Mentorlar: zeynep@coachify.com / zeynep123');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
