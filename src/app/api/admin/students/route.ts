import { NextRequest, NextResponse } from "next/server";
import { prisma, getAdminUserId } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    console.log("[API] GET /api/admin/students - Fetching students...");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const mentorId = searchParams.get("mentorId");
    const search = searchParams.get("search");
    
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
        ]
      };
}

    const students = await prisma.student.findMany({
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
      where: {
        ...(status && { status }),
        ...(mentorId && {
          studentAssignments: {
            some: { mentorId, endDate: null }
          }
        }),
        ...(search && searchCondition)
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("[API] Error fetching students:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[API] POST /api/admin/students - Creating student...");
    
    // Fixed the line below where the import was stuck to the end of the line
    const body = await request.json(); 
    
    const { name, email, phone, school, grade, startDate, endDate, mentorId,
            parentName, parentPhone, currentNetScore, targetNetScore,
            specialNote, membershipType, discountCode, stripeId,
            contactPreference, sendMessage } = body;

    if (!name || !email || !phone || !school || !grade || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingStudent = await prisma.student.findUnique({
      where: { email }
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "Student with this email already exists" },
        { status: 400 }
      );
    }

    const startDt = new Date(startDate)
    const student = await prisma.student.create({
      data: {
        name,
        email,
        phone,
        school,
        grade,
        startDate: startDt,
        endDate: endDate ? new Date(endDate) : null,
        purchaseDate: new Date(),
        // Veli bilgileri
        parentName: parentName || null,
        parentPhone: parentPhone || null,
        // Puan takibi
        currentNetScore: currentNetScore || null,
        targetNetScore: targetNetScore || null,
        // Takip ve notlar
        specialNote: specialNote || null,
        // Tally formu
        membershipType: membershipType || "new",
        packageType: body.packageType || null,
        discountCode: discountCode || null,
        // Stripe
        stripeId: stripeId || null,
        // İletişim tercihi
        contactPreference: contactPreference || null,
        // Mesaj
        sendMessage: sendMessage || false,
        // Hesaplamalar
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