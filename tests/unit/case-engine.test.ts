import { describe, expect, it } from "vitest";
import { ROOM_404_PUBLIC, caseSchema, visibleNodesForRole } from "../../shared/game";

describe("ROOM 404 case definition", () => {
  it("is valid, versioned, and complete", () => {
    expect(caseSchema.parse(ROOM_404_PUBLIC)).toEqual(ROOM_404_PUBLIC);
    expect(ROOM_404_PUBLIC.version).toBe(1);
    expect(ROOM_404_PUBLIC.acts).toHaveLength(3);
    expect(ROOM_404_PUBLIC.transitions.at(-1)).toMatchObject({ to: 10, event: "CASE_RECONSTRUCTED" });
  });

  it("never serializes correct solutions into the public definition", () => {
    const publicBundle = JSON.stringify(ROOM_404_PUBLIC);
    for (const secret of ["3719", "3042", "C1C3C4C2", "OWEN_PIKE", "MAINTENANCE_PASSAGE"]) expect(publicBundle).not.toContain(secret);
  });

  it("keeps role-private evidence private", () => {
    const archive = visibleNodesForRole("ARCHIVE", 99).map((node) => node.id);
    const field = visibleNodesForRole("FIELD", 99).map((node) => node.id);
    expect(archive).toContain("cards"); expect(archive).not.toContain("note");
    expect(field).toContain("note"); expect(field).not.toContain("cards");
    expect(archive).toContain("maya-message"); expect(field).toContain("maya-message");
  });

  it("has a contiguous authoritative transition chain", () => {
    expect(ROOM_404_PUBLIC.transitions.map((transition) => transition.from)).toEqual([0,1,2,3,4,5,6,7,8,9]);
    expect(ROOM_404_PUBLIC.transitions.map((transition) => transition.to)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });
});
