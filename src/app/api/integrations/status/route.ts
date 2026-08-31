import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { IntegrationStatusResponseSchema } from "@/lib/contracts";
import { collectIntegrationStatus } from "@/lib/integrations/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const response = IntegrationStatusResponseSchema.parse({
    data: await collectIntegrationStatus(),
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
