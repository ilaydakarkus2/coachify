/**
 * CSV Örnek Veri Import Script'i
 *
 * Kullanım: node scripts/import-csv.js
 *
 * CSV Kolonları:
 * 0: ID (Sheet sıra no)
 * 1: Öğrenci Adı
 * 2: Mentorunun Adı
 * 3: Sınıfı
 * 4: SAG (gün)
 * 5: ÜBG (gün)
 * 6: ÜB Ay (başlangıç ayı)
 * 7: BSÖ Ayı (bitiş ayı)
 * 8: Ödeme Durumu
 * 9: Bıraktığı Ay
 * 10: Durum
 * 11: Tel No
 * 12: Aranma Günü
 * 13: Aranma Ayı
 * 14: Mentor Değişimi
 * 15: İade Durumu
 * 16: Bırakma Nedeni
 * 17: Mevcut Net
 * 18: Hedef Net
 * 19: Özel Açıklama
 * 20: Veli Adı Soyadı
 * 21: Veli Telefon No
 * 22-45: 1.Ödeme - 24.Ödeme
 * 46: stripe_id
 * 47: Kime İletilsin?
 * 48: Satır No
 * 49: Mesaj Gidecek Mi?
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CSV_PATH = path.join('C:', 'Users', 'CAN PC', 'Downloads', 'Coachify 50 Örnek Öğrenci Datası - Sheet1.csv')

// CSV parser — handles quoted fields with commas
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const rows = []
  for (const line of lines) {
    const row = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    row.push(current.trim())
    rows.push(row)
  }
  return rows
}

// Ay numarasından tarih oluştur
function buildDate(day, monthNum, baseYear) {
  if (!day || !monthNum) return null
  const d = parseInt(day)
  const m = parseInt(monthNum)
  if (isNaN(d) || isNaN(m)) return null
  return new Date(baseYear, m - 1, d, 12, 0, 0)
}

// Mentor isminden email oluştur
function mentorEmail(name) {
  const cleaned = name.toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .split(' ')
    .filter(Boolean)
  return cleaned.join('.') + '@coachify.com'
}

async function main() {
  console.log('=== CSV Import Başlıyor ===\n')

  // CSV oku
  const csvText = fs.readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCSV(csvText)
  const header = rows[0]
  const dataRows = rows.slice(1)

  console.log(`CSV: ${dataRows.length} satır okundu\n`)

  // Tüm benzersiz mentor isimlerini topla
  const mentorNames = [...new Set(dataRows.map(r => r[2]).filter(Boolean))]
  console.log('CSV\'deki mentorlar:', mentorNames.join(', '), '\n')

  // 1. Mevcut test verilerini temizle
  console.log('1. Mevcut test verileri temizleniyor...')
  await prisma.mentorEarning.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.studentAssignment.deleteMany()
  await prisma.log.deleteMany()
  await prisma.student.deleteMany()
  // Test mentorlarını sil (admin hariç)
  await prisma.mentor.deleteMany()
  await prisma.user.deleteMany({ where: { role: 'mentor' } })
  console.log('   Temizlendi.\n')

  // 2. Admin user'ı kontrol et
  let adminUser = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: { email: 'admin@coachify.com', password: 'admin123', name: 'Admin', role: 'admin' }
    })
  }
  const adminId = adminUser.id

  // 3. Mentorları oluştur
  console.log('2. Mentorlar oluşturuluyor...')
  const mentorMap = {} // name -> { id, userId }
  for (const name of mentorNames) {
    const email = mentorEmail(name)
    const user = await prisma.user.create({
      data: { email, password: 'mentor123', name, role: 'mentor' }
    })
    const mentor = await prisma.mentor.create({
      data: { userId: user.id, name, email, specialty: 'Koçluk' }
    })
    mentorMap[name] = mentor
    console.log(`   + ${name} (${email})`)
  }
  console.log()

  // 4. Öğrencileri oluştur
  console.log('3. Öğrenciler import ediliyor...')
  let imported = 0
  let skipped = 0

  for (const row of dataRows) {
    const sheetId = row[0]
    const studentName = row[1]
    const mentorName = row[2]
    const grade = row[3] || ''
    const sagDay = row[4]
    const ubgDay = row[5]
    const ubMonth = row[6]
    const bsoMonth = row[7]
    const paymentStatusRaw = row[8]
    const droppedMonth = row[9]
    const statusRaw = row[10]
    const phone = row[11]
    const searchDay = row[12]
    const searchMonth = row[13]
    const mentorChangeNote = row[14]
    const refundStatusRaw = row[15]
    const dropReason = row[16]
    const currentNet = row[17]
    const targetNet = row[18]
    const specialNote = row[19]
    const parentName = row[20]
    const parentPhone = row[21]
    // Payment columns 22-45 (1-24) — we skip these
    const stripeId = row[46]
    const contactPreference = row[47]
    const sendMessageRaw = row[49]

    if (!studentName || !mentorName) {
      console.log(`   SKIP: ${sheetId} — eksik veri`)
      skipped++
      continue
    }

    const mentor = mentorMap[mentorName]
    if (!mentor) {
      console.log(`   SKIP: ${studentName} — mentor bulunamadı: ${mentorName}`)
      skipped++
      continue
    }

    // Durum mapping
    let status = 'active'
    let paymentStatus = 'pending'
    const statusLower = (statusRaw || '').toLowerCase()
    if (statusLower.includes('bırak') || statusLower.includes('birak')) {
      status = 'dropped'
    }
    if (paymentStatusRaw === 'Ödendi') {
      paymentStatus = 'paid'
    } else if (paymentStatusRaw === 'İade' || refundStatusRaw === 'İade') {
      paymentStatus = 'refunded'
      if (status === 'active') status = 'dropped'
    }

    // Tarih hesaplama
    // Aktif öğrenciler için 2026, bırakanlar için 2025
    const baseYear = status === 'active' ? 2026 : 2025
    const startDate = buildDate(ubgDay, ubMonth, baseYear)
    const endDate = buildDate(ubgDay, bsoMonth, bsoMonth < ubMonth ? baseYear + 1 : baseYear)
    const purchaseDate = buildDate(sagDay, ubMonth, baseYear)

    // Sadece bırakanların endDate'i olsun
    const finalEndDate = status === 'dropped' ? endDate : null

    // BSÖ "YKS'ye kadar" gibi özel değerler
    const monthBSO = bsoMonth && !isNaN(parseInt(bsoMonth)) ? bsoMonth : bsoMonth

    // Contact preference mapping
    let contactPref = null
    if (contactPreference) {
      if (contactPreference.includes('Veli')) contactPref = 'parent'
      else if (contactPreference.includes('Öğrenci')) contactPref = 'student'
      else contactPref = contactPreference
    }

    // sendMessage
    const sendMessage = sendMessageRaw === 'Evet'

    // Score'lar
    const currentNetScore = currentNet && !isNaN(parseInt(currentNet)) ? parseInt(currentNet) : null
    const targetNetScore = targetNet && !isNaN(parseInt(targetNet)) ? parseInt(targetNet) : null

    try {
      const student = await prisma.student.create({
        data: {
          name: studentName,
          email: `${sheetId}@coachify.local`,
          phone: phone || '',
          school: 'Belirtilmedi',
          grade: grade || '',
          startDate: startDate || new Date(baseYear, 0, 1),
          endDate: finalEndDate,
          status,
          paymentStatus,
          purchaseDate: purchaseDate || startDate || new Date(baseYear, 0, 1),
          membershipStartDate: startDate,
          packageDuration: 4,
          // Yeni alanlar
          parentName: parentName || null,
          parentPhone: parentPhone || null,
          currentNetScore,
          targetNetScore,
          specialNote: specialNote || null,
          dropReason: dropReason || null,
          refundStatus: refundStatusRaw === 'İade' ? 'İade' : null,
          mentorChangeNote: mentorChangeNote || null,
          droppedMonth: droppedMonth || null,
          searchDay: searchDay || null,
          searchMonth: searchMonth || null,
          contactPreference: contactPref,
          sendMessage,
          membershipType: 'new',
          discountCode: null,
          stripeId: stripeId && !stripeId.startsWith('35') && stripeId !== '-' ? stripeId : null,
          daySAG: sagDay ? parseInt(sagDay) : null,
          dayUBG: ubgDay ? parseInt(ubgDay) : null,
          monthUBG: ubMonth || null,
          monthBSO: monthBSO || null,
          sheetRowNumber: parseInt(sheetId) || null,
        }
      })

      // Atama oluştur
      await prisma.studentAssignment.create({
        data: {
          studentId: student.id,
          mentorId: mentor.id,
          startDate: startDate || new Date(baseYear, 0, 1),
          endDate: finalEndDate,
        }
      })

      imported++
      const statusLabel = status === 'active' ? '✓ Aktif' : status === 'dropped' ? '✗ Bıraktı' : status
      console.log(`   ${imported}. ${studentName} → ${mentorName} [${statusLabel}]`)
    } catch (err) {
      console.log(`   HATA: ${studentName} — ${err.message}`)
      skipped++
    }
  }

  console.log(`\n=== İmport Tamamlandı ===`)
  console.log(`Başarılı: ${imported}`)
  console.log(`Atlanan: ${skipped}`)
  console.log(`Toplam: ${dataRows.length}`)

  // Doğrulama
  const totalStudents = await prisma.student.count()
  const totalAssignments = await prisma.studentAssignment.count()
  const totalMentors = await prisma.mentor.count()
  const activeStudents = await prisma.student.count({ where: { status: 'active' } })
  const droppedStudents = await prisma.student.count({ where: { status: 'dropped' } })

  console.log(`\nVeritabanı Durumu:`)
  console.log(`  Mentorlar: ${totalMentors}`)
  console.log(`  Öğrenciler: ${totalStudents} (${activeStudents} aktif, ${droppedStudents} bırakan)`)
  console.log(`  Atamalar: ${totalAssignments}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Import hatası:', err)
  process.exit(1)
})
