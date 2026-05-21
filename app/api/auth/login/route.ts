import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/shared/schemas/auth.schema';
import { validateUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const user = await validateUser(validatedData.email, validatedData.password);

    return NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.studentProfile?.fullName || user.employeeProfile?.fullName || user.parentProfile?.fullName || user.email,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    let message = 'An unexpected error occurred';
    let status = 500;

    if (error.name === 'ZodError') {
      message = 'Invalid input data';
      status = 400;
    } else if (error.message === 'USER_NOT_FOUND') {
      message = 'No account found with this email';
      status = 401;
    } else if (error.message === 'INVALID_PASSWORD') {
      message = 'Incorrect password';
      status = 401;
    } else if (error.message === 'SOCIAL_AUTH_ONLY') {
      message = 'Please use Google to sign in to this account';
      status = 401;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
