import { runThetanutsSmokeTest } from "../src/lib/thetanuts/client-core";
import { loadLocalEnvironment } from "./load-local-env";

loadLocalEnvironment();

const result = await runThetanutsSmokeTest();
console.log(JSON.stringify(result, null, 2));

if (result.status !== "ready") {
  process.exitCode = 1;
}
