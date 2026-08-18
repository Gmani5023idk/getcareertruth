import { NextResponse } from 'next/server';

const ALLOWED_THEMES = ['light', 'dark', 'system', 'auto'] as const;

export async function POST(request: Request) {
  let theme: unknown;
  try {
    const body = await request.json();
    theme = body?.theme;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof theme !== 'string' || !(ALLOWED_THEMES as readonly string[]).includes(theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
  }
  
  const response = NextResponse.json({ success: true });
  
  // Set theme cookie
  response.cookies.set('theme', theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
  
  return response;
}