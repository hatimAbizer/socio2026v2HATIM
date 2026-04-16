import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalizeApiBase(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "").replace(/\/api\/?$/i, "");
}

function parseJsonSafely(value: string): any | null {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function resolveBackendBase(request: NextRequest): string {
  const configuredBackendBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
  const requestOrigin = normalizeApiBase(request.nextUrl.origin);

  if (configuredBackendBase && configuredBackendBase !== requestOrigin) {
    return configuredBackendBase;
  }

  return "http://localhost:8000";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const normalizedEventId = String(eventId || "").trim();

    if (!normalizedEventId) {
      return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const backendBase = resolveBackendBase(request);

    const backendResponse = await fetch(
      `${backendBase}/api/events/${encodeURIComponent(normalizedEventId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        cache: "no-store",
      }
    );

    const rawBody = await backendResponse.text();
    const payload = parseJsonSafely(rawBody);

    if (!backendResponse.ok) {
      const message =
        typeof payload?.error === "string"
          ? payload.error
          : rawBody?.trim() || `Failed to fetch event (${backendResponse.status})`;
      return NextResponse.json({ error: message }, { status: backendResponse.status });
    }

    if (payload && typeof payload === "object") {
      return NextResponse.json(payload, { status: 200 });
    }

    return NextResponse.json(
      { error: "Backend returned an invalid response payload." },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Event GET API bridge error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const normalizedEventId = String(eventId || "").trim();

    if (!normalizedEventId) {
      return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const backendBase = resolveBackendBase(request);

    const backendResponse = await fetch(
      `${backendBase}/api/events/${encodeURIComponent(normalizedEventId)}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
        },
        body: formData,
        cache: "no-store",
      }
    );

    const rawBody = await backendResponse.text();
    const payload = parseJsonSafely(rawBody);

    if (!backendResponse.ok) {
      const message =
        typeof payload?.error === "string"
          ? payload.error
          : rawBody?.trim() || `Failed to update event (${backendResponse.status})`;

      const responsePayload = {
        ...(payload && typeof payload === "object" ? payload : {}),
        error: message,
      };

      return NextResponse.json(responsePayload, { status: backendResponse.status });
    }

    if (payload && typeof payload === "object") {
      return NextResponse.json(payload, { status: 200 });
    }

    return NextResponse.json(
      { error: "Backend returned an invalid response payload." },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Event PUT API bridge error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
