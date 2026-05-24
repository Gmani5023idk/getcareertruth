import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [
      parentProfile,
      upcomingBookings,
      completedCount,
      paymentAgg,
      completedBookings,
      pastBookings,
      pendingPaymentsBookings,
      linkedStudents,
      pastSessionsWithTranscripts,
    ] = await Promise.all([
      // 1. Parent profile
      prisma.parentProfile.findUnique({
        where: { userId },
        select: {
          fullName: true,
          city: true,
          childStage: true,
          childCourse: true,
          concerns: true,
          openToConnect: true,
        },
      }),

      // 2. Upcoming bookings (child's)
      prisma.booking.findMany({
        where: {
          parentId: userId,
          status: { in: ['CONFIRMED', 'PENDING_CONFIRM', 'PENDING_PAYMENT'] },
        },
        include: {
          employee: {
            select: {
              id: true,
              profilePhoto: true,
              employeeProfile: {
                select: { fullName: true, jobTitle: true, company: true, rating: true },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      }),

      // 3. Completed session count
      prisma.booking.count({
        where: { parentId: userId, status: 'COMPLETED' },
      }),

      // 4. Payment stats
      prisma.booking.aggregate({
        where: { parentId: userId, status: 'COMPLETED' },
        _sum: { amountPaid: true },
      }),

      // 5. Completed bookings for time/topic totals
      prisma.booking.findMany({
        where: { parentId: userId, status: 'COMPLETED' },
        select: {
          durationMins: true,
          employeeId: true,
          employee: {
            select: {
              employeeProfile: {
                select: { topics: true, fullName: true },
              },
            },
          },
        },
      }),

      // 6. Past bookings for payment history
      prisma.booking.findMany({
        where: { parentId: userId, status: { in: ['COMPLETED', 'CANCELLED', 'REFUNDED'] } },
        include: {
          employee: {
            select: {
              profilePhoto: true,
              employeeProfile: {
                select: { fullName: true, jobTitle: true, company: true },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      }),

      // 7. Pending payments (PENDING_PAYMENT status)
      prisma.booking.findMany({
        where: {
          parentId: userId,
          status: 'PENDING_PAYMENT',
        },
        include: {
          employee: {
            select: {
              employeeProfile: {
                select: { fullName: true },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      }),

      // 8. Find linked students (students linked to this parent via parentProfile)
      prisma.user.findMany({
        where: {
          role: 'STUDENT',
          // Parents and students share the same parentId relation through bookings
          // We look for students with bookings that have this parentId
          bookingsAsStudent: {
            some: { parentId: userId },
          },
        },
        select: {
          id: true,
          studentProfile: {
            select: {
              fullName: true,
              collegeName: true,
              degree: true,
              branch: true,
              currentYear: true,
              targetIndustries: true,
              targetCompanies: true,
              bio: true,
            },
          },
        },
        take: 5,
      }),

      // 9. Past sessions with transcripts
      prisma.booking.findMany({
        where: {
          parentId: userId,
          status: 'COMPLETED',
        },
        include: {
          employee: {
            select: {
              profilePhoto: true,
              employeeProfile: {
                select: { fullName: true, jobTitle: true, company: true },
              },
            },
          },
          transcript: {
            select: { id: true, createdAt: true },
          },
        },
        orderBy: { scheduledAt: 'desc' },
      }),
    ]);

    // Progress summary
    const totalHoursLearned = completedBookings.reduce(
      (sum, b) => sum + Math.round((b.durationMins || 0) / 60 * 10) / 10,
      0
    );
    const uniqueTopics = new Set<string>();
    const mentorSessionCount = new Map<string, number>();
    completedBookings.forEach((b) => {
      b.employee?.employeeProfile?.topics?.forEach((t) => uniqueTopics.add(t));
      const name = b.employee?.employeeProfile?.fullName || 'Mentor';
      mentorSessionCount.set(name, (mentorSessionCount.get(name) || 0) + 1);
    });

    // Mentor conversations (privacy-safe — just name + last activity + session count)
    const mentorConversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                profilePhoto: true,
                employeeProfile: { select: { id: true, fullName: true, jobTitle: true, company: true } },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Filter to only include conversations that have employee participants
    const mentorMessages = mentorConversations
      .filter((c) =>
        c.participants.some((p) => p.user.employeeProfile !== null)
      )
      .map((c) => {
        const empParticipant = c.participants.find(
          (p) => p.user.employeeProfile !== null
        );
        const empName = empParticipant?.user.employeeProfile?.fullName || 'Mentor';
        return {
          conversationId: c.id,
          employeeId: empParticipant?.user.id || null,
          employeeProfileId: empParticipant?.user.employeeProfile?.id || null,
          mentorName: empName,
          mentorTitle: empParticipant?.user.employeeProfile?.jobTitle || '',
          mentorCompany: empParticipant?.user.employeeProfile?.company || '',
          mentorAvatar: empParticipant?.user.profilePhoto || null,
          lastActivityAt: c.messages[0]?.createdAt || c.updatedAt,
          sessionCount: mentorSessionCount.get(empName) || 0,
        };
      });

    // Active mentors count (unique from all bookings)
    const allMentorIds = new Set(
      [...upcomingBookings.map((b) => b.employeeId)]
    );

    // Child profile from linked students
    const childProfile = linkedStudents.length > 0 ? {
      childName: linkedStudents[0].studentProfile?.fullName || 'Child',
      childCourse: parentProfile?.childCourse || linkedStudents[0].studentProfile?.degree || 'Career Planning',
      childStage: parentProfile?.childStage || linkedStudents[0].studentProfile?.currentYear || 'College',
      collegeName: linkedStudents[0].studentProfile?.collegeName || '',
      concerns: parentProfile?.concerns || [],
      openToConnect: parentProfile?.openToConnect ?? true,
      targetIndustries: linkedStudents[0].studentProfile?.targetIndustries || [],
      targetCompanies: linkedStudents[0].studentProfile?.targetCompanies || [],
      bio: linkedStudents[0].studentProfile?.bio || '',
    } : {
      childName: 'Child',
      childCourse: parentProfile?.childCourse || 'Career Planning',
      childStage: parentProfile?.childStage || 'College',
      collegeName: '',
      concerns: parentProfile?.concerns || [],
      openToConnect: parentProfile?.openToConnect ?? true,
      targetIndustries: [],
      targetCompanies: [],
      bio: '',
    };

    // Compute goals (from targetIndustries/targetCompanies)
    const goalsSet = (childProfile.targetIndustries.length + childProfile.targetCompanies.length) > 0
      ? childProfile.targetIndustries.length + childProfile.targetCompanies.length
      : 0;

    // Recent milestones from completed sessions
    const recentMilestones = completedBookings
      .filter(b => b.employee?.employeeProfile?.fullName)
      .map(b => `Session with ${b.employee?.employeeProfile?.fullName}`)
      .slice(0, 3);

    return NextResponse.json({
      data: {
        profile: parentProfile || {
          fullName: session.user.name || 'Parent',
          childStage: 'Career Planning',
          childCourse: '',
          concerns: [],
          openToConnect: true,
        },
        childProfile,
        upcomingBookings: upcomingBookings.map((b) => ({
          id: b.id,
          status: b.status,
          scheduledAt: b.scheduledAt,
          topic: b.topic,
          durationMins: b.durationMins,
          meetingLink: b.meetingLink,
          conversationId: b.conversationId,
          amountPaid: b.amountPaid,
          hasTranscript: !!pastSessionsWithTranscripts.find(p => p.id === b.id)?.transcript,
          transcriptUrl: pastSessionsWithTranscripts.find(p => p.id === b.id)?.transcript ? `/api/transcripts/${b.id}` : null,
          transcriptAvailable: !!pastSessionsWithTranscripts.find(p => p.id === b.id)?.transcript,
          employee: {
            id: b.employee.id,
            avatar: b.employee.profilePhoto,
            employeeProfile: b.employee.employeeProfile,
          },
        })),
        completedSessions: completedCount,
        totalPaid: paymentAgg._sum.amountPaid || 0,
        activeMentors: allMentorIds.size,
        progressSummary: {
          totalHoursLearned,
          uniqueTopicsExplored: uniqueTopics.size,
          goalsSet,
          recentMilestones,
        },
        mentorMessages,
        upcomingPayments: pendingPaymentsBookings.map((b) => ({
          bookingId: b.id,
          mentorName: b.employee?.employeeProfile?.fullName || 'Mentor',
          scheduledAt: b.scheduledAt,
          amount: b.amountPaid,
          paymentStatus: 'PENDING',
        })),
        paymentHistory: pastBookings.map((b) => ({
          id: b.id,
          date: b.scheduledAt,
          mentorName: b.employee?.employeeProfile?.fullName || 'Mentor',
          mentorAvatar: b.employee.profilePhoto,
          amount: b.amountPaid,
          status: b.status,
          receiptUrl: `/api/receipts/${b.id}`,
        })),
        pastSessions: pastSessionsWithTranscripts.map((b) => ({
          id: b.id,
          date: b.scheduledAt,
          mentorName: b.employee?.employeeProfile?.fullName || 'Mentor',
          mentorAvatar: b.employee.profilePhoto,
          duration: b.durationMins,
          topic: b.topic,
          rating: null, // Will be set from review if exists
          hasTranscript: !!b.transcript,
          transcriptUrl: b.transcript ? `/api/transcripts/${b.id}` : null,
        })),
      },
    });
  } catch (error: any) {
    console.error('Parent dashboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
