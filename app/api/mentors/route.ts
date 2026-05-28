import { prisma } from '@/lib/db';
import { apiHandler, success } from '@/lib/api-handler';
import { listMentorsSchema } from '@/shared/schemas/mentor.schema';

/** GET /api/mentors — List approved mentors with optional filters */
export const GET = apiHandler({
  schema: listMentorsSchema,
  handler: async ({ body }) => {
    const { domain, sort } = body;

    const mentors = await prisma.user.findMany({
      where: {
        mentorApplications: {
          some: {
            status: 'APPROVED',
            ...(domain ? { domain: { contains: domain, mode: 'insensitive' } } : {}),
          },
        },
      },
      select: {
        id: true,
        profilePhoto: true,
        studentProfile: {
          select: {
            fullName: true,
          },
        },
        mentorProfile: true,
        mentorApplications: {
          where: { status: 'APPROVED' },
          select: {
            collegeName: true,
            domain: true,
            sessionRate: true,
          },
        },
      },
    });

    // Map to public format
    let formattedMentors = mentors.map((m) => {
      const app = m.mentorApplications[0];
      const prof = m.mentorProfile;
      return {
        id: m.id,
        name: m.studentProfile?.fullName || 'Anonymous',
        photo: prof?.photoUrl || m.profilePhoto,
        college: app.collegeName,
        domain: app.domain,
        sessionRate: app.sessionRate,
        rating: prof?.rating || 0,
        reviewsCount: prof?.reviewsCount || 0,
      };
    });

    // Sorting
    if (sort === 'rating') {
      formattedMentors.sort((a, b) => b.rating - a.rating);
    }

    return success(formattedMentors);
  },
});
