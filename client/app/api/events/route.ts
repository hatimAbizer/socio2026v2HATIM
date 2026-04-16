import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PRODUCTION_BACKEND_FALLBACKS = [
  "https://socioserver-snowy.vercel.app",
  "https://sociodevserver.vercel.app",
] as const;

function normalizeApiBase(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "").replace(/\/api\/?$/i, "");
}

function parseJsonSafely(value: string): any | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function resolveBackendBase(request: NextRequest): string {
  const requestOrigin = normalizeApiBase(request.nextUrl.origin);
  const configuredCandidates = [
    process.env.BACKEND_API_URL,
    process.env.SERVER_API_URL,
    process.env.API_URL,
    process.env.NEXT_PUBLIC_SERVER_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ].map((value) => normalizeApiBase(value));

  const fallbackCandidates =
    process.env.NODE_ENV === "production"
      ? PRODUCTION_BACKEND_FALLBACKS.map((value) => normalizeApiBase(value))
      : ["http://localhost:8000"];

  const uniqueCandidates = Array.from(
    new Set(
      [...configuredCandidates, ...fallbackCandidates]
        .map((value) => normalizeApiBase(value))
        .filter(Boolean)
    )
  );

  const resolvedCandidate = uniqueCandidates.find(
    (candidate) => candidate !== requestOrigin
  );

  return resolvedCandidate || "";
}

function getErrorMessage(payload: any, rawBody: string, fallbackMessage: string): string {
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  const trimmedBody = rawBody.trim();
  if (trimmedBody) {
    return trimmedBody;
  }

  return fallbackMessage;
}

export async function GET(request: NextRequest) {
  try {
    const backendBase = resolveBackendBase(request);

    if (!backendBase) {
      return NextResponse.json(
        {
          error:
            "Backend API origin is not configured. Set BACKEND_API_URL (or NEXT_PUBLIC_API_URL) to your server deployment.",
        },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const backendResponse = await fetch(`${backendBase}/api/events${request.nextUrl.search}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    const rawBody = await backendResponse.text();
    const payload = parseJsonSafely(rawBody);

    if (!backendResponse.ok) {
      const message = getErrorMessage(
        payload,
        rawBody,
        `Failed to fetch events (${backendResponse.status})`
      );

      return NextResponse.json(
        {
          ...(payload && typeof payload === "object" ? payload : {}),
          error: message,
        },
        { status: backendResponse.status }
      );
    }

    if (payload && typeof payload === "object") {
      return NextResponse.json(payload, { status: backendResponse.status });
    }

    return NextResponse.json(
      { error: "Backend returned an invalid response payload." },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Events GET API bridge error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const backendBase = resolveBackendBase(request);
    if (!backendBase) {
      return NextResponse.json(
        {
          error:
            "Backend API origin is not configured. Set BACKEND_API_URL (or NEXT_PUBLIC_API_URL) to your server deployment.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const backendResponse = await fetch(`${backendBase}/api/events`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: formData,
      cache: "no-store",
    });

    const rawBody = await backendResponse.text();
    const payload = parseJsonSafely(rawBody);

    if (!backendResponse.ok) {
      const message = getErrorMessage(
        payload,
        rawBody,
        `Failed to create event (${backendResponse.status})`
      );

      return NextResponse.json(
        {
          ...(payload && typeof payload === "object" ? payload : {}),
          error: message,
        },
        { status: backendResponse.status }
      );
    }

    if (payload && typeof payload === "object") {
      return NextResponse.json(payload, { status: backendResponse.status });
    }

    return NextResponse.json(
      { error: "Backend returned an invalid response payload." },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Events POST API bridge error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}