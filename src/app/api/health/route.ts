import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Healthcheck do Railway. Não toca no banco para não derrubar o deploy por lentidão. */
export function GET() {
  return NextResponse.json({ status: 'ok', service: 'araujo-learn', time: new Date().toISOString() });
}
