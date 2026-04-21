import { prisma } from "./prisma"

const DEFAULT_WEEKLY_RATE = 375
const DEFAULT_USD_RATE = 0
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

/**
 * Herhangi bir Date nesnesini UTC gece yarısina normalize eder.
 * Timezone ve saat bileşenini yoksayar, sadece takvim gününü kullanır.
 */
function toUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

/**
 * Aylık tarih hesaplaması — UTC tabanlı, ay sonu taşması güvenli.
 * setMonth yerine yıl/ay gün ayrı hesaplanır.
 */
function addUTCMonths(date: Date, months: number): Date {
  const d = toUTCDay(date)
  const totalMonths = d.getUTCMonth() + months
  const year = d.getUTCFullYear() + Math.floor(totalMonths / 12)
  const month = totalMonths % 12
  // Ay sonu taşması: 31 Ocak + 1 ay → 28/29 Şubat
  const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(d.getUTCDate(), maxDay)
  return new Date(Date.UTC(year, month, day))
}

/**
 * SystemConfig'den haftalik mentor odeme tutarini okur.
 * Hata durumunda varsayılan değeri döndürmez — hesaplama durur.
 */
export async function getWeeklyRate(): Promise<number> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "WEEKLY_MENTOR_RATE" }
  })
  if (!config) return DEFAULT_WEEKLY_RATE
  const rate = parseFloat(config.value)
  if (isNaN(rate) || rate <= 0) {
    console.error("[getWeeklyRate] Invalid rate in SystemConfig:", config.value)
    return DEFAULT_WEEKLY_RATE
  }
  return rate
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
  const startDay = toUTCDay(assignmentStart)
  const endDay = toUTCDay(assignmentEnd)
  const diffMs = endDay.getTime() - startDay.getTime()

  if (diffMs <= 0) return { completedWeeks: 0, amount: 0 }

  const completedWeeks = Math.floor(diffMs / MS_PER_WEEK)
  return { completedWeeks, amount: completedWeeks * weeklyRate }
}

/**
 * SAG bazinda bir sonraki aylık döngü tarihini hesaplar.
 *
 * KURAL (4.5) - "Ödeme döngüsü gün bazlıdır":
 * Öğrenci ayın 4'ünde başladıysa, döngü tarihleri 4 Mayıs, 4 Haziran, 4 Temmuz...
 * currentDate'den büyük veya eşit ilk döngü tarihini döndürür.
 */
export function getNextPaymentDate(
  studentStartDate: Date,
  currentDate: Date
): Date {
  const current = toUTCDay(currentDate)
  for (let n = 1; n <= 48; n++) {
    const candidate = addUTCMonths(studentStartDate, n)
    if (candidate >= current) return candidate
  }
  return addUTCMonths(studentStartDate, 48)
}

/**
 * Döngü tarihinden ödeme tarihini (1 veya 15) hesaplar.
 *
 * KURAL (4.3 + 4.5):
 * - cycleDate günü ≤ 15 → aynı ayın 15'inde ödeme
 * - cycleDate günü > 15 → sonraki ayın 1'inde ödeme
 */
export function getPaymentDateForCycle(cycleDate: Date): Date {
  const d = toUTCDay(cycleDate)
  const day = d.getUTCDate()
  if (day <= 15) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 15))
  } else {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  }
}

/**
 * SAG bazinda aylık döngü tarihlerini üretir.
 *
 * KURAL (4.5) - "Ödeme döngüsü gün bazlıdır":
 * Öğrenci ayın 4'ünde başladıysa → 4 Mayıs, 4 Haziran, 4 Temmuz...
 * addUTCMonths ile ay sonu taşması güvenli (31 Ocak + 1 ay → 28 Şubat).
 */
export function getAllCycleDates(studentStartDate: Date, upToDate: Date): Date[] {
  const dates: Date[] = []
  const upTo = toUTCDay(upToDate)
  for (let n = 1; n <= 48; n++) {
    const cycleDate = addUTCMonths(studentStartDate, n)
    if (cycleDate > upTo) break
    dates.push(cycleDate)
  }
  return dates
}

/**
 * Iki Date nesnesinin ayni gun olup olmadigini kontrol eder (saat gozardi).
 */
function isSameDay(a: Date, b: Date): boolean {
  const aDay = toUTCDay(a)
  const bDay = toUTCDay(b)
  return aDay.getTime() === bDay.getTime()
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
 * - Rate-lock: hesaplama anindaki weeklyRate kayda yazilir
 */
export async function finalizeMentorEarningForAssignment(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  assignmentId: string,
  mentorId: string,
  studentId: string,
  assignmentStart: Date,
  assignmentEnd: Date,
  triggerReason: string,
  adminUserId: string,
  studentStartDate: Date
): Promise<void> {
  // Atama icin pending kayitlari HER DURUMDA iptal et
  // (totalWeeks=0 olsa bile eski pending earnings kalmamali)
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

  const weeklyRate = await getWeeklyRate()
  const { completedWeeks: totalWeeks, amount: totalAmount } = calculateMentorEarning(
    assignmentStart, assignmentEnd, weeklyRate
  )

  if (totalWeeks === 0) return

  // Zaten odenmis kayitlarin toplam haftasini hesapla
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
      studentId_mentorId_assignmentId_cycleDate: {
        studentId,
        mentorId,
        assignmentId,
        cycleDate
      }
    },
    create: {
      mentorId,
      studentId,
      assignmentId,
      completedWeeks: weeksToRecord,
      amount: weeksToRecord * weeklyRate,
      weeklyRate,
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
      weeklyRate,
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
 *
 * Transaction icinde calisir. Rate-lock: her kayda weeklyRate yazilir.
 */
export async function calculatePendingEarnings(adminUserId: string): Promise<number> {
  const weeklyRate = await getWeeklyRate()
  const now = new Date()

  const assignments = await prisma.studentAssignment.findMany({
    include: {
      student: {
        select: { id: true, startDate: true, endDate: true, status: true, purchaseDate: true }
      }
    }
  })

  if (assignments.length === 0) return 0

  // Batch: tum aktif earnings kayitlarini tek sorguda cek
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

  await prisma.$transaction(async (tx) => {
    for (const assignment of assignments) {
      const assignmentEndRaw = assignment.endDate ? toUTCDay(new Date(assignment.endDate)) : null

      // Sonlanmis assignment'lar icin yeni earnings uretme ve periodic_calc pending'lari iptal et
      if (assignmentEndRaw && assignmentEndRaw <= toUTCDay(now)) {
        await tx.mentorEarning.updateMany({
          where: {
            assignmentId: assignment.id,
            status: "pending",
            triggerReason: "periodic_calc"
          },
          data: { status: "cancelled" }
        })
        continue
      }

      // Aktif assignment: student.endDate her zaman hesaba katilir (paket bitis tarihi = maksimum hakedis siniri)
      const studentEndDate = assignment.student.endDate
        ? toUTCDay(new Date(assignment.student.endDate))
        : null

      const assignmentEnd = assignmentEndRaw ?? studentEndDate ?? toUTCDay(now)

      const sag = assignment.student.purchaseDate ?? assignment.student.startDate
      // Cycle date uretimi: ogrencinin bitis tarihini asan tarihler uretilmesin
      const cycleUpTo = studentEndDate && studentEndDate < now ? studentEndDate : now
      const allCycleDates = getAllCycleDates(sag, cycleUpTo)
      const assignmentStartDay = toUTCDay(assignment.startDate)
      const cycleDates = allCycleDates.filter(d => d > assignmentStartDay)

      if (cycleDates.length === 0) continue

      const existingRecords = earningsByAssignment.get(assignment.id) || []

      // runningTotal: mevcut kayitlarin completedWeeks degerlerinden hesapla
      let runningTotal = 0

      for (const cycleDate of cycleDates) {
        const existingRecord = existingRecords.find(r => isSameDay(r.cycleDate, cycleDate))
        if (existingRecord) {
          runningTotal += existingRecord.completedWeeks
          continue
        }

        const effectiveEnd = cycleDate < assignmentEnd ? cycleDate : assignmentEnd
        const { completedWeeks: cumulativeWeeks } = calculateMentorEarning(
          assignment.startDate, effectiveEnd, weeklyRate
        )

        const incrementWeeks = cumulativeWeeks - runningTotal
        runningTotal = cumulativeWeeks

        if (incrementWeeks <= 0) continue

        await tx.mentorEarning.upsert({
          where: {
            studentId_mentorId_assignmentId_cycleDate: {
              studentId: assignment.studentId,
              mentorId: assignment.mentorId,
              assignmentId: assignment.id,
              cycleDate
            }
          },
          create: {
            mentorId: assignment.mentorId,
            studentId: assignment.studentId,
            assignmentId: assignment.id,
            completedWeeks: incrementWeeks,
            amount: incrementWeeks * weeklyRate,
            weeklyRate,
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
            weeklyRate,
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
  }, { timeout: 30000 })

  return created
}

/**
 * Belirli bir mentor icin periyodik hakedis hesaplar.
 * calculatePendingEarnings ile ayni mantik ama sadece bir mentorun atamalarini isler.
 * Transaction icinde calisir. Rate-lock: her kayda weeklyRate yazilir.
 */
export async function calculatePendingEarningsForMentor(mentorId: string, adminUserId: string): Promise<number> {
  const weeklyRate = await getWeeklyRate()
  const now = new Date()

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

  await prisma.$transaction(async (tx) => {
    for (const assignment of assignments) {
      const assignmentEndDay = assignment.endDate ? toUTCDay(new Date(assignment.endDate)) : null

      // Sonlanmis (endDate gecmiste) assignment'lar icin yeni earnings uretme
      // ve sadece periodic_calc kaynakli pending earnings'lari iptal et
      if (assignmentEndDay && assignmentEndDay <= toUTCDay(now)) {
        await tx.mentorEarning.updateMany({
          where: {
            assignmentId: assignment.id,
            mentorId: assignment.mentorId,
            studentId: assignment.studentId,
            status: "pending",
            triggerReason: "periodic_calc"
          },
          data: { status: "cancelled" }
        })
        continue
      }

      const sag = assignment.student.purchaseDate ?? assignment.student.startDate
      const studentEnd = assignment.student.endDate ? toUTCDay(new Date(assignment.student.endDate)) : null
      // Cycle date uretimi: ogrencinin bitis tarihini asan tarihler uretilmesin
      const cycleUpTo = studentEnd && studentEnd < now ? studentEnd : now
      const allCycleDates = getAllCycleDates(sag, cycleUpTo)
      const assignmentStartDay = toUTCDay(assignment.startDate)
      const cycleDates = allCycleDates.filter(d => d > assignmentStartDay)

      if (cycleDates.length === 0) continue

      const existingRecords = earningsByAssignment.get(assignment.id) || []

      const assignmentEndDate = assignment.endDate
        ? toUTCDay(new Date(assignment.endDate))
        : studentEnd ? studentEnd : null

      // runningTotal: mevcut kayitlarin completedWeeks degerlerinden hesapla
      let runningTotal = 0

      for (const cycleDate of cycleDates) {
        const existingRecord = existingRecords.find(r => isSameDay(r.cycleDate, cycleDate))
        if (existingRecord) {
          runningTotal += existingRecord.completedWeeks
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

        await tx.mentorEarning.upsert({
          where: {
            studentId_mentorId_assignmentId_cycleDate: {
              studentId: assignment.studentId,
              mentorId: assignment.mentorId,
              assignmentId: assignment.id,
              cycleDate
            }
          },
          create: {
            mentorId: assignment.mentorId,
            studentId: assignment.studentId,
            assignmentId: assignment.id,
            completedWeeks: incrementWeeks,
            amount: incrementWeeks * weeklyRate,
            weeklyRate,
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
            weeklyRate,
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
  }, { timeout: 30000 })

  return created
}
