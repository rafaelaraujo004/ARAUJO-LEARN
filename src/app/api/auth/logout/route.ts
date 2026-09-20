import { NextResponse } from 'next/server';
import { destroyCurrentSession } from '@/server/auth/session';

/** Logout por formulário — funciona mesmo sem JavaScript. */
export async function POST(request: Request) {
  await destroyCurrentSession();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
