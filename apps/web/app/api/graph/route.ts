import { NextResponse } from "next/server";
import { getGraphData } from "@/lib/wiki";

export async function GET() {
  const data = getGraphData();
  return NextResponse.json(data);
}
