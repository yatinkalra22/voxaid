import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL || "http://localhost:3001";
const API_KEY = process.env.API_SECRET_KEY || "";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const res = await fetch(
      `${API_BASE}/referral/${encodeURIComponent(params.id)}/callback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
      },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Callback service unavailable" },
      { status: 502 },
    );
  }
}
