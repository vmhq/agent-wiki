import { NextResponse } from "next/server";
import { getMaintenanceReport } from "@/lib/wiki";

export async function GET() {
  return NextResponse.json(getMaintenanceReport());
}
