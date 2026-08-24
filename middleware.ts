import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// robots.txt disallows crawling these unbounded, uncached (cache: 'no-store')
// per-block/tx/address detail pages — but access logs showed GPTBot, meta-externalagent
// and Amazonbot still hammering them over an hour after that shipped (81% of sampled
// traffic), so robots.txt alone isn't enough. Block known automated clients here,
// before any RPC/Blockscout call gets made, for exactly the routes that were driving
// the CPU/memory incident.
const BOT_UA = /bot|crawler|spider|externalagent|facebookexternalhit/i;

export function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? '';
  if (BOT_UA.test(ua)) {
    return new NextResponse('Disallowed for automated clients — see /robots.txt', { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/block/:path*',
    '/tx/:path*',
    '/address/:path*',
    '/token/:address/holders',
    '/token/:address/transfers',
  ],
};
