import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

function normalizeApiBase(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "").replace(/\/api\/?$/i, "");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const authHeader = request.headers.get("authorization");
    const body = await request.json();

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // Call the backend Express server
    const configuredBackendBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
    const requestOrigin = normalizeApiBase(request.nextUrl.origin);
    const backendUrl =
      configuredBackendBase && configuredBackendBase !== requestOrigin
        ? configuredBackendBase
        : "http://localhost:8000";
    const response = await fetch(`${backendUrl}/api/events/${eventId}/archive`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // ✅ Revalidate cache after successful archive
    revalidateTag("events");
    console.log("🔄 Cache revalidated for tag: events");

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Archive API bridge error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
