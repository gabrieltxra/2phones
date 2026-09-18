import { z } from "zod";
import type { InvestigationView } from './investigation';

export const localeSchema = z.enum(["en-US", "pt-BR"]);
export type Locale = z.infer<typeof localeSchema>;
export const roleSchema = z.enum(["ARCHIVE", "FIELD"]);
export type PlayerRole = z.infer<typeof roleSchema>;
export const roomStatusSchema = z.enum(["WAITING", "READY", "PLAYING", "PAYWALL", "COMPLETED", "ABANDONED"]);
export type RoomStatus = z.infer<typeof roomStatusSchema>;

export const nodeTypeSchema = z.enum([
  "text_message", "system_message", "image_evidence", "document_evidence", "audio_evidence",
  "video_evidence", "choice", "keypad", "text_code", "multiple_choice", "reorder", "hotspot",
  "wait_for_partner", "simulated_call", "timed_event", "shared_reveal", "role_private_reveal", "final_deduction",
]);
export type NodeType = z.infer<typeof nodeTypeSchema>;

export const caseNodeSchema = z.object({
  id: z.string(), type: nodeTypeSchema, roles: z.array(roleSchema).optional(), shared: z.boolean().default(false),
  asset: z.string().optional(), delayMs: z.number().nonnegative().optional(),
});
export type CaseNode = z.infer<typeof caseNodeSchema>;

export const puzzleSchema = z.object({
  id: z.string(), stage: z.number().int().nonnegative(), inputRole: roleSchema.optional(), nodeType: nodeTypeSchema,
  checkpoint: z.boolean().optional(), paywallCheckpoint: z.boolean().optional(), optional: z.boolean().optional(),
  hint: z.object({ 'en-US': z.string(), 'pt-BR': z.string() }).optional(),
});
export type Puzzle = z.infer<typeof puzzleSchema>;

export const sceneSchema = z.object({ id: z.string(), nodes: z.array(caseNodeSchema), puzzle: puzzleSchema.optional() });
export const actSchema = z.object({ id: z.string(), scenes: z.array(sceneSchema) });
export const transitionSchema = z.object({ from: z.number(), to: z.number(), event: z.string() });
export const endingSchema = z.object({ id: z.string(), requiredStage: z.number(), badge: z.string() });
export const caseSchema = z.object({
  id: z.string(), slug: z.string(), version: z.number().int().positive(), title: z.string(), players: z.number().int(),
  durationMinutes: z.tuple([z.number(), z.number()]), priceCents: z.number().int(), currency: z.string(),
  freeCheckpoint: z.number(), acts: z.array(actSchema), transitions: z.array(transitionSchema), endings: z.array(endingSchema),
});
export type CaseDefinition = z.infer<typeof caseSchema>;

export interface PlayerView {
  id: string;
  displayName: string;
  role: PlayerRole | null;
  connected: boolean;
  joinedAt: number;
}

export interface PublicRoomState {
  caseVersion?: number;
  investigation?: InvestigationView;
  code: string;
  status: RoomStatus;
  stage: number;
  role: PlayerRole | null;
  me: string;
  players: PlayerView[];
  progress: number;
  attempts: number;
  startedAt: number | null;
  completedAt: number | null;
  optionalEvidence: boolean;
  waitingForPartner: boolean;
  lastEvent?: string;
  callPath?: "ANSWERED" | "DECLINED";
  entitlement: boolean;
}

export const actionSchema = z.object({
  type: z.enum(["START", "SUBMIT_CODE", "VOTE", "CONFIRM_DIGIT", "TRACE_PATH", "CALL_DECISION", "OPTIONAL_CODE", "CONTINUE", "FINAL_ANSWER", "HINT", "REORDER", "FLIP", "EXAMINE", "DRAFT", "ANALYZE"]),
  value: z.union([z.string(), z.array(z.string())]).optional(),
});
export type GameAction = z.infer<typeof actionSchema>;

export const ROOM_404_PUBLIC: CaseDefinition = caseSchema.parse({
  id: "case-room-404", slug: "room-404", version: 1, title: "ROOM 404", players: 2,
  durationMinutes: [25, 40], priceCents: 499, currency: "USD", freeCheckpoint: 3,
  acts: [
    { id: "act-1", scenes: [
      { id: "packet-sync", nodes: [{ id: "packet-connected", type: "system_message", shared: false }, { id: "maya-message", type: "text_message", shared: true }] },
      { id: "four-cards", nodes: [{ id: "cards", type: "document_evidence", roles: ["ARCHIVE"] }, { id: "note", type: "image_evidence", roles: ["FIELD"] }], puzzle: { id: "puzzle-1", stage: 1, inputRole: "FIELD", nodeType: "keypad" } },
      { id: "voicemail", nodes: [{ id: "field-audio", type: "audio_evidence", roles: ["FIELD"], asset: "/audio/rec-001.wav" }, { id: "field-notes", type: "document_evidence", roles: ["ARCHIVE"] }], puzzle: { id: "puzzle-2", stage: 2, inputRole: "ARCHIVE", nodeType: "keypad", paywallCheckpoint: true } },
    ] },
    { id: "act-2", scenes: [
      { id: "alibi", nodes: [{ id: "access-log", type: "document_evidence", roles: ["ARCHIVE"] }, { id: "statements", type: "document_evidence", roles: ["FIELD"] }], puzzle: { id: "puzzle-3", stage: 4, nodeType: "multiple_choice" } },
      { id: "paranoia", nodes: [{ id: "private-archive", type: "role_private_reveal", roles: ["ARCHIVE"] }, { id: "private-field", type: "role_private_reveal", roles: ["FIELD"] }], puzzle: { id: "puzzle-4", stage: 5, inputRole: "FIELD", nodeType: "text_code" } },
      { id: "trace", nodes: [{ id: "timeline", type: "document_evidence", roles: ["ARCHIVE"] }, { id: "map", type: "hotspot", roles: ["FIELD"] }], puzzle: { id: "puzzle-5", stage: 6, inputRole: "FIELD", nodeType: "reorder" } },
      { id: "call", nodes: [{ id: "unknown-call", type: "simulated_call", shared: false }], puzzle: { id: "puzzle-6", stage: 7, inputRole: "ARCHIVE", nodeType: "choice" } },
    ] },
    { id: "act-3", scenes: [
      { id: "passage", nodes: [{ id: "maintenance-map", type: "image_evidence", roles: ["FIELD"], asset: "/evidence/maintenance-passage.webp" }, { id: "work-order", type: "document_evidence", roles: ["ARCHIVE"] }], puzzle: { id: "optional-0417", stage: 8, nodeType: "text_code", optional: true } },
      { id: "deduction", nodes: [{ id: "final", type: "final_deduction", shared: false }], puzzle: { id: "puzzle-final", stage: 9, nodeType: "final_deduction" } },
      { id: "ending", nodes: [{ id: "maya-safe", type: "shared_reveal", shared: true }] },
    ] },
  ],
  transitions: [
    { from: 0, to: 1, event: "CASE_STARTED" }, { from: 1, to: 2, event: "PACKET_DECRYPTED" },
    { from: 2, to: 3, event: "SECURITY_BACKUP_UNLOCKED" }, { from: 3, to: 4, event: "CASE_UNLOCKED" },
    { from: 4, to: 5, event: "ALIBI_BROKEN" }, { from: 5, to: 6, event: "FALSE_INSTRUCTION_BROKEN" },
    { from: 6, to: 7, event: "PATH_RECONSTRUCTED" }, { from: 7, to: 8, event: "CALL_COMPLETED" },
    { from: 8, to: 9, event: "FINAL_DEDUCTION_READY" }, { from: 9, to: 10, event: "CASE_RECONSTRUCTED" },
  ],
  endings: [{ id: "case-solved", requiredStage: 10, badge: "DETECTIVE" }, { id: "clean-sweep", requiredStage: 10, badge: "CLEAN SWEEP" }],
});

export const visibleNodesForRole = (role: PlayerRole, stage: number) =>
  ROOM_404_PUBLIC.acts.flatMap((act) => act.scenes).filter((scene) => (scene.puzzle?.stage ?? (scene.id === 'ending' ? 10 : 0)) <= stage).flatMap((scene) => scene.nodes).filter((node) => node.shared || !node.roles || node.roles.includes(role));
