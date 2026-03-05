import { NextRequest, NextResponse } from "next/server";

const KLIPY_API_KEY = process.env.KLIPY_API_KEY!;
const KLIPY_BASE    = `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q       = searchParams.get("q")?.trim();
    const page    = searchParams.get("page")    ?? "1";
    const perPage = searchParams.get("per_page") ?? "24";

    const endpoint = q
      ? `${KLIPY_BASE}/search?q=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}`
      : `${KLIPY_BASE}/trending?page=${page}&per_page=${perPage}`;

    const res  = await fetch(endpoint, { next: { revalidate: 60 } });
    const data = await res.json();

    // DEBUG — remove after checking logs
    console.log("[Klipy RAW]", JSON.stringify(data, null, 2));

    if (!res.ok) {
      console.error("[GIFs API] Klipy error:", data);
      return NextResponse.json({ error: "Failed to fetch GIFs" }, { status: res.status });
    }

    const items = data?.data?.data ?? data?.data ?? [];
    const gifs  = items.map((item: any) => ({
      id:          item.id ?? item.slug,
      title:       item.title ?? "",
      url:         item.file?.hd?.gif?.url ?? item.file?.md?.gif?.url ?? "",
      preview_url: item.file?.sm?.gif?.url ?? item.file?.xs?.gif?.url ?? item.file?.md?.gif?.url ?? "",
    })).filter((g: any) => g.url);

    return NextResponse.json({ gifs, has_next: data?.data?.has_next ?? false });
  } catch (err) {
    console.error("[GIFs API] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}