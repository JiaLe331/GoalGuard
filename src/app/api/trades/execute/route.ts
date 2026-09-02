import { route } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/session";
import { prepareExecution } from "@/lib/trades/service";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) { return route(async () => { assertSameOrigin(request); return prepareExecution(); }); }
