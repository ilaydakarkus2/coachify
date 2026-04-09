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
 */
export function calculateMentorEarning(
  assignmentStart: Date,
  assignmentEnd: Date,
  weeklyRate: number = DEFAULT_WEEKLY_RATE
): { completedWeeks: number; amount: number } {
  const diffMs = assignmentEnd.getTime() - assignmentStart.getTime()

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

  let created = 0

  for (const assignment of assignments) {
    const assignmentEnd = assignment.endDate ?? now

    // Bu ogrencinin tum donem tarihlerini al (SAG=purchaseDate, fallback=startDate)
    const sag = assignment.student.purchaseDate ?? assignment.student.startDate
    const allCycleDates = getAllCycleDates(sag, now)

    // Bu atamanin baslangicindan sonraki donemleri filtrele
    const cycleDates = allCycleDates.filter(d => d > assignment.startDate)

    if (cycleDates.length === 0) continue

    // Bu atama icin zaten var olan kayitlari al
    const existingRecords = await prisma.mentorEarning.findMany({
      where: {
        assignmentId: assignment.id,
        status: { not: "cancelled" }
      },
      orderBy: { cycleDate: "asc" }
    })

    // Kumulatif takip: her cycle date icin kumulatif toplam hafta
    let runningTotal = 0

    for (const cycleDate of cycleDates) {
      // Bu donem zaten var mi kontrol et
      const exists = existingRecords.some(r => isSameDay(r.cycleDate, cycleDate))
      if (exists) {
        // Var olan kaydin kumulatif katkisini hesapla
        const effectiveEnd = cycleDate < assignmentEnd ? cycleDate : assignmentEnd
        const { completedWeeks: cumulative } = calculateMentorEarning(
          assignment.startDate, effectiveEnd, weeklyRate
        )
        runningTotal = cumulative
        continue
      }

      // Bu cycle date'e kadar kumulatif tamamlanan hafta
      const effectiveEnd = cycleDate < assignmentEnd ? cycleDate : assignmentEnd
      const { completedWeeks: cumulativeWeeks } = calculateMentorEarning(
        assignment.startDate, effectiveEnd, weeklyRate
      )

      // Increment = bu donemin yeni haftasi
      const incrementWeeks = cumulativeWeeks - runningTotal
      runningTotal = cumulativeWeeks

      if (incrementWeeks <= 0) continue

      await prisma.mentorEarning.create({
        data: {
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
        }
      })
      created++
    }
  }

  return created
}
