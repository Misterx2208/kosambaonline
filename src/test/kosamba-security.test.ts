import { describe, expect, it } from "vitest";

import { managerPasswordMatches } from "@/lib/kosamba-security";

describe("Online Kosamba manager password", () => {
  it("accepts the configured password 2208 and rejects a different password", async () => {
    await expect(managerPasswordMatches("2208", "2208")).resolves.toBe(true);
    await expect(managerPasswordMatches("2209", "2208")).resolves.toBe(false);
  });
});