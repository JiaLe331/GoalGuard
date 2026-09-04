import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface NiulaiManifest {
  assets: Record<string, { file: string; sha256: string }>;
  motions: Record<string, {
    file: string;
    sha256: string;
    adaptivePlayback?: { file: string; sha256: string };
  }>;
}

const assetRoot = resolve(process.cwd(), "public/media/niulai-v1");
const manifest = JSON.parse(readFileSync(resolve(assetRoot, "manifest.json"), "utf8")) as NiulaiManifest;

describe("Niu Lai asset manifest", () => {
  it("matches every published pose asset", () => {
    const motions = Object.values(manifest.motions);
    const adaptivePlayback = motions.flatMap((motion) => motion.adaptivePlayback ? [motion.adaptivePlayback] : []);
    for (const asset of [...Object.values(manifest.assets), ...motions, ...adaptivePlayback]) {
      const digest = createHash("sha256").update(readFileSync(resolve(assetRoot, asset.file))).digest("hex");
      expect(digest, asset.file).toBe(asset.sha256);
    }
  });
});
