import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const industry = searchParams.get('industry');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const search = searchParams.get('search');

    let where: any = {
      role: 'EMPLOYEE',
      isDeleted: false,
      employeeProfile: {
        isNot: null,
        isVerified: true,
      },
    };

    if (industry && industry !== 'All') {
      where.employeeProfile.industry = industry;
    }

    if (search) {
      where.OR = [
        { employeeProfile: { fullName: { contains: search, mode: 'insensitive' } } },
        { employeeProfile: { company: { contains: search, mode: 'insensitive' } } },
        { employeeProfile: { jobTitle: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const employees = await prisma.user.findMany({
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
      take: 50,
    });

    // Filter by price range if provided
    let filtered = employees;
    if (minPrice || maxPrice) {
      filtered = employees.filter((emp) => {
        const price = emp.employeeProfile?.pricePerCall || 0;
        const min = minPrice ? parseInt(minPrice) : 0;
        const max = maxPrice ? parseInt(maxPrice) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Format response
    const formattedEmployees = filtered.map((emp) => ({
      id: emp.id,
      name: emp.employeeProfile?.fullName || 'Unknown',
      jobTitle: emp.employeeProfile?.jobTitle || '',
      company: emp.employeeProfile?.company || '',
      industry: emp.employeeProfile?.industry || '',
      yearsOfExperience: emp.employeeProfile?.yearsExp || 0,
      pricePerCall: emp.employeeProfile?.pricePerCall || 0,
      topics: emp.employeeProfile?.topics || [],
      verified: emp.employeeProfile?.verificationStatus === 'VERIFIED',
      location: '', // TODO: Add location field to EmployeeProfile
      avatar: null, // TODO: Add profilePhoto field to EmployeeProfile
      reviewCount: emp.bookingsAsEmployee?.length || 0,
      rating: emp.employeeProfile?.rating || 4.5,
    }));

    return NextResponse.json(formattedEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}
