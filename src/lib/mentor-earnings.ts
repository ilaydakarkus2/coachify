import { prisma } from "./prisma"

const DEFAULT_WEEKLY_RATE = 375
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

/**
 * SystemConfig'den haftalik mentor odeme tutarini okur
 */
export async function getWeeklyRate(): Promise<number> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "WEEKLY_MENTOR_RATE" }
    })
    return config ? parseFloat(config.value) : DEFAULT_WEEKLY_RATE
  } catch {
    return DEFAULT_WEEKLY_RATE
  }
}

/**
 * Iki tarih arasindaki tamamlanan hafta sayisini ve hakedis tutarini hesaplar.
 * Sadece TAM 7 gunluk periyotlar sayilir. Kismi haftalar = 0 TL.
 *
 * Ornek: 6 gun = 0 hafta (0 TL), 7 gun = 1 hafta (375 TL),
 *        13 gun = 1 hafta (375 TL), 14 gun = 2 hafta (750 TL)
 */
export function calculateMentorEarning(
  assignmentStart: Date,
  assignmentEnd: Date,
  weeklyRate: number = DEFAULT_WEEKLY_RATE
): { completedWeeks: number; amount: number } {
  const diffMs = assignmentEnd.getTime() - assignmentStart.getTime()

  if (diffMs <= 0) {
    return { completedWeeks: 0, amount: 0 }
  }

  const completedWeeks = Math.floor(diffMs / MS_PER_WEEK)
  const amount = completedWeeks * weeklyRate

  return { completedWeeks, amount }
}

/**
 * Ogrencinin UBG'sine (Uyelik Baslama Gunu) gore bir sonraki odeme tarihini hesaplar.
 *
 * Kural:
 * - UBG gunu 1-15 arasindaysa: odeme donemlerin 15'inde
 * - UBG gunu 16-31 arasindaysa: odeme donemlerin 1'inde
 *
 * Donemler takvim ayina gore degil, ogrencinin kendi baslangic gunune gore ilerler.
 */
export function getNextPaymentDate(
  studentStartDate: Date,
  currentDate: Date
): Date {
  const ubgDay = studentStartDate.getDate()
  const isFirstHalf = ubgDay <= 15

  // Baslangic noktasini belirle
  let year = studentStartDate.getFullYear()
  let month = studentStartDate.getMonth() // 0-indexed

  if (isFirstHalf) {
    // Ilk donem: baslangic ayinin 15'i
  } else {
    // Ilk donem: bir sonraki ayin 1'i
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  // Yarim-aylik adimlarla ilerle, currentDate'den buyuk/esit ilk tarihi bul
  for (let i = 0; i < 200; i++) {
    const day = isFirstHalf
      ? (i % 2 === 0 ? 15 : 1)
      : (i % 2 === 0 ? 1 : 15)

    const candidate = new Date(year, month, day)

    if (candidate >= currentDate) {
      return candidate
    }

    // Her 2 adimda bir ay ilerlet
    if (i % 2 === 1) {
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
    }
  }

  // Fallback (normale ulasilmaz)
  return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, isFirstHalf ? 15 : 1)
}

/**
 * Ogrencinin baslangicindan itibaren belirli bir tarihe kadar tum donem tarihlerini uretir.
 */
export function getAllCycleDates(studentStartDate: Date, upToDate: Date): Date[] {
  const dates: Date[] = []
  const ubgDay = studentStartDate.getDate()
  const isFirstHalf = ubgDay <= 15

  let year: number
  let month: number

  if (isFirstHalf) {
    year = studentStartDate.getFullYear()
    month = studentStartDate.getMonth()
  } else {
    const next = new Date(studentStartDate.getFullYear(), studentStartDate.getMonth() + 1, 1)
    year = next.getFullYear()
    month = next.getMonth()
  }

  for (let i = 0; i < 200; i++) {
    const day = isFirstHalf
      ? (i % 2 === 0 ? 15 : 1)
      : (i % 2 === 0 ? 1 : 15)

    const cycleDate = new Date(year, month, day)

    if (cycleDate > upToDate) break

    // Baslangic tarihinden sonraki donemleri dahil et
    if (cycleDate > studentStartDate) {
      dates.push(cycleDate)
    }

    if (i % 2 === 1) {
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
    }
  }

  return dates
}

/**
 * Bir atama icin hakedisi sonlandirir (upsert).
 * Mentor degisimi, ogrenci birakma veya iade senaryolarinda kullanilir.
 *
 * Unique constraint (studentId, mentorId, cycleDate) sayesinde mukerrer odeme onlenir.
 */
export async function finalizeMentorEarningForAssignment(
  tx: any,
  assignmentId: string,
  mentorId: string,
  studentId: string,
  assignmentStart: Date,
  assignmentEnd: Date,
  triggerReason: string,
  adminUserId: string,
  studentStartDate: Date
): Promise<void> {
  const weeklyRate = await getWeeklyRate()
  const { completedWeeks, amount } = calculateMentorEarning(assignmentStart, assignmentEnd, weeklyRate)

  if (completedWeeks === 0) return

  // Sonlandirma icin cycle date: ogrencinin UBG'sine gore bir sonraki odeme tarihi
  const cycleDate = getNextPaymentDate(studentStartDate, assignmentEnd)

  // Upsert ile mukerrer korumasi
  await tx.mentorEarning.upsert({
    where: {
      studentId_mentorId_cycleDate: {
        studentId,
        mentorId,
        cycleDate
      }
    },
    create: {
      mentorId,
      studentId,
      assignmentId,
      completedWeeks,
      amount,
      cycleDate,
      status: "pending",
      triggerReason,
      assignmentStart,
      assignmentEnd,
      createdBy: adminUserId
    },
    update: {
      completedWeeks,
      amount,
      assignmentEnd,
      triggerReason
    }
  })
}

/**
 * Tum atamalari tarar ve eksik MentorEarning kayitlarini olusturur.
 * Toplu hesaplama senaryosunda (Admin "Hesapla" butonuna bastiginda) kullanilir.
 */
export async function calculatePendingEarnings(adminUserId: string): Promise<number> {
  const weeklyRate = await getWeeklyRate()
  const now = new Date()

  const assignments = await prisma.studentAssignment.findMany({
    include: {
      student: {
        select: { id: true, startDate: true, status: true }
      }
    }
  })

  let created = 0

  for (const assignment of assignments) {
    const assignmentEnd = assignment.endDate ?? now
    const { completedWeeks } = calculateMentorEarning(assignment.startDate, assignmentEnd, weeklyRate)

    if (completedWeeks === 0) continue

    const cycleDates = getAllCycleDates(assignment.student.startDate, now)

    for (const cycleDate of cycleDates) {
      const effectiveEnd = cycleDate < assignmentEnd ? cycleDate : assignmentEnd
      const { completedWeeks: weeksByCycle } = calculateMentorEarning(
        assignment.startDate,
        effectiveEnd,
        weeklyRate
      )

      if (weeksByCycle === 0) continue

      // Mukerrer kontrol
      const existing = await prisma.mentorEarning.findFirst({
        where: {
          studentId: assignment.studentId,
          mentorId: assignment.mentorId,
          cycleDate
        }
      })

      if (!existing) {
        await prisma.mentorEarning.create({
          data: {
            mentorId: assignment.mentorId,
            studentId: assignment.studentId,
            assignmentId: assignment.id,
            completedWeeks: weeksByCycle,
            amount: weeksByCycle * weeklyRate,
            cycleDate,
            status: "pending",
            triggerReason: "periodic_calc",
            assignmentStart: assignment.startDate,
            assignmentEnd: effectiveEnd,
            createdBy: adminUserId
          }
        })
        created++
      }
    }
  }

  return created
}
