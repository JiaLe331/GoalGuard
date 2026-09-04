import { runAiSmokeTest } from "../src/lib/gonka/client";
import { loadLocalEnvironment } from "./load-local-env";

loadLocalEnvironment();

const result = await runAiSmokeTest();
console.log(JSON.stringify(result, null, 2));

if (result.status !== "ready") {
  process.exitCode = 1;
}
