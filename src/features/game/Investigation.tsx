import { useRef, useState, useEffect } from 'react';
import type { GameAction, PublicRoomState } from '../../../shared/game';
import type { EvidenceFile } from '../../../shared/investigation';
import { useI18n } from '../../i18n';
import './investigation.css';

type Props = {state: PublicRoomState; send: (action: GameAction) => Promise<void>};
const suspects = [['ADRIAN_VALE','Adrian Vale'],['OWEN_PIKE','Owen Pike'],['NAOMI_BROOKS','Naomi Brooks'],['ELI_REED','Eli Reed']];

function FileViewer({file,examined,onExamine}: {file:EvidenceFile;examined:boolean;onExamine:()=>void}) {
  const {locale} = useI18n(); const pt = locale === 'pt-BR';
  const [zoom,setZoom] = useState(false); const [playing,setPlaying] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => { void audio.current?.close(); }, []);
  const play = async () => {
    if (playing) { await audio.current?.suspend(); setPlaying(false); return; }
    await audio.current?.close();
    const context = new AudioContext(); audio.current = context; setPlaying(true);
    const duration = Math.max(1,file.pulses ?? 0) * .55;
    for (let i=0;i<(file.pulses ?? 0);i++) {
      const oscillator=context.createOscillator(); const gain=context.createGain();
      oscillator.frequency.value=580; gain.gain.value=.07; oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(context.currentTime+i*.55); oscillator.stop(context.currentTime+i*.55+.18);
    }
    // The last silent oscillator supplies an end event even for the silent fragment.
    const end=context.createOscillator(); end.start(); end.stop(context.currentTime+duration); end.onended=()=>setPlaying(false);
  };
  return <article className={`investigation-file ${file.kind ?? 'document'}`}>
    <div className="file-stamp">HALCYON · {file.id.toUpperCase()}</div>
    <h2>{file.title[locale]}</h2>
    {file.asset && <><button className="text-button" onClick={()=>setZoom(!zoom)} aria-expanded={zoom}>{pt?'AMPLIAR / REDUZIR':'ZOOM IN / OUT'}</button><div className={`inspection-photo ${zoom?'zoomed':''}`} tabIndex={0}><img src={file.asset} alt={file.title[locale]}/></div></>}
    {file.kind === 'audio' && <div className="clip-controls"><button className="button button-ghost" onClick={()=>void play()}>{playing ? (pt?'PAUSAR':'PAUSE') : (pt?'REPRODUZIR / REPETIR':'PLAY / REPLAY')}</button><span aria-hidden="true">{Array(file.pulses ?? 0).fill('▂▆▂').join('　') || '────────'}</span></div>}
    <p className="file-transcript">{file.body[locale]}</p>
    {file.back && <details><summary>{pt?'EXAMINAR VERSO':'EXAMINE BACK'}</summary><p className="file-transcript">{file.back[locale]}</p></details>}
    <button className="text-button" onClick={onExamine} disabled={examined}>{examined ? (pt?'✓ EXAMINADO':'✓ EXAMINED') : (pt?'MARCAR COMO EXAMINADO':'MARK EXAMINED')}</button>
  </article>;
}

export function Investigation({state,send}:Props) {
  const {locale,t} = useI18n(); const pt=locale==='pt-BR'; const view=state.investigation!;
  const [active,setActive]=useState<string>(''); const [board,setBoard]=useState(false); const [selected,setSelected]=useState('');
  const [code,setCode]=useState(''); const [busy,setBusy]=useState(false);
  const drag=useRef('');
  const act=async (action:GameAction) => { if(busy)return; setBusy(true); try {await send(action);} finally {setBusy(false);} };
  const current=view.evidence.filter(f=>f.stage===state.stage && !f.symbol);
  const opened=view.evidence.find(f=>f.id===active) ?? current[0];
  const draft=view.draft;
  const setDraft=(value:string[])=>void act({type:'DRAFT',value});
  const reorder=(id:string,target:string)=>{
    const order=[...view.order]; const from=order.indexOf(id); const to=order.indexOf(target);
    if(from<0||to<0||from===to)return; order.splice(from,1); order.splice(to,0,id); void act({type:'REORDER',value:order});
  };
  const inputRole = state.stage===1||state.stage===5||state.stage===6?'FIELD':'ARCHIVE';
  const codeLength=state.stage===5?1:state.stage===8?3:4;
  const needsCode=[1,2,5,8].includes(state.stage) && (state.role===inputRole||state.stage===8) && !(state.stage===8 && state.optionalEvidence);
  const choices=state.stage===9&&state.role==='FIELD' ? [['GUEST_ELEVATOR',t('stage.9.guest')],['WINDOW',t('stage.9.window')],['MAINTENANCE_PASSAGE',t('stage.9.passage')],['NEVER_LEFT',t('stage.9.never')]] : suspects;
  return <section className="investigation" aria-busy={busy}>
    <div className="investigation-tools"><button className="button button-ghost" onClick={()=>setBoard(!board)} aria-expanded={board}>{pt?'EVIDÊNCIAS':'EVIDENCE'} ({view.evidence.length})</button>{state.stage!==3 && state.stage!==10 && <button className="text-button" disabled={busy} onClick={()=>void act({type:'HINT'})}>{pt?'DICA':'HINT'}</button>}</div>
    {view.hint && <aside className="context-hint" role="note">{view.hint[locale]}</aside>}
    {view.partnerAnalyzed && <div className="analysis-event" role="status">{pt?'Seu parceiro concluiu a análise desta etapa. Comparem as conclusões.':'Your partner has completed this analysis. Compare your conclusions.'}</div>}
    {board && <nav className="evidence-index" aria-label={pt?'Arquivos descobertos':'Discovered files'}>{view.evidence.map(f=><button key={f.id} className={opened?.id===f.id?'selected':''} onClick={()=>{setActive(f.id);setBoard(false);}}>{view.examined.includes(f.id)?'✓ ':''}{f.title[locale]}<small>{String(f.stage).padStart(2,'0')} / {f.id}</small></button>)}</nav>}
    {state.stage===1 && state.role==='ARCHIVE' && <div className="card-workbench"><p>{pt?'Selecione dois cartões para trocar posições, use as setas ou arraste. Examine os versos.':'Select two cards to swap positions, use arrows, or drag. Examine the backs.'}</p><div className="card-row">{view.order.map((id,index)=>{
      const card=view.evidence.find(f=>f.id===id)!; const flipped=view.flipped.includes(id);
      return <article key={id} className={`manipulable-card ${selected===id?'selected':''}`} draggable={!busy} onDragStart={()=>{drag.current=id;}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();reorder(drag.current,id);}}>
        <button className="card-face" aria-pressed={selected===id} onClick={()=>{if(selected && selected!==id){const order=[...view.order];const a=order.indexOf(selected);[order[a],order[index]]=[order[index],order[a]];void act({type:'REORDER',value:order});setSelected('');}else setSelected(selected===id?'':id);}}>{flipped?<span className="card-back">{(card.back??card.body)[locale]}</span>:<><i>{card.symbol}</i><b>{card.digit}</b><small>{card.title[locale]}</small></>}</button>
        <div className="card-controls"><button disabled={busy||index===0} aria-label={`${pt?'Mover à esquerda':'Move left'} ${card.title[locale]}`} onClick={()=>reorder(id,view.order[index-1])}>←</button><button disabled={busy} onClick={()=>void act({type:'FLIP',value:id})}>{pt?'VIRAR':'FLIP'}</button><button disabled={busy||index===3} aria-label={`${pt?'Mover à direita':'Move right'} ${card.title[locale]}`} onClick={()=>reorder(id,view.order[index+1])}>→</button></div>
      </article>;
    })}</div></div>}
    <nav className="file-tabs" aria-label={pt?'Evidências desta etapa':'Current evidence'}>{current.map(f=><button key={f.id} className={opened?.id===f.id?'selected':''} onClick={()=>setActive(f.id)}>{f.title[locale]}</button>)}</nav>
    {opened && <FileViewer key={opened.id} file={opened} examined={view.examined.includes(opened.id)} onExamine={()=>void act({type:'EXAMINE',value:opened.id})}/>}
    {needsCode && <form className="investigation-terminal" onSubmit={e=>{e.preventDefault();void act({type:state.stage===5?'CONFIRM_DIGIT':state.stage===8?'OPTIONAL_CODE':'SUBMIT_CODE',value:code});}}><label htmlFor="terminal-code">{state.stage===8?(pt?'CÓDIGO OPCIONAL · 3 DÍGITOS':'OPTIONAL OVERRIDE · 3 DIGITS'):(pt?'VERIFICAR RECONSTRUÇÃO':'VERIFY RECONSTRUCTION')}</label><input id="terminal-code" inputMode="numeric" autoComplete="off" pattern={`[0-9]{${codeLength}}`} maxLength={codeLength} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/><button className="button button-primary" disabled={busy||code.length!==codeLength}>{t('game.submit')}</button></form>}
    {(state.stage===4||state.stage===9) && <div className="deduction-workbench"><h2>{state.stage===4?t('stage.4.question'):state.role==='ARCHIVE'?t('stage.9.archiveQ'):t('stage.9.fieldQ')}</h2><div className="choice-grid">{choices.map(([value,label])=><button disabled={busy||state.waitingForPartner} className={draft[0]===value?'selected':''} key={value} onClick={()=>setDraft([value,draft[1]??''])}>{label}</button>)}</div>{state.stage===9 && <label>{pt?'PROVA QUE SUSTENTA A CONCLUSÃO':'SUPPORTING PROOF'}<select aria-label={pt?'Prova':'Proof'} value={draft[1]??''} disabled={busy||state.waitingForPartner} onChange={e=>setDraft([draft[0]??'',e.target.value])}><option value="">{pt?'Selecione a referência':'Select reference'}</option>{(state.role==='ARCHIVE'?['TX-24','TX-17','TX-21']:['631','528','417']).map(v=><option key={v}>{v}</option>)}</select></label>}<button className="button button-primary full" disabled={busy||state.waitingForPartner||!draft[0]||(state.stage===9&&!draft[1])} onClick={()=>void act({type:state.stage===4?'VOTE':'FINAL_ANSWER',value:state.stage===4?draft[0]:draft})}>{state.waitingForPartner?t('game.waiting'):t('game.lock')}</button></div>}
    {state.stage===6 && state.role==='FIELD' && <div className="route-workbench"><p>{pt?'Monte a rota pelos horários corrigidos. Toque novamente para retirar um frame.':'Build the route using corrected times. Tap again to remove a frame.'}</p><div className="choice-grid">{current.map(f=><button key={f.id} disabled={busy} className={draft.includes(f.id)?'selected':''} onClick={()=>{setActive(f.id);setDraft(draft.includes(f.id)?draft.filter(id=>id!==f.id):[...draft,f.id]);}}>{f.id}{draft.includes(f.id)?` · ${draft.indexOf(f.id)+1}`:''}</button>)}</div><output>{draft.join(' → ') || '—'}</output><button className="button button-primary full" disabled={busy||draft.length!==4} onClick={()=>void act({type:'TRACE_PATH',value:draft})}>{t('game.submit')}</button></div>}
    {state.stage===7 && state.role==='ARCHIVE' && <div className="inline-actions"><button className="button button-ghost" disabled={busy} onClick={()=>void act({type:'CALL_DECISION',value:'DECLINED'})}>{t('stage.7.decline')}</button><button className="button button-primary" disabled={busy} onClick={()=>void act({type:'CALL_DECISION',value:'ANSWERED'})}>{t('stage.7.answer')}</button></div>}
    {state.stage===8 && <>{state.optionalEvidence&&<div className="analysis-event">{t('stage.8.found')}</div>}<button className="button button-ghost full" disabled={busy} onClick={()=>void act({type:'CONTINUE'})}>{t('stage.8.continue')}</button></>}
    {state.stage!==10 && state.stage!==3 && <button className="text-button analysis-button" disabled={busy} onClick={()=>void act({type:'ANALYZE'})}>{pt?'AVISAR PARCEIRO: ANÁLISE CONCLUÍDA':'NOTIFY PARTNER: ANALYSIS COMPLETE'}</button>}
  </section>;
}
