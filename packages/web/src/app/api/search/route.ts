import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp, publicRateLimit } from "@/lib/rate-limit";

const { GET: searchHandler } = createFromSource(source, {
  buildIndex: (page) => ({
    title: page.data.title,
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData: page.data.structuredData ?? {
      headings: [],
      contents: [
        {
          heading: page.data.title,
          content: page.data.description ?? '',
        },
      ],
    },
  }),
});

const CACHE_CONTROL_SEARCH = "public, s-maxage=300, stale-while-revalidate=3600";

export async function GET(request: NextRequest): Promise<Response> {
  const rateLimited = await checkRateLimit(publicRateLimit, getClientIp(request));
  if (rateLimited) {
    return rateLimited;
  }

  const response = await searchHandler(request);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", CACHE_CONTROL_SEARCH);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
