import { type NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const pathStr = path ? path.join('/') : '';
  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL}/api/${pathStr}${url.search}`;

  // Forward all headers except host
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  // Get body for POST/PUT/PATCH
  let body: string | undefined;
  if (!['GET', 'HEAD'].includes(req.method)) {
    body = await req.text();
  }

  const backendRes = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    // Don't follow redirects — pass them through
    redirect: 'manual',
  });

  // Forward response headers
  const responseHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    // Skip headers that Next.js will set
    if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  // 204 No Content / 205 Reset / 304 Not Modified — no body allowed
  if ([204, 205, 304].includes(backendRes.status)) {
    return new NextResponse(null, {
      status: backendRes.status,
      headers: responseHeaders,
    });
  }

  const responseBody = await backendRes.text();

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
