import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const token = req.nextUrl.searchParams.get("token") || process.env.HH_API_TOKEN || "";

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "NO_TOKEN", message: "Требуется API-токен" }, { status: 401 });
  }

  try {
    const res = await fetch(`https://api.hh.kz/resumes/${id}`, {
      headers: {
        "User-Agent": "ResumeAI/1.0 (resume-matching-app)",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "HH_ERROR", message: `HH API: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "NETWORK", message: err.message }, { status: 500 });
  }
}
