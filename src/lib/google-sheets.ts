import { google } from "googleapis"

/**
 * Google Sheets API v4 servisi.
 * Service account ile authenticate olur.
 * Sheets sync fire-and-forget seklinde calisir, HTTP response'u etkilemez.
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
    row.name,
    row.email,
    row.phone,
    row.school,
    row.grade,
    row.startDate,
    String(row.packageDuration),
    row.mentor,
    row.status,
    row.membershipStartDate,
    new Date().toISOString(),
  ]
}

export async function appendStudentRow(student: StudentRow): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() })

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: "A:K",
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
    range: "A:K",
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
  const currentRow = rows[rowIndex]
  const newRow = [...currentRow]

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
  }

  for (const [field, colIndex] of Object.entries(fieldToColumn)) {
    if ((updates as any)[field] !== undefined) {
      newRow[colIndex] = String((updates as any)[field])
    }
  }
  newRow[10] = new Date().toISOString() // Last Updated

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `A${rowIndex + 1}:K${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [newRow],
    },
  })
}
