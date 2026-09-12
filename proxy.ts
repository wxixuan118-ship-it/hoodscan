import { NextResponse, type NextRequest } from 'next/server';
import { publishedRoutes } from './lib/seo-registry';
import { isAddress } from './lib/seo-types';

const BOT_UA = /bot|crawler|spider|externalagent|facebookexternalhit/i;
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/block/') || pathname.startsWith('/tx/')) {
    if (BOT_UA.test(request.headers.get('user-agent') ?? '')) {
      return new NextResponse('Disallowed for automated clients — see /robots.txt', { status: 403 });
    }
    return NextResponse.next();
  }
  const [, kind, address] = pathname.split('/');
  const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, follow' };
  if (!address || !isAddress(address)) return new NextResponse('Invalid address', { status: 404, headers });
  if (address !== address.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(address, address.toLowerCase());
    return NextResponse.redirect(url, 308);
  }
  try {
    if ((await publishedRoutes()).has(`${kind}/${address}`)) return NextResponse.next();
  } catch {
    return new NextResponse('Snapshot directory temporarily unavailable. Please retry.', {
      status: 503, headers: { ...headers, 'Retry-After': '60' },
    });
  }
  // Identical lightweight response for people and bots; no ISR disk entry for misses.
  return new NextResponse(`<!doctype html><html lang="en"><head><meta name="robots" content="noindex,follow"><title>Snapshot not available | HoodScan</title></head><body><main><h1>${kind === 'token' ? 'Token' : 'Address'} snapshot not available</h1><p>${address}</p><p>This address has not yet been published in the snapshot directory.</p><a href="https://robinhoodchain.blockscout.com/${kind}/${address}">View live data on Blockscout</a></main></body></html>`, {
    status: kind === 'token' ? 404 : 200,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
export const config = { matcher: ['/token/:path*', '/address/:path*', '/block/:path*', '/tx/:path*'] };
