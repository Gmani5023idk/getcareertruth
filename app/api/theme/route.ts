import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { theme } = await request.json();
  
  const response = NextResponse.json({ success: true });
  
  // Set theme cookie
  response.cookies.set('theme', theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
  
  return response;
}