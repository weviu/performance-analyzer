import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const fastApiPayload = {
    height: body.height,
    weight: body.weight,
    age: body.age,
    sex: body.sex,
    season: body.season,
  };

  try {
    const response = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fastApiPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `FastAPI error: ${error}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Could not reach prediction service. Is FastAPI running on port 8000?" },
      { status: 503 }
    );
  }
}

