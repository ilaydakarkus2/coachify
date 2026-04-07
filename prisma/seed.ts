import { PrismaClient } from '@prisma/client';

// Prisma Client will automatically pick up DATABASE_URL from .env
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function main() {
  console.log('Starting seed...');

  // Clean up existing data
  await prisma.log.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.studentAssignment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.mentor.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned up existing data');

  // Create Users (Admin + Mentors) - Passwords are plain text as requested
  const users = await prisma.user.createMany({
    data: [
      { email: 'admin@coachify.com', password: 'admin123', name: 'Admin', role: 'admin' },
      { email: 'efe@coachify.com', password: 'efe123', name: 'Efe', role: 'mentor' },
      { email: 'ayse@coachify.com', password: 'ayse123', name: 'Ayşe', role: 'mentor' },
      { email: 'mehmet@coachify.com', password: 'mehmet123', name: 'Mehmet', role: 'mentor' },
      { email: 'zeynep@coachify.com', password: 'zeynep123', name: 'Zeynep', role: 'mentor' },
    ],
  });
  console.log(`Created ${users.count} users`);

  // Get mentor users
  const efeUser = await prisma.user.findUnique({ where: { email: 'efe@coachify.com' } });
  const ayseUser = await prisma.user.findUnique({ where: { email: 'ayse@coachify.com' } });
  const mehmetUser = await prisma.user.findUnique({ where: { email: 'mehmet@coachify.com' } });
  const zeynepUser = await prisma.user.findUnique({ where: { email: 'zeynep@coachify.com' } });

  // Create Mentors
  const mentors = await prisma.mentor.createMany({
    data: [
      { userId: efeUser!.id, name: 'Efe', email: 'efe@coachify.com', specialty: 'Matematik' },
      { userId: ayseUser!.id, name: 'Ayşe', email: 'ayse@coachify.com', specialty: 'Fizik' },
      { userId: mehmetUser!.id, name: 'Mehmet', email: 'mehmet@coachify.com', specialty: 'Kimya' },
      { userId: zeynepUser!.id, name: 'Zeynep', email: 'zeynep@coachify.com', specialty: 'Biyoloji' },
    ],
  });
  console.log(`Created ${mentors.count} mentors`);

  // Get mentors
  const efeMentor = await prisma.mentor.findFirst({ where: { email: 'efe@coachify.com' } });
  const ayseMentor = await prisma.mentor.findFirst({ where: { email: 'ayse@coachify.com' } });
  const mehmetMentor = await prisma.mentor.findFirst({ where: { email: 'mehmet@coachify.com' } });
  const zeynepMentor = await prisma.mentor.findFirst({ where: { email: 'zeynep@coachify.com' } });

  // Create Students
  const students = await prisma.student.createMany({
    data: [
      {
        name: 'Ahmet Yılmaz',
        email: 'ahmet.yilmaz@example.com',
        phone: '05551112233',
        school: 'Mehmet Akif Anadolu Lisesi',
        grade: '12',
        startDate: new Date('2025-02-02'),
        status: 'active',
        paymentStatus: 'paid',
        packageDuration: 4,
      },
      {
        name: 'Elif Kaya',
        email: 'elif.kaya@example.com',
        phone: '05551112244',
        school: 'Kabataş Lisesi',
        grade: '11',
        startDate: new Date('2025-02-05'),
        status: 'active',
        paymentStatus: 'paid',
        packageDuration: 4,
      },
      {
        name: 'Can Demir',
        email: 'can.demir@example.com',
        phone: '05551112255',
        school: 'Galatasaray Lisesi',
        grade: '12',
        startDate: new Date('2025-02-10'),
        status: 'active',
        paymentStatus: 'paid',
        packageDuration: 4,
      },
      {
        name: 'Selin Aktaş',
        email: 'selin.aktas@example.com',
        phone: '05551112266',
        school: 'BEŞİKTAŞ Lisesi',
        grade: '11',
        startDate: new Date('2025-03-01'),
        status: 'active',
        paymentStatus: 'paid',
        packageDuration: 4,
      },
      {
        name: 'Emre Türk',
        email: 'emre.turk@example.com',
        phone: '05551112277',
        school: 'Vefa Lisesi',
        grade: '12',
        startDate: new Date('2025-03-05'),
        status: 'active',
        paymentStatus: 'pending',
        packageDuration: 4,
      },
      {
        name: 'Zeynep Çelik',
        email: 'zeynep.celik@example.com',
        phone: '05551112288',
        school: 'Üsküdar Lisesi',
        grade: '11',
        startDate: new Date('2025-03-08'),
        endDate: new Date('2025-03-20'),
        status: 'dropped',
        paymentStatus: 'paid',
        packageDuration: 4,
      },
      {
        name: 'Onur Ayaz',
        email: 'onur.ayaz@example.com',
        phone: '05551112299',
        school: 'Kadıköy Lisesi',
        grade: '12',
        startDate: new Date('2025-03-12'),
        endDate: new Date('2025-03-18'),
        status: 'refunded',
        paymentStatus: 'refunded',
        packageDuration: 4,
      },
      {
        name: 'Burak Şahin',
        email: 'burak.sahin@example.com',
        phone: '05551112300',
        school: 'Atatürk Lisesi',
        grade: '11',
        startDate: new Date('2025-04-01'),
        status: 'active',
        paymentStatus: 'paid',
        packageDuration: 4,
      },
      {
        name: 'Sedef Yılmaz',
        email: 'sedef.yilmaz@example.com',
        phone: '05551112311',
        school: 'Kabataş Lisesi',
        grade: '12',
        startDate: new Date('2025-04-03'),
        status: 'active',
        paymentStatus: 'paid',
        packageDuration: 4,
      },
      {
        name: 'Yiğit Arslan',
        email: 'yigit.arslan@example.com',
        phone: '05551112322',
        school: 'Galatasaray Lisesi',
        grade: '11',
        startDate: new Date('2025-04-05'),
        status: 'active',
        paymentStatus: 'paid',
        packageDuration: 4,
      },
    ],
  });
  console.log(`Created ${students.count} students`);

  // Get students
  const allStudents = await prisma.student.findMany();

  // Create Student Assignments
  const assignments = await prisma.studentAssignment.createMany({
    data: [
      { studentId: allStudents[0].id, mentorId: efeMentor!.id, startDate: new Date('2025-02-02') },
      { studentId: allStudents[1].id, mentorId: ayseMentor!.id, startDate: new Date('2025-02-05') },
      { studentId: allStudents[2].id, mentorId: mehmetMentor!.id, startDate: new Date('2025-02-10') },
      { studentId: allStudents[3].id, mentorId: efeMentor!.id, startDate: new Date('2025-03-01') },
      { studentId: allStudents[4].id, mentorId: ayseMentor!.id, startDate: new Date('2025-03-05') },
      { studentId: allStudents[5].id, mentorId: mehmetMentor!.id, startDate: new Date('2025-03-08'), endDate: new Date('2025-03-20') },
      { studentId: allStudents[6].id, mentorId: efeMentor!.id, startDate: new Date('2025-03-12'), endDate: new Date('2025-03-18') },
      { studentId: allStudents[7].id, mentorId: ayseMentor!.id, startDate: new Date('2025-04-01') },
      { studentId: allStudents[8].id, mentorId: mehmetMentor!.id, startDate: new Date('2025-04-03') },
      { studentId: allStudents[9].id, mentorId: zeynepMentor!.id, startDate: new Date('2025-04-05') },
    ],
  });
  console.log(`Created ${assignments.count} student assignments`);

  // Create sample payments
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@coachify.com' } });
  await prisma.payment.createMany({
    data: [
      {
        studentId: allStudents[0].id,
        mentorId: efeMentor!.id,
        userId: adminUser!.id,
        amount: 1500,
        weeks: 4,
        status: 'paid',
        paymentDate: new Date('2025-03-15'),
      },
      {
        studentId: allStudents[1].id,
        mentorId: ayseMentor!.id,
        userId: adminUser!.id,
        amount: 1500,
        weeks: 4,
        status: 'paid',
        paymentDate: new Date('2025-03-15'),
      },
      {
        studentId: allStudents[6].id,
        mentorId: efeMentor!.id,
        userId: adminUser!.id,
        amount: 375,
        weeks: 1,
        status: 'paid',
        paymentDate: new Date('2025-04-01'),
      },
    ],
  });
  console.log('Created sample payments');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
