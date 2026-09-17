import { describe, expect, it } from "vitest";
import { actionSchema } from "../../shared/game";
import { ROOM_404_SOLUTIONS, simpleActionIsCorrect } from "../../worker/cases/room-404-private";

describe("server-only puzzle validation", () => {
  it("accepts answers only from the correct role", () => {
    expect(simpleActionIsCorrect(1,"FIELD",{type:"SUBMIT_CODE",value:ROOM_404_SOLUTIONS.fourCards})).toBe(true);
    expect(simpleActionIsCorrect(1,"ARCHIVE",{type:"SUBMIT_CODE",value:ROOM_404_SOLUTIONS.fourCards})).toBe(false);
    expect(simpleActionIsCorrect(2,"ARCHIVE",{type:"SUBMIT_CODE",value:ROOM_404_SOLUTIONS.voicemail})).toBe(true);
  });

  it("rejects wrong answers and order permutations", () => {
    expect(simpleActionIsCorrect(5,"FIELD",{type:"CONFIRM_DIGIT",value:"9"})).toBe(false);
    expect(simpleActionIsCorrect(6,"FIELD",{type:"TRACE_PATH",value:["C1","C4","C3","C2"]})).toBe(false);
    expect(simpleActionIsCorrect(6,"FIELD",{type:"TRACE_PATH",value:ROOM_404_SOLUTIONS.tracePath})).toBe(true);
  });

  it("validates the action envelope", () => {
    expect(actionSchema.safeParse({type:"START"}).success).toBe(true);
    expect(actionSchema.safeParse({type:"CHEAT",value:"3719"}).success).toBe(false);
  });
});
