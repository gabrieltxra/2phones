import { DurableObject } from "cloudflare:workers";
import { actionSchema, type GameAction, type PlayerRole, type PublicRoomState, type RoomStatus } from "../shared/game";
import { parseCookies, randomToken, sha256 } from "./auth";
import type { Env } from "./env";
import { expectedFinalAnswer, ROOM_404_SOLUTIONS, simpleActionIsCorrect } from "./cases/room-404-private";
import { evidenceFor, hintFor, initialCardOrder, revisedCorrect } from './cases/room-404-investigation';

interface Workbench { order: string[]; flipped: string[]; examined: string[]; hints: number[]; drafts: Record<string,string[]>; analyzed: number[]; }
const emptyWorkbench = (): Workbench => ({order:[...initialCardOrder],flipped:[],examined:[],hints:[],drafts:{},analyzed:[]});

interface RoomPlayer {
  id: string;
  displayName: string;
  role: PlayerRole | null;
  tokenHash: string;
  joinedAt: number;
  lastSeen: number;
}

interface StoredRoom {
  caseVersion?: number;
  workbenches?: Record<string,Workbench>;
  code: string;
  status: RoomStatus;
  stage: number;
  players: RoomPlayer[];
  hostPlayerId: string;
  hostUserId: string | null;
  attempts: number;
  startedAt: number | null;
  completedAt: number | null;
  optionalEvidence: boolean;
  entitlement: boolean;
  votes: Record<string, string>;
  finalAnswers: Record<string, string>;
  callPath?: "ANSWERED" | "DECLINED";
  lastEvent?: string;
}

const progressByStage = [0, 5, 16, 27, 34, 47, 61, 73, 84, 92, 100];

export class GameRoom extends DurableObject<Env> {
  private room: StoredRoom | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  private async load() {
    if (!this.room) this.room = (await this.ctx.storage.get<StoredRoom>("room")) ?? null;
    return this.room;
  }

  private async save(event?: string, playerId?: string) {
    if (!this.room) return;
    if (event) this.room.lastEvent = event;
    await this.ctx.storage.put("room", this.room);
    await this.env.DB.prepare("UPDATE rooms SET status=?,progress=?,started_at=?,completed_at=?,last_activity_at=? WHERE code=?")
      .bind(this.room.status, progressByStage[this.room.stage] ?? 100, this.room.startedAt, this.room.completedAt, Date.now(), this.room.code).run();
    if (event) {
      await this.env.DB.prepare("INSERT INTO room_events (id,room_id,player_id,event_type,created_at) SELECT ?,id,?,?,? FROM rooms WHERE code=?")
        .bind(crypto.randomUUID(), playerId ?? null, event, Date.now(), this.room.code).run();
    }
    await this.broadcast();
  }

  private async playerFromRequest(request: Request) {
    const token = parseCookies(request.headers.get("Cookie")).tpom_room;
    if (!token || !this.room) return null;
    const tokenHash = await sha256(token);
    return this.room.players.find((player) => player.tokenHash === tokenHash) ?? null;
  }

  private connectedIds() {
    return new Set(this.ctx.getWebSockets().map((socket) => (socket.deserializeAttachment() as { playerId?: string } | null)?.playerId).filter(Boolean));
  }

  private view(player: RoomPlayer): PublicRoomState {
    if (!this.room) throw new Error("Room not initialized");
    const connected = this.connectedIds();
    const bench = this.room.workbenches?.[player.id] ?? emptyWorkbench();
    return {
      caseVersion: this.room.caseVersion ?? 1,
      investigation: this.room.caseVersion === 2 ? {
        evidence: evidenceFor(player.role, this.room.stage, this.room.optionalEvidence),
        hint: bench.hints.includes(this.room.stage) ? hintFor(this.room.stage) : undefined,
        hintUsed: bench.hints.includes(this.room.stage),
        order: player.role === 'ARCHIVE' ? bench.order : [], flipped: bench.flipped, examined: bench.examined,
        draft: bench.drafts[this.room.stage] ?? [],
        partnerAnalyzed: this.room.players.some(p => p.id !== player.id && this.room!.workbenches?.[p.id]?.analyzed.includes(this.room!.stage)),
      } : undefined,
      code: this.room.code,
      status: this.room.status,
      stage: this.room.stage,
      role: player.role,
      me: player.id,
      players: this.room.players.map((member) => ({
        id: member.id, displayName: member.displayName, role: member.role,
        connected: connected.has(member.id), joinedAt: member.joinedAt,
      })),
      progress: progressByStage[this.room.stage] ?? 100,
      attempts: this.room.attempts,
      startedAt: this.room.startedAt,
      completedAt: this.room.completedAt,
      optionalEvidence: this.room.optionalEvidence,
      waitingForPartner: (this.room.stage === 4 && Boolean(this.room.votes[player.id])) || (this.room.stage === 9 && Boolean(this.room.finalAnswers[player.id])),
      lastEvent: this.room.lastEvent,
      callPath: this.room.callPath,
      entitlement: this.room.entitlement,
    };
  }

  private async broadcast() {
    if (!this.room) return;
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as { playerId?: string } | null;
      const player = this.room.players.find((member) => member.id === attachment?.playerId);
      if (player && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "STATE", state: this.view(player) }));
    }
  }

  private response(data: unknown, status = 200, headers?: HeadersInit) {
    return Response.json(data, { status, headers });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    await this.load();

    if (url.pathname === "/create" && request.method === "POST") {
      if (this.room) return this.response({ error: "ROOM_EXISTS" }, 409);
      const body = await request.json<{ code: string; displayName: string; hostUserId?: string; owner?: boolean }>();
      const token = randomToken();
      const player: RoomPlayer = { id: crypto.randomUUID(), displayName: body.displayName, role: null, tokenHash: await sha256(token), joinedAt: Date.now(), lastSeen: Date.now() };
      this.room = { caseVersion: 2, workbenches: {}, code: body.code, status: "WAITING", stage: 0, players: [player], hostPlayerId: player.id, hostUserId: body.hostUserId ?? null, attempts: 0, startedAt: null, completedAt: null, optionalEvidence: false, entitlement: Boolean(body.owner), votes: {}, finalAnswers: {} };
      await this.ctx.storage.put("room", this.room);
      await this.env.DB.prepare("INSERT INTO room_players (id,room_id,display_name,reconnect_token_hash,joined_at,last_seen_at,connected) SELECT ?,id,?,?,?,?,0 FROM rooms WHERE code=?")
        .bind(player.id, player.displayName, player.tokenHash, player.joinedAt, player.lastSeen, body.code).run();
      return this.response({ state: this.view(player), token });
    }

    if (!this.room) return this.response({ error: "ROOM_NOT_FOUND" }, 404);

    if (url.pathname === "/join" && request.method === "POST") {
      if (this.room.players.length >= 2) return this.response({ error: "ROOM_FULL" }, 409);
      const body = await request.json<{ displayName: string }>();
      const token = randomToken();
      const player: RoomPlayer = { id: crypto.randomUUID(), displayName: body.displayName, role: null, tokenHash: await sha256(token), joinedAt: Date.now(), lastSeen: Date.now() };
      this.room.players.push(player);
      this.room.status = "READY";
      await this.env.DB.prepare("INSERT INTO room_players (id,room_id,display_name,reconnect_token_hash,joined_at,last_seen_at,connected) SELECT ?,id,?,?,?,?,0 FROM rooms WHERE code=?")
        .bind(player.id, player.displayName, player.tokenHash, player.joinedAt, player.lastSeen, this.room.code).run();
      await this.save("PARTNER_JOINED", player.id);
      return this.response({ state: this.view(player), token });
    }

    if (url.pathname === "/unlock" && request.method === "POST") {
      this.room.entitlement = true;
      if (this.room.stage === 3) { this.room.stage = 4; this.room.status = "PLAYING"; }
      await this.save("FULL_CASE_STARTED");
      return this.response({ ok: true });
    }

    if (url.pathname === "/reset" && request.method === "POST") {
      this.room.workbenches = {};
      this.room.stage = this.room.players.length === 2 ? 1 : 0;
      this.room.status = this.room.players.length === 2 ? "PLAYING" : "WAITING";
      this.room.attempts = 0; this.room.votes = {}; this.room.finalAnswers = {}; this.room.optionalEvidence = false; this.room.completedAt = null; this.room.startedAt = this.room.players.length === 2 ? Date.now() : null;
      await this.save("ROOM_RESET");
      return this.response({ ok: true });
    }

    const player = await this.playerFromRequest(request);
    if (!player) return this.response({ error: "UNAUTHORIZED" }, 401);
    player.lastSeen = Date.now();

    if (url.pathname === "/state") return this.response({ state: this.view(player) });

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("Expected WebSocket", { status: 426 });
      const pair = new WebSocketPair();
      const client = pair[0]; const server = pair[1];
      this.ctx.acceptWebSocket(server, [`player:${player.id}`]);
      server.serializeAttachment({ playerId: player.id });
      queueMicrotask(() => this.broadcast());
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/action" && request.method === "POST") {
      const parsed = actionSchema.safeParse(await request.json());
      if (!parsed.success) return this.response({ error: "INVALID_ACTION" }, 400);
      const result = await this.applyAction(player, parsed.data);
      if (!result.ok) return this.response({ error: result.error, state: this.view(player) }, result.status ?? 400);
      return this.response({ state: this.view(player) });
    }
    return this.response({ error: "NOT_FOUND" }, 404);
  }

  private async applyAction(player: RoomPlayer, action: GameAction): Promise<{ ok: boolean; error?: string; status?: number }> {
    if (!this.room) return { ok: false, error: "ROOM_NOT_FOUND", status: 404 };
    const value = action.value;
    if (action.type === "START") {
      if (this.room.stage !== 0 || this.room.status !== 'READY') return {ok:false,error:'ALREADY_STARTED'};
      if (player.id !== this.room.hostPlayerId) return { ok: false, error: "HOST_ONLY", status: 403 };
      if (this.room.players.length !== 2) return { ok: false, error: "NEED_PARTNER" };
      this.room.players[0].role = "ARCHIVE"; this.room.players[1].role = "FIELD";
      this.room.status = "PLAYING"; this.room.stage = 1; this.room.startedAt = Date.now();
      await this.env.DB.prepare("UPDATE room_players SET role=? WHERE id=?").bind("ARCHIVE", this.room.players[0].id).run();
      await this.env.DB.prepare("UPDATE room_players SET role=? WHERE id=?").bind("FIELD", this.room.players[1].id).run();
      await this.save("CASE_STARTED", player.id); return { ok: true };
    }
    if (this.room.status === "PAYWALL" && !(this.room.caseVersion === 2 && ['EXAMINE','FLIP'].includes(action.type))) return { ok: false, error: "PAYMENT_REQUIRED", status: 402 };

    if (!player.role || !['PLAYING','COMPLETED','PAYWALL'].includes(this.room.status)) return {ok:false,error:'INVALID_STATE'};
    if (this.room.caseVersion === 2 && ['HINT','REORDER','FLIP','EXAMINE','DRAFT','ANALYZE'].includes(action.type)) {
      const stage = this.room.stage;
      this.room.workbenches ??= {};
      const bench = this.room.workbenches[player.id] ??= emptyWorkbench();
      const earned = evidenceFor(player.role, stage, this.room.optionalEvidence);
      if (action.type === 'HINT' && hintFor(stage)) { if (!bench.hints.includes(stage)) bench.hints.push(stage); }
      else if (action.type === 'REORDER' && stage === 1 && player.role === 'ARCHIVE' && Array.isArray(value) && value.length === 4 && new Set(value).size === 4 && value.every(id => initialCardOrder.includes(id))) bench.order = value;
      else if ((action.type === 'FLIP' || action.type === 'EXAMINE') && typeof value === 'string' && earned.some(f => f.id === value)) {
        if (action.type === 'FLIP') bench.flipped = bench.flipped.includes(value) ? bench.flipped.filter(id => id !== value) : [...bench.flipped,value];
        if (!bench.examined.includes(value)) bench.examined.push(value);
      }
      else if (action.type === 'DRAFT' && Array.isArray(value) && value.length <= 4 && value.every(v => v.length <= 50)) bench.drafts[stage] = value;
      else if (action.type === 'ANALYZE' && hintFor(stage)) { if (!bench.analyzed.includes(stage)) bench.analyzed.push(stage); }
      else return {ok:false,error:'INVALID_ACTION'};
      await this.save(action.type === 'ANALYZE' ? 'PARTNER_ANALYZED' : undefined,player.id);
      return {ok:true};
    }

    let correct = false;
    let event = "";
    if (this.room.stage === 1 && action.type === "SUBMIT_CODE" && player.role === "FIELD") { correct = this.room.caseVersion === 2 ? revisedCorrect(1, player.role, action) : simpleActionIsCorrect(1, player.role, action); if (correct) { this.room.stage = 2; event = "PACKET_DECRYPTED"; } }
    else if (this.room.stage === 2 && action.type === "SUBMIT_CODE" && player.role === "ARCHIVE") { correct = this.room.caseVersion === 2 ? revisedCorrect(2, player.role, action) : simpleActionIsCorrect(2, player.role, action); if (correct) { this.room.stage = this.room.entitlement ? 4 : 3; this.room.status = this.room.entitlement ? "PLAYING" : "PAYWALL"; event = this.room.entitlement ? "FULL_CASE_STARTED" : "DEMO_COMPLETED"; } }
    else if (this.room.stage === 4 && action.type === "VOTE" && typeof value === "string") {
      this.room.votes[player.id] = value; correct = true;
      if (Object.keys(this.room.votes).length === 2) {
        if (Object.values(this.room.votes).every((vote) => vote === ROOM_404_SOLUTIONS.impossibleAlibi)) { this.room.stage = 5; event = "ALIBI_BROKEN"; }
        else { this.room.attempts += 1; this.room.votes = {}; event = "CONSENSUS_REJECTED"; }
      } else event = "ANSWER_LOCKED";
    }
    else if (this.room.stage === 5 && action.type === "CONFIRM_DIGIT" && player.role === "FIELD") { correct = this.room.caseVersion === 2 ? revisedCorrect(5, player.role, action) : simpleActionIsCorrect(5, player.role, action); if (correct) { this.room.stage = 6; event = "FALSE_INSTRUCTION_BROKEN"; } }
    else if (this.room.stage === 6 && action.type === "TRACE_PATH" && player.role === "FIELD") { correct = this.room.caseVersion === 2 ? revisedCorrect(6, player.role, action) : simpleActionIsCorrect(6, player.role, action); if (correct) { this.room.stage = 7; event = "PATH_RECONSTRUCTED"; } }
    else if (this.room.stage === 7 && action.type === "CALL_DECISION" && player.role === "ARCHIVE") { correct = this.room.caseVersion === 2 ? revisedCorrect(7,player.role,action) : simpleActionIsCorrect(7, player.role, action); if (correct) { this.room.callPath = value as "ANSWERED" | "DECLINED"; this.room.stage = 8; event = "CALL_COMPLETED"; } }
    else if (this.room.stage === 8 && action.type === "OPTIONAL_CODE") { correct = simpleActionIsCorrect(8, player.role, action); if (correct) { this.room.optionalEvidence = true; event = "OPTIONAL_EVIDENCE_FOUND"; } }
    else if (this.room.stage === 8 && action.type === "CONTINUE") { correct = true; this.room.stage = 9; event = "FINAL_DEDUCTION_READY"; }
    else if (this.room.stage === 9 && action.type === "FINAL_ANSWER" && (typeof value === "string" || Array.isArray(value))) {
      const expected = expectedFinalAnswer(player.role);
      this.room.finalAnswers[player.id] = Array.isArray(value) ? value.join('|') : value; correct = true; event = "ANSWER_LOCKED";
      if (Object.keys(this.room.finalAnswers).length === 2) {
        const room = this.room;
        const allCorrect = room.players.every((member) => room.caseVersion === 2 ? revisedCorrect(9,member.role,{type:'FINAL_ANSWER',value:room.finalAnswers[member.id].split('|')}) : room.finalAnswers[member.id] === expectedFinalAnswer(member.role));
        if (allCorrect) { this.room.stage = 10; this.room.status = "COMPLETED"; this.room.completedAt = Date.now(); event = "CASE_RECONSTRUCTED"; }
        else { this.room.attempts += 1; this.room.finalAnswers = {}; event = "DEDUCTION_INCOMPLETE"; }
      }
      void expected;
    }
    if (!correct) { this.room.attempts += 1; await this.save("WRONG_ANSWER", player.id); return { ok: false, error: "INCORRECT" }; }
    await this.save(event, player.id); return { ok: true };
  }

  async webSocketMessage(_socket: WebSocket, message: string | ArrayBuffer) {
    if (message === "state") await this.broadcast();
  }
  async webSocketClose(socket: WebSocket, code: number, reason: string, wasClean: boolean) {
    socket.close(code, reason);
    await this.broadcast();
    void wasClean;
  }
  async webSocketError(socket: WebSocket) {
    socket.close(1011, "WebSocket error");
  }
}
