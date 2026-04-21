import { NextRequest, NextResponse } from "next/server";
import { prisma, getAdminUserId } from "@/lib/prisma";

function validatePhone(field: string, value: string | undefined | null, required: boolean): string | null {
  if (!value || value.trim() === "") {
    if (required) return `${field} zorunludur.`;
    return null;
  }
  if (!/^\+90\d{10}$/.test(value.trim())) {
    return `${field} +90 ile başlamalı ve 10 rakam içermelidir (örn: +905551234567).`;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const mentorId = searchParams.get("mentorId");
    const search = searchParams.get("search");
    const paymentStatus = searchParams.get("paymentStatus");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    let searchCondition = {};

    if (search) {
      const searchTRLower = search.toLocaleLowerCase('tr-TR');
      const searchTRUpper = search.toLocaleUpperCase('tr-TR');

      searchCondition = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { name: { contains: searchTRLower, mode: "insensitive" } },
          { name: { contains: searchTRUpper, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { parentPhone: { contains: search } },
          { parentName: { contains: search, mode: "insensitive" } },
          { parentName: { contains: searchTRLower, mode: "insensitive" } },
          { parentName: { contains: searchTRUpper, mode: "insensitive" } },
        ]
      };
    }

    const where = {
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(mentorId && {
        studentAssignments: {
          some: { mentorId, endDate: null }
        }
      }),
      ...(search && searchCondition)
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        include: {
          studentAssignments: {
            where: { endDate: null },
            include: {
              mentor: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          _count: {
            select: { studentAssignments: true, payments: true }
          }
        },
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.student.count({ where })
    ]);

    return NextResponse.json({ students, total, page, pageSize });
  } catch (error) {
    console.error("[API] Error fetching students:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, email, phone, grade, startDate, endDate, mentorId,
            parentName, parentPhone, currentNetScore, targetNetScore,
            specialNote, membershipType, discountCode, stripeId,
            contactPreference, sendMessage } = body;

    if (!name || !phone || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, phone, startDate, endDate" },
        { status: 400 }
      );
    }

    const phoneError = validatePhone("Telefon numarası", phone, true);
    const parentPhoneError = validatePhone("Veli telefonu", parentPhone, false);
    if (phoneError || parentPhoneError) {
      return NextResponse.json(
        { error: phoneError || parentPhoneError },
        { status: 400 }
      );
    }

    // Email unique kontrolü sadece email verildiyse
    if (email) {
      const existingStudent = await prisma.student.findUnique({
        where: { email }
      });

      if (existingStudent) {
        return NextResponse.json(
          { error: "Student with this email already exists" },
          { status: 400 }
        );
      }
    }

    const startDt = new Date(startDate)
    let endDt: Date | null = endDate ? new Date(endDate) : null;
    if (!endDt && body.packageType === "1_aylik") {
      // UTC-guvenli ay ekleme
      const totalMonths = startDt.getUTCMonth() + 1
      const year = startDt.getUTCFullYear() + Math.floor(totalMonths / 12)
      const month = totalMonths % 12
      const maxDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
      const day = Math.min(startDt.getUTCDate(), maxDay)
      endDt = new Date(Date.UTC(year, month, day))
    }
    const student = await prisma.student.create({
      data: {
        name,
        email: email || null,
        phone,
        school: "",
        grade: grade || "",
        startDate: startDt,
        endDate: new Date(endDate),
        paymentStatus: "paid",
        purchaseDate: new Date(),
        parentName: parentName || null,
        parentPhone: parentPhone || null,
        currentNetScore: currentNetScore || null,
        targetNetScore: targetNetScore || null,
        specialNote: specialNote || null,
        membershipType: membershipType || "new",
        packageType: body.packageType || null,
        discountCode: discountCode || null,
        stripeId: stripeId || null,
        contactPreference: contactPreference || null,
        sendMessage: sendMessage || false,
        daySAG: new Date().getDate(),
        dayUBG: startDt.getDate(),
        monthUBG: startDt.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        monthBSO: startDt.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
      }
    });

    if (mentorId) {
      await prisma.studentAssignment.create({
        data: {
          studentId: student.id,
          mentorId,
          startDate: new Date(startDate)
        }
      });
    }

    try {
      const adminUserId = await getAdminUserId();
      await prisma.log.create({
        data: {
          entityType: "student",
          entityId: student.id,
          action: "created",
          description: `Student ${name} created`,
          userId: adminUserId,
          studentId: student.id,
          metadata: { mentorId }
        }
      });
    } catch (logError) {
      console.error("[API] Warning: Failed to create log:", logError);
    }

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating student:", error);
    return NextResponse.json(
      {
        error: "Failed to create student",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
