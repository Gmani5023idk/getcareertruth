import { prisma } from '@/lib/db';
import { apiHandler, success } from '@/lib/api-handler';
import { listEmployeesSchema } from '@/shared/schemas/employee.schema';

/** GET /api/employees — List verified employees with optional filters + cursor pagination */
export const GET = apiHandler({
  schema: listEmployeesSchema,
  handler: async ({ body }) => {
    const { industry, minPrice, maxPrice, search, page = '1', limit = '20' } = body as typeof body & { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {
      role: 'EMPLOYEE',
      isDeleted: false,
      employeeProfile: { isNot: null, verificationStatus: 'VERIFIED' } as Record<string, unknown>,
    };

    if (industry && industry !== 'All') {
      (where.employeeProfile as Record<string, unknown>).industry = industry;
    }

    if (search) {
      where.OR = [
        { employeeProfile: { fullName: { contains: search, mode: 'insensitive' } } },
        { employeeProfile: { company: { contains: search, mode: 'insensitive' } } },
        { employeeProfile: { jobTitle: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Move price filter to DB — NOT JS filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      (where.employeeProfile as Record<string, unknown>).pricePerCall = {
        ...((where.employeeProfile as Record<string, unknown>).pricePerCall || {}),
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    // Run count and data queries in parallel
    const [employees, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: {
          employeeProfile: {
            select: {
              fullName: true,
              jobTitle: true,
              company: true,
              industry: true,
              yearsExp: true,
              pricePerCall: true,
              topics: true,
              rating: true,
              totalCalls: true,
              verificationStatus: true,
            },
          },
          bookingsAsEmployee: {
            where: { status: 'COMPLETED' },
            select: { id: true },
          },
        },
        take: limitNum,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    // Format response
    const formattedEmployees = employees.map((emp) => ({
      id: emp.id,
      name: emp.employeeProfile?.fullName || 'Unknown',
      jobTitle: emp.employeeProfile?.jobTitle || '',
      company: emp.employeeProfile?.company || '',
      industry: emp.employeeProfile?.industry || '',
      yearsOfExperience: emp.employeeProfile?.yearsExp || 0,
      pricePerCall: emp.employeeProfile?.pricePerCall || 0,
      topics: emp.employeeProfile?.topics || [],
      verified: emp.employeeProfile?.verificationStatus === 'VERIFIED',
      location: '',
      avatar: null,
      reviewCount: emp.bookingsAsEmployee?.length || 0,
      rating: emp.employeeProfile?.rating || 4.5,
    }));

    const totalPages = Math.ceil(total / limitNum);

    return success({
      data: formattedEmployees,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
    });
  },
});
