import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { useNavigate, useParams } from "react-router-dom";
import type { GameAction, PublicRoomState } from "../../shared/game";
import { Header } from "../components/Shell";
import { useI18n } from "../i18n";
import { api, track } from "../lib/api";
import { GameExperience } from "../features/game/GameExperience";

export function RoomPage({ joining = false }: { joining?: boolean }) {
  const { code: paramCode } = useParams(); const navigate = useNavigate(); const { t, locale } = useI18n();
  const [name, setName] = useState(""); const [state, setState] = useState<PublicRoomState | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(Boolean(paramCode && !joining)); const [copied,setCopied]=useState(false); const [qr,setQr]=useState("");
  const retry = useRef(0); const socket = useRef<WebSocket | null>(null);
  const code = paramCode?.toUpperCase();

  const load = useCallback(async () => { if (!code) return; try { const data=await api<{state:PublicRoomState}>(`/api/rooms/${code}/state`); setState(data.state); setError(null); } catch { if (!joining) setError("LOAD_FAILED"); } finally { setLoading(false); } },[code,joining]);
  useEffect(()=>{ if(code&&!joining) void load(); },[code,joining,load]);
  useEffect(()=>{ if(!state?.code)return; const invite=`${window.location.origin}/join/${state.code}`; void QRCode.toDataURL(invite,{width:220,margin:1,color:{dark:"#111414",light:"#eee9de"}}).then(setQr); },[state?.code]);
  useEffect(()=>{
    if(!state?.code||state.status==="COMPLETED")return;
    let closed=false; let timer:number|undefined;
    const connect=()=>{ const protocol=window.location.protocol==="https:"?"wss:":"ws:"; const ws=new WebSocket(`${protocol}//${window.location.host}/api/rooms/${state.code}/ws`); socket.current=ws; ws.onopen=()=>{retry.current=0;}; ws.onmessage=(event)=>{const payload=JSON.parse(event.data) as {type:string;state:PublicRoomState}; if(payload.type==="STATE")setState(payload.state);}; ws.onclose=()=>{if(!closed){retry.current+=1;timer=window.setTimeout(connect,Math.min(1000*2**retry.current,12000));}}; };
    connect(); return()=>{closed=true;if(timer)clearTimeout(timer);socket.current?.close();};
  },[state?.code,state?.status]);

  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(null); try { if(joining&&code){const data=await api<{state:PublicRoomState}>(`/api/rooms/${code}/join`,{method:"POST",body:JSON.stringify({displayName:name})});setState(data.state);track("partner_joined",locale,code);navigate(`/play/${code}`,{replace:true});}else{const data=await api<{state:PublicRoomState}>("/api/rooms",{method:"POST",body:JSON.stringify({displayName:name})});setState(data.state);track("room_created",locale,data.state.code);navigate(`/play/${data.state.code}`,{replace:true});}}catch(err){setError(err instanceof Error?err.message:"REQUEST_FAILED");}finally{setLoading(false);} };
  const send = useCallback(async(action:GameAction)=>{if(!state)return;setError(null);try{const data=await api<{state:PublicRoomState}>(`/api/rooms/${state.code}/action`,{method:"POST",body:JSON.stringify(action)});setState(data.state);}catch(err){setError(err instanceof Error?err.message:"ACTION_FAILED");}},[state]);

  if(loading&&!state)return <div className="loading-screen"><span className="scanner"/>OPENING SECURE PACKET…</div>;
  if(!state)return <div className="entry-page"><Header minimal/><main className="entry-main"><div className="entry-visual" style={{backgroundImage:"url('/evidence/room-404-door.webp')"}}><span className="rec">● REC · 00:17</span><div><small>{t("play.kicker")}</small><h1>ROOM<br/><b>404</b></h1><p>{t("case.tagline")}</p></div></div><form className="entry-form" onSubmit={submit}><p className="kicker">{joining?`${t("play.join")} · ${code}`:t("play.kicker")}</p><h1>{t("play.title")}</h1><p>{t("play.body")}</p><label>{t("play.name")}<input autoFocus autoComplete="nickname" value={name} onChange={(event)=>setName(event.target.value)} placeholder={t("play.placeholder")} minLength={1} maxLength={32} required/></label>{error&&<p className="form-error">{t("play.error")} <small>{error}</small></p>}<button className="button button-primary full" disabled={loading||!name.trim()}>{loading?"…":joining?t("play.join"):t("play.create")}</button><div className="secure-note"><span>◈</span><p>END-TO-END ROOM SESSION<small>No account · no email · secure reconnect</small></p></div></form></main></div>;

  if(state.stage>0)return <GameExperience state={state} send={send} error={error}/>;
  const isHost=state.me===state.players[0]?.id; const ready=state.players.length===2; const invite=`${window.location.origin}/join/${state.code}`;
  return <div className="lobby-page"><Header minimal/><main className="lobby-main"><div className="status-orbit"><span className={ready?"ready":""}><i/><i/></span></div><p className="kicker">{ready?t("lobby.ready"):t("lobby.wait")}</p><h1>{ready?t("lobby.titleReady"):t("lobby.titleWait")}</h1><p>{t("lobby.copy")}</p><div className="invite-panel"><div className="room-code"><small>{t("lobby.room")}</small><strong>{state.code}</strong></div>{qr&&<img src={qr} alt={`QR invite for room ${state.code}`}/>}<div className="invite-url"><span>{invite}</span><button onClick={async()=>{await navigator.clipboard.writeText(invite);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>{copied?t("lobby.copied"):t("lobby.copyLink")}</button></div></div><div className="player-slots">{[0,1].map(index=>{const player=state.players[index];return <div className={player?"filled":""} key={index}><span>{player?player.displayName:"—"}</span>{player&&player.id===state.me&&<small>{t("lobby.you")}</small>}<i/>{player?t("lobby.connected"):t("lobby.wait")}</div>;})}</div>{isHost?<button className="button button-primary start-case" disabled={!ready} onClick={()=>send({type:"START"})}>{t("lobby.start")} ↗</button>:<p className="host-note">{t("lobby.hostOnly")}</p>}</main></div>;
}
