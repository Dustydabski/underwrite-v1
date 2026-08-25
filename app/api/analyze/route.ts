import { NextRequest, NextResponse } from "next/server";
import { analyzeProperty } from "@/lib/analyze";
import { AnalysisResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.property || !body?.assumptions) {
    return NextResponse.json({ error: "property and assumptions are required." }, { status: 400 });
  }

  try {
    const result: AnalysisResult = analyzeProperty(body.property, body.assumptions);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed." },
      { status: 500 }
    );
  }
}
