import { describe, expect, it } from "vitest";
import { directionOfTravel } from "@/lib/analytics";

describe("directionOfTravel (4-week rolling average)", () => {
  it("needs at least 5 scored weeks", () => {
    expect(directionOfTravel([3, 3, 3, 3])).toBe("insufficient");
  });

  it("flags improvement when recent 4 clearly beat the prior 4", () => {
    expect(directionOfTravel([2, 2, 2, 2, 3, 3.5, 3.5, 4])).toBe("improving");
  });

  it("flags decline the other way", () => {
    expect(directionOfTravel([4, 4, 4, 4, 3.5, 3, 3, 2.5])).toBe("declining");
  });

  it("small movement reads as flat", () => {
    expect(directionOfTravel([3, 3.1, 2.9, 3, 3.05, 3, 3.1, 2.95])).toBe("flat");
  });

  it("uses only the most recent 8 weeks", () => {
    // Ancient low scores must not drag the comparison.
    expect(directionOfTravel([1, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4])).toBe("flat");
  });
});
