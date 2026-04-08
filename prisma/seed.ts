import { PrismaClient } from '@prisma/client';

// Prisma Client will automatically pick up DATABASE_URL from .env
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function main() {
  console.log('Starting seed...');

  // Clean up existing data
  await prisma.log.deleteMany();
  await prisma.mentorEarning.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.studentAssignment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.systemConfig.deleteMany();
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

  // Create SystemConfig
  await prisma.systemConfig.create({
    data: {
      key: 'WEEKLY_MENTOR_RATE',
      value: '375',
      notes: 'Haftalık mentor ödeme tutarı (TL)',
    },
  });
  console.log('Created SystemConfig: WEEKLY_MENTOR_RATE = 375');

  // Create sample MentorEarning records
  const allAssignments = await prisma.studentAssignment.findMany();
  await prisma.mentorEarning.createMany({
    data: [
      // Ahmet (student[0]) - Efe ile 2025-02-02'den beri. UBG=2 (1-15 arasi)
      // Yeni kural: "takip eden donem" = bir sonraki ayin 15'i
      // Donem 1 (15 Mart): 2 Subat - 15 Mart = 41 gun = 5 tam hafta = 1875 TL
      {
        mentorId: efeMentor!.id,
        studentId: allStudents[0].id,
        assignmentId: allAssignments[0].id,
        completedWeeks: 5,
        amount: 1875,
        cycleDate: new Date('2025-03-15'),
        status: 'paid',
        triggerReason: 'periodic_calc',
        assignmentStart: new Date('2025-02-02'),
        assignmentEnd: new Date('2025-03-15'),
        createdBy: adminUser!.id,
      },
      // Donem 2 (1 Nisan): 2 Subat - 1 Nisan = 58 gun = 8 tam hafta. Increment: 8-5=3 hafta = 1125 TL
      {
        mentorId: efeMentor!.id,
        studentId: allStudents[0].id,
        assignmentId: allAssignments[0].id,
        completedWeeks: 3,
        amount: 1125,
        cycleDate: new Date('2025-04-01'),
        status: 'pending',
        triggerReason: 'periodic_calc',
        assignmentStart: new Date('2025-02-02'),
        assignmentEnd: new Date('2025-04-01'),
        createdBy: adminUser!.id,
      },
      // Elif (student[1]) - Ayse ile 2025-02-05'ten beri. UBG=5 (1-15 arasi)
      // Donem 1 (15 Mart): 5 Subat - 15 Mart = 38 gun = 5 tam hafta = 1875 TL
      {
        mentorId: ayseMentor!.id,
        studentId: allStudents[1].id,
        assignmentId: allAssignments[1].id,
        completedWeeks: 5,
        amount: 1875,
        cycleDate: new Date('2025-03-15'),
        status: 'pending',
        triggerReason: 'periodic_calc',
        assignmentStart: new Date('2025-02-05'),
        assignmentEnd: new Date('2025-03-15'),
        createdBy: adminUser!.id,
      },
      // Zeynep C. (student[5]) - Mehmet ile 8-20 Mart arasi = 12 gun = 1 tam hafta = 375 TL
      // UBG=8 (1-15 arasi) => "takip eden donem" 15 Nisan, ama bırakma olduğu için getNextPaymentDate(8 Mart, 20 Mart) = 15 Nisan
      {
        mentorId: mehmetMentor!.id,
        studentId: allStudents[5].id,
        assignmentId: allAssignments[5].id,
        completedWeeks: 1,
        amount: 375,
        cycleDate: new Date('2025-04-15'),
        status: 'paid',
        triggerReason: 'student_drop',
        assignmentStart: new Date('2025-03-08'),
        assignmentEnd: new Date('2025-03-20'),
        createdBy: adminUser!.id,
      },
    ],
  });
  console.log('Created sample MentorEarning records');

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
