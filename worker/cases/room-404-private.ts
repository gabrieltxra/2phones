import type { GameAction, PlayerRole } from "../../shared/game";

export const ROOM_404_SOLUTIONS = {
  fourCards: "3719",
  voicemail: "3042",
  impossibleAlibi: "OWEN_PIKE",
  manipulatedDigit: "6",
  tracePath: ["C1", "C3", "C4", "C2"],
  optionalOverride: "417",
  finalArchive: "OWEN_PIKE",
  finalField: "MAINTENANCE_PASSAGE",
} as const;

export function simpleActionIsCorrect(stage: number, role: PlayerRole | null, action: GameAction) {
  const value = action.value;
  if (stage === 1) return role === "FIELD" && action.type === "SUBMIT_CODE" && value === ROOM_404_SOLUTIONS.fourCards;
  if (stage === 2) return role === "ARCHIVE" && action.type === "SUBMIT_CODE" && value === ROOM_404_SOLUTIONS.voicemail;
  if (stage === 5) return role === "FIELD" && action.type === "CONFIRM_DIGIT" && value === ROOM_404_SOLUTIONS.manipulatedDigit;
  if (stage === 6) return role === "FIELD" && action.type === "TRACE_PATH" && Array.isArray(value) && value.join("") === ROOM_404_SOLUTIONS.tracePath.join("");
  if (stage === 7) return role === "ARCHIVE" && action.type === "CALL_DECISION" && (value === "ANSWERED" || value === "DECLINED");
  if (stage === 8 && action.type === "OPTIONAL_CODE") return value === ROOM_404_SOLUTIONS.optionalOverride;
  return false;
}

export const expectedFinalAnswer = (role: PlayerRole | null) => role === "ARCHIVE" ? ROOM_404_SOLUTIONS.finalArchive : ROOM_404_SOLUTIONS.finalField;
