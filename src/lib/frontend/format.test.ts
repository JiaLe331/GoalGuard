import { describe, expect, it } from "vitest";

import { formatDateInput, localCalendarDayEndUtc, localCalendarDayStartUtc } from "./format";

describe("local goal date formatting", () => {
  it("resolves calendar-day boundaries in the confirmed timezone", () => {
    expect(localCalendarDayStartUtc("2026-09-30", "Asia/Kuala_Lumpur")).toBe("2026-09-29T16:00:00.000Z");
    expect(localCalendarDayEndUtc("2026-09-30", "Asia/Kuala_Lumpur")).toBe("2026-09-30T15:59:59.999Z");
    expect(formatDateInput("2026-09-29T16:00:00.000Z", "Asia/Kuala_Lumpur")).toBe("2026-09-30");
  });

  it("uses the correct daylight-saving offset for a local day", () => {
    expect(localCalendarDayStartUtc("2026-11-01", "America/New_York")).toBe("2026-11-01T04:00:00.000Z");
    expect(localCalendarDayEndUtc("2026-11-01", "America/New_York")).toBe("2026-11-02T04:59:59.999Z");
  });
});
