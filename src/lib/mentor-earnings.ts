import { prisma } from "./prisma"

const DEFAULT_WEEKLY_RATE = 375
const DEFAULT_USD_RATE = 0
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
 * SystemConfig'den USD kuru okur. 0 = kur ayarlanmamıs (gösterme)
 */
export async function getUsdRate(): Promise<number> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "USD_EXCHANGE_RATE" }
    })
    return config ? parseFloat(config.value) : DEFAULT_USD_RATE
  } catch {
    return DEFAULT_USD_RATE
  }
}

/**
 * Iki tarih arasindaki tamamlanan hafta sayisini ve hakedis tutarini hesaplar.
 * Sadece TAM 7 gunluk periyotlar sayilir. Kismi haftalar = 0 TL.
 */
export function calculateMentorEarning(
  assignmentStart: Date,
  assignmentEnd: Date,
  weeklyRate: number = DEFAULT_WEEKLY_RATE
): { completedWeeks: number; amount: number } {
  // Saat ve timezone bileşenini yoksay — UTC gün bazlı hesaplama
  const startDay = new Date(Date.UTC(assignmentStart.getUTCFullYear(), assignmentStart.getUTCMonth(), assignmentStart.getUTCDate()))
  const endDay = new Date(Date.UTC(assignmentEnd.getUTCFullYear(), assignmentEnd.getUTCMonth(), assignmentEnd.getUTCDate()))
  const diffMs = endDay.getTime() - startDay.getTime()

  if (diffMs <= 0) return { completedWeeks: 0, amount: 0 }

  const completedWeeks = Math.floor(diffMs / MS_PER_WEEK)
  return { completedWeeks, amount: completedWeeks * weeklyRate }
}

/**
 * UBG'ye gore bir sonraki odeme tarihini hesaplar.
 *
 * KURAL (4.4) - "Takip eden donem":
 * - UBG 1-15 arasi → bir sonraki ayin 15'inde odeme
 * - UBG 16+ → iki ay sonrasinin 1'inde odeme
 *
 * Ornekler:
 * - 2 Subat baslangic → 15 Mart
 * - 16 Subat baslangic → 1 Nisan
 * - 1 Subat baslangic → 15 Mart
 * - 15 Subat baslangic → 15 Mart
 */
export function getNextPaymentDate(
  studentStartDate: Date,
  currentDate: Date
): Date {
  const ubgDay = studentStartDate.getDate()
  const isFirstHalf = ubgDay <= 15

  let year = studentStartDate.getFullYear()
  let month = studentStartDate.getMonth() // 0-indexed

  if (isFirstHalf) {
    // "Takip eden donem" = bir sonraki ayin 15'i
    month += 1
    if (month > 11) { month = 0; year += 1 }
  } else {
    // "Takip eden donem" = iki ay sonrasinin 1'i
    month += 2
    if (month > 11) { month -= 12; year += 1 }
  }

  // Yarim-aylik adimlarla ilerle, currentDate'den buyuk/esit ilk tarihi bul
  for (let i = 0; i < 200; i++) {
    const day = isFirstHalf
      ? (i % 2 === 0 ? 15 : 1)
      : (i % 2 === 0 ? 1 : 15)

    const candidate = new Date(year, month, day)

    if (candidate >= currentDate) return candidate

    if (i % 2 === 1) {
      month += 1
      if (month > 11) { month = 0; year += 1 }
    }
  }

  return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, isFirstHalf ? 15 : 1)
}

/**
 * UBG'den itibaren tum odeme donem tarihlerini uretir.
 * "Takip eden donem" kuralina gore baslar (4.4).
 *
 * UBG 1-15: ilk tarih = bir sonraki ayin 15'i, sonra 1'i, sonra 15'i...
 * UBG 16+:  ilk tarih = iki ay sonrasinin 1'i, sonra 15'i, sonra 1'i...
 */
export function getAllCycleDates(studentStartDate: Date, upToDate: Date): Date[] {
  const dates: Date[] = []
  const ubgDay = studentStartDate.getDate()
  const isFirstHalf = ubgDay <= 15

  let year = studentStartDate.getFullYear()
  let month = studentStartDate.getMonth()

  if (isFirstHalf) {
    month += 1
    if (month > 11) { month = 0; year += 1 }
  } else {
    month += 2
    if (month > 11) { month -= 12; year += 1 }
  }

  for (let i = 0; i < 200; i++) {
    const day = isFirstHalf
      ? (i % 2 === 0 ? 15 : 1)
      : (i % 2 === 0 ? 1 : 15)

    const cycleDate = new Date(year, month, day)
    if (cycleDate > upToDate) break
    dates.push(cycleDate)

    if (i % 2 === 1) {
      month += 1
      if (month > 11) { month = 0; year += 1 }
    }
  }

  return dates
}

/**
 * Iki Date nesnesinin ayni gun olup olmadigini kontrol eder (saat gozardi).
 */
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/**
 * Bir atama icin hakedisi sonlandirir (mentor degisimi, birakma, iade).
 *
 * Kurallar (4.6, 4.7):
 * - Tamamlanan hafta kadar odeme yapilir
 * - Tamamlanmamis hafta icin odeme yok
 *
 * Mantik:
 * - Atama sonlandiginda, o atama icin pending olan tum kayitlar iptal edilir
 * - Yerine tek bir kesin hakedis kaydi olusturulur (tam toplam hafta)
 * - Zaten odenmis kayitlar dokunulmaz (4.8 duplicate koruma)
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
  const { completedWeeks: totalWeeks, amount: totalAmount } = calculateMentorEarning(
    assignmentStart, assignmentEnd, weeklyRate
  )

  if (totalWeeks === 0) return

  // Atama icin pending kayitlari iptal et ("Hesapla" ile olusturulmus tahminler)
  // Odenmis kayitlara dokunmuyoruz (4.8 kurali)
  await tx.mentorEarning.updateMany({
    where: {
      assignmentId,
      mentorId,
      studentId,
      status: "pending"
    },
    data: {
      status: "cancelled"
    }
  })

  // Simdi zaten odenmis kayitlarin toplam haftasini hesapla
  const paidEarnings = await tx.mentorEarning.findMany({
    where: {
      assignmentId,
      mentorId,
      studentId,
      status: "paid"
    }
  })
  const alreadyPaidWeeks = paidEarnings.reduce((sum: number, e: any) => sum + e.completedWeeks, 0)
  const weeksToRecord = totalWeeks - alreadyPaidWeeks

  if (weeksToRecord <= 0) return

  const cycleDate = getNextPaymentDate(studentStartDate, assignmentEnd)

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
      completedWeeks: weeksToRecord,
      amount: weeksToRecord * weeklyRate,
      cycleDate,
      status: "pending",
      triggerReason,
      assignmentStart,
      assignmentEnd,
      createdBy: adminUserId
    },
    update: {
      completedWeeks: weeksToRecord,
      amount: weeksToRecord * weeklyRate,
      assignmentEnd,
      triggerReason
    }
  })
}

/**
 * Tum atamalari tarar ve periyodik hakedis kayitlari olusturur.
 *
 * KURAL (4.5): Her odeme donemi (1 veya 15) icin, o doneme kadar
 * tamamlanan yeni haftalarin hakedisini olusturur.
 *
 * Increment mantigi:
 * - Her cycle date icin kumulatif toplam hafta hesaplanir
 * - Onceki donemlerden kalan kumulatif cikarilir
 * - Fark = bu donemin yeni hafta sayisi
 * - Sadece fark > 0 ise kayit olusturulur
 */
export async function calculatePendingEarnings(adminUserId: string): Promise<number> {
  const weeklyRate = await getWeeklyRate()
  const now = new Date()

  const assignments = await prisma.studentAssignment.findMany({
    include: {
      student: {
        select: { id: true, startDate: true, status: true, purchaseDate: true }
      }
    }
  })

  if (assignments.length === 0) return 0

  // Batch: tum aktif earnings kayitlarini tek sorguda cek (N+1 onleme)
  const assignmentIds = assignments.map(a => a.id)
  const allExistingEarnings = await prisma.mentorEarning.findMany({
    where: {
      assignmentId: { in: assignmentIds },
      status: { not: "cancelled" }
    },
    orderBy: { cycleDate: "asc" }
  })

  // Assignment ID'ye gore grupla
  const earningsByAssignment = new Map<string, typeof allExistingEarnings>()
  for (const e of allExistingEarnings) {
    if (!earningsByAssignment.has(e.assignmentId)) {
      earningsByAssignment.set(e.assignmentId, [])
    }
    earningsByAssignment.get(e.assignmentId)!.push(e)
  }

  let created = 0

  for (const assignment of assignments) {
    const assignmentEnd = assignment.endDate ?? now

    const sag = assignment.student.purchaseDate ?? assignment.student.startDate
    const allCycleDates = getAllCycleDates(sag, now)
    const cycleDates = allCycleDates.filter(d => d > assignment.startDate)

    if (cycleDates.length === 0) continue

    const existingRecords = earningsByAssignment.get(assignment.id) || []

    let runningTotal = 0

    for (const cycleDate of cycleDates) {
      const exists = existingRecords.some(r => isSameDay(r.cycleDate, cycleDate))
      if (exists) {
        const effectiveEnd = cycleDate < assignmentEnd ? cycleDate : assignmentEnd
        const { completedWeeks: cumulative } = calculateMentorEarning(
          assignment.startDate, effectiveEnd, weeklyRate
        )
        runningTotal = cumulative
        continue
      }

      const effectiveEnd = cycleDate < assignmentEnd ? cycleDate : assignmentEnd
      const { completedWeeks: cumulativeWeeks } = calculateMentorEarning(
        assignment.startDate, effectiveEnd, weeklyRate
      )

      const incrementWeeks = cumulativeWeeks - runningTotal
      runningTotal = cumulativeWeeks

      if (incrementWeeks <= 0) continue

      await prisma.mentorEarning.upsert({
        where: {
          studentId_mentorId_cycleDate: {
            studentId: assignment.studentId,
            mentorId: assignment.mentorId,
            cycleDate
          }
        },
        create: {
          mentorId: assignment.mentorId,
          studentId: assignment.studentId,
          assignmentId: assignment.id,
          completedWeeks: incrementWeeks,
          amount: incrementWeeks * weeklyRate,
          cycleDate,
          status: "pending",
          triggerReason: "periodic_calc",
          assignmentStart: assignment.startDate,
          assignmentEnd: effectiveEnd,
          createdBy: adminUserId
        },
        update: {
          assignmentId: assignment.id,
          completedWeeks: incrementWeeks,
          amount: incrementWeeks * weeklyRate,
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

  return created
}

/**
 * Belirli bir mentor icin periyodik hakedis hesaplar.
 * calculatePendingEarnings ile ayni mantik ama sadece bir mentorun atamalarini isler.
 * Mentor panelini actiginda otomatik hesaplama icin kullanilir.
 */
export async function calculatePendingEarningsForMentor(mentorId: string, adminUserId: string): Promise<number> {
  const weeklyRate = await getWeeklyRate()
  const now = new Date()
  const futureDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())

  const assignments = await prisma.studentAssignment.findMany({
    where: { mentorId },
    include: {
      student: {
        select: { id: true, name: true, startDate: true, endDate: true, status: true, purchaseDate: true }
      }
    }
  })

  if (assignments.length === 0) return 0

  // Batch: tum earnings tek sorguda
  const assignmentIds = assignments.map(a => a.id)
  const allExistingEarnings = await prisma.mentorEarning.findMany({
    where: {
      assignmentId: { in: assignmentIds },
      status: { not: "cancelled" }
    },
    orderBy: { cycleDate: "asc" }
  })

  const earningsByAssignment = new Map<string, typeof allExistingEarnings>()
  for (const e of allExistingEarnings) {
    if (!earningsByAssignment.has(e.assignmentId)) {
      earningsByAssignment.set(e.assignmentId, [])
    }
    earningsByAssignment.get(e.assignmentId)!.push(e)
  }

  let created = 0

  for (const assignment of assignments) {
    const sag = assignment.student.purchaseDate ?? assignment.student.startDate
    const studentEnd = assignment.student.endDate ? new Date(assignment.student.endDate) : null
    const allCycleDates = getAllCycleDates(sag, futureDate)
    const cycleDates = allCycleDates.filter(d => d > assignment.startDate)

    if (cycleDates.length === 0) continue

    const existingRecords = earningsByAssignment.get(assignment.id) || []

    const assignmentEndDate = assignment.endDate
      ? new Date(assignment.endDate)
      : studentEnd

    let runningTotal = 0

    for (const cycleDate of cycleDates) {
      const exists = existingRecords.some(r => isSameDay(r.cycleDate, cycleDate))
      if (exists) {
        const effectiveEnd = assignmentEndDate
          ? (cycleDate < assignmentEndDate ? cycleDate : assignmentEndDate)
          : cycleDate
        const { completedWeeks: cumulative } = calculateMentorEarning(
          assignment.startDate, effectiveEnd, weeklyRate
        )
        runningTotal = cumulative
        continue
      }

      const effectiveEnd = assignmentEndDate
        ? (cycleDate < assignmentEndDate ? cycleDate : assignmentEndDate)
        : cycleDate

      const { completedWeeks: cumulativeWeeks } = calculateMentorEarning(
        assignment.startDate, effectiveEnd, weeklyRate
      )

      const incrementWeeks = cumulativeWeeks - runningTotal
      runningTotal = cumulativeWeeks

      if (incrementWeeks <= 0) continue

      await prisma.mentorEarning.upsert({
        where: {
          studentId_mentorId_cycleDate: {
            studentId: assignment.studentId,
            mentorId: assignment.mentorId,
            cycleDate
          }
        },
        create: {
          mentorId: assignment.mentorId,
          studentId: assignment.studentId,
          assignmentId: assignment.id,
          completedWeeks: incrementWeeks,
          amount: incrementWeeks * weeklyRate,
          cycleDate,
          status: "pending",
          triggerReason: "periodic_calc",
          assignmentStart: assignment.startDate,
          assignmentEnd: effectiveEnd,
          createdBy: adminUserId
        },
        update: {
          assignmentId: assignment.id,
          completedWeeks: incrementWeeks,
          amount: incrementWeeks * weeklyRate,
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

  return created
}
