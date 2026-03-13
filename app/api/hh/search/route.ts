import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text") || "";
  const page = req.nextUrl.searchParams.get("page") || "0";
  const token = req.nextUrl.searchParams.get("token") || process.env.HH_API_TOKEN || "";

  if (!text.trim()) {
    return NextResponse.json({ items: [], found: 0, pages: 0 });
  }

  if (!token) {
    return NextResponse.json(
      { error: "NO_TOKEN", message: "Требуется API-токен HH.kz для поиска резюме" },
      { status: 401 }
    );
  }

  try {
    const params = new URLSearchParams({
      text,
      page,
      per_page: "20",
      area: "40",
      order_by: "relevance",
    });

    const res = await fetch(`https://api.hh.kz/resumes?${params}`, {
      headers: {
        "User-Agent": "ResumeAI/1.0 (resume-matching-app)",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (res.status === 403) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Токен не имеет доступа к поиску резюме. Нужен токен работодателя." },
        { status: 403 }
      );
    }

    if (res.status === 401) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Невалидный или истёкший токен. Обновите токен в настройках." },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: "HH_ERROR", message: `HH API: ${res.status}`, body }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "NETWORK", message: err.message }, { status: 500 });
  }
}
