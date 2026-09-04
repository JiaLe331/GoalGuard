import { sql } from "drizzle-orm";

import type { IntegrationStatusResponse } from "@/lib/contracts";
import { getDatabase } from "@/lib/db/client";
import { runAiSmokeTest, type AiSmokeResult } from "@/lib/gonka/client";
import { runThetanutsSmokeTest, type ThetanutsSmokeResult } from "@/lib/thetanuts/client";

type StatusData = IntegrationStatusResponse["data"];

export interface IntegrationChecks {
  database: () => Promise<StatusData["database"]>;
  gonka: () => Promise<AiSmokeResult>;
  thetanuts: () => Promise<ThetanutsSmokeResult>;
}

async function checkDatabase(): Promise<StatusData["database"]> {
  const { db } = getDatabase();
  await db.execute(sql`select 1`);
  return { status: "ready" };
}

const defaultChecks: IntegrationChecks = {
  database: checkDatabase,
  gonka: () => runAiSmokeTest(),
  thetanuts: () => runThetanutsSmokeTest(),
};

async function withTimeout<T>(operation: () => Promise<T>, timeoutMs = 8_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Integration check timed out.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function collectIntegrationStatus(checks: IntegrationChecks = defaultChecks): Promise<StatusData> {
  const [database, gonka, thetanuts] = await Promise.allSettled([
    withTimeout(checks.database),
    withTimeout(checks.gonka),
    withTimeout(checks.thetanuts),
  ]);

  return {
    database: database.status === "fulfilled" ? database.value : { status: "error" },
    gonka: gonka.status === "fulfilled"
      ? gonka.value
      : { provider: "deepseek", status: "error", model: null, requestId: null },
    thetanuts: thetanuts.status === "fulfilled"
      ? thetanuts.value
      : { status: "error", chainId: 8453, activeEthPutCount: null, marketAsOf: null },
  };
}
