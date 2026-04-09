import { google } from "googleapis"

/**
 * Google Sheets API v4 servisi.
 * Service account ile authenticate olur.
 * Sheets sync fire-and-forget seklinde calisir, HTTP response'u etkilemez.
 *
 * Kolon haritası (A-W):
 * A: name, B: email, C: phone, D: school, E: grade
 * F: startDate, G: packageDuration, H: mentor, I: status
 * J: membershipStartDate, K: Last Updated
 * L: parentName, M: parentPhone, N: currentNetScore, O: targetNetScore
 * P: specialNote, Q: dropReason, R: refundStatus
 * S: membershipType, T: discountCode, U: stripeId
 * V: contactPreference, W: sendMessage
 */

interface StudentRow {
  name: string
  email: string
  phone: string
  school: string
  grade: string
  startDate: string
  packageDuration: number
  mentor: string
  status: string
  membershipStartDate: string
  parentName?: string
  parentPhone?: string
  currentNetScore?: number | null
  targetNetScore?: number | null
  specialNote?: string
  dropReason?: string
  refundStatus?: string
  membershipType?: string
  discountCode?: string
  stripeId?: string
  contactPreference?: string
  sendMessage?: boolean
}

let sheetsAuth: any = null

function getAuth() {
  if (sheetsAuth) return sheetsAuth

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!email || !key) {
    throw new Error("Google Sheets credentials not configured")
  }

  sheetsAuth = new google.auth.JWT(
    email,
    undefined,
    key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  )

  return sheetsAuth
}

export function isSheetsEnabled(): boolean {
  return (
    process.env.GOOGLE_SHEETS_ENABLED === "true" &&
    !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    !!process.env.GOOGLE_PRIVATE_KEY &&
    !!process.env.GOOGLE_SHEETS_ID
  )
}

function getSheetId(): string {
  return process.env.GOOGLE_SHEETS_ID!
}

function toRowValues(row: StudentRow): string[] {
  return [
    row.name,                                      // A
    row.email,                                     // B
    row.phone,                                     // C
    row.school,                                    // D
    row.grade,                                     // E
    row.startDate,                                 // F
    String(row.packageDuration),                   // G
    row.mentor,                                    // H
    row.status,                                    // I
    row.membershipStartDate,                       // J
    new Date().toISOString(),                      // K - Last Updated
    row.parentName || "",                          // L
    row.parentPhone || "",                         // M
    row.currentNetScore != null ? String(row.currentNetScore) : "", // N
    row.targetNetScore != null ? String(row.targetNetScore) : "",   // O
    row.specialNote || "",                         // P
    row.dropReason || "",                          // Q
    row.refundStatus || "",                        // R
    row.membershipType || "",                      // S
    row.discountCode || "",                        // T
    row.stripeId || "",                            // U
    row.contactPreference || "",                   // V
    row.sendMessage ? "true" : "false",            // W
  ]
}

export async function appendStudentRow(student: StudentRow): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() })

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: "A:W",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [toRowValues(student)],
    },
  })
}

export async function updateStudentRow(
  email: string,
  updates: Partial<StudentRow>
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() })

  // Tum veriyi al, email'e gore satir bul
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: "A:W",
  })

  const rows = response.data.values
  if (!rows) return

  const rowIndex = rows.findIndex((row: string[]) => row[1] === email)
  if (rowIndex === -1) {
    // Satir bulunamadi, yeni satir ekle
    await appendStudentRow(updates as StudentRow)
    return
  }

  // Mevcut satiri guncelle
  const currentRow = [...rows[rowIndex]]
  // Eksik kolonları doldur
  while (currentRow.length < 23) currentRow.push("")

  const fieldToColumn: Record<string, number> = {
    name: 0,
    email: 1,
    phone: 2,
    school: 3,
    grade: 4,
    startDate: 5,
    packageDuration: 6,
    mentor: 7,
    status: 8,
    membershipStartDate: 9,
    parentName: 11,
    parentPhone: 12,
    currentNetScore: 13,
    targetNetScore: 14,
    specialNote: 15,
    dropReason: 16,
    refundStatus: 17,
    membershipType: 18,
    discountCode: 19,
    stripeId: 20,
    contactPreference: 21,
    sendMessage: 22,
  }

  for (const [field, colIndex] of Object.entries(fieldToColumn)) {
    if ((updates as any)[field] !== undefined) {
      const val = (updates as any)[field]
      currentRow[colIndex] = val != null ? String(val) : ""
    }
  }
  currentRow[10] = new Date().toISOString() // Last Updated

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `A${rowIndex + 1}:W${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [currentRow],
    },
  })
}
