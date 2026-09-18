import { describe, expect, it } from 'vitest';
import { evidenceFor, hintFor, investigationPuzzles, revisedCorrect } from '../../worker/cases/room-404-investigation';

const permutations = <T,>(items:T[]):T[][] => items.length ? items.flatMap((v,i)=>permutations(items.filter((_,j)=>j!==i)).map(rest=>[v,...rest])) : [[]];

describe('ROOM 404 investigative logic',()=>{
  it('has one card solution, with neither role sufficient alone',()=>{
    const rows=permutations(['moon','key','bell','eye']);
    const archive=(r:string[])=>r.indexOf('key')===r.indexOf('moon')+1 && Math.abs(r.indexOf('eye')-r.indexOf('moon'))!==1;
    const field=(r:string[])=>r.indexOf('eye')===r.indexOf('bell')+1;
    expect(rows.filter(archive).length).toBeGreaterThan(1);
    expect(rows.filter(field).length).toBeGreaterThan(1);
    const solutions=rows.filter(r=>archive(r)&&field(r)); expect(solutions).toHaveLength(1);
    const cards=evidenceFor('ARCHIVE',1);
    const code=solutions[0].map(id=>cards.find(f=>f.id===`card-${id}`)!.digit).join('');
    expect(revisedCorrect(1,'FIELD',{type:'SUBMIT_CODE',value:code})).toBe(true);
    expect(cards.filter(f=>f.symbol).map(f=>f.digit).join('')).not.toBe(code);
    expect(cards.find(f=>f.id==='card-eye')!.back).toBeDefined();
  });
  it('reconstructs the recorder by clock calibration including silence',()=>{
    const correction:Record<string,number>={K:-4,R:2,M:0,T:-1};
    const clips=evidenceFor('FIELD',2).filter(f=>f.pulses!==undefined);
    const ordered=clips.map(f=>({f,time:Number(f.body['en-US'].match(/00:(\d+)/)![1])+correction[f.id.slice(-1)]})).sort((a,b)=>a.time-b.time);
    expect(new Set(ordered.map(c=>c.time)).size).toBe(4);
    const value=ordered.map(c=>c.f.pulses).join('');
    expect(revisedCorrect(2,'ARCHIVE',{type:'SUBMIT_CODE',value})).toBe(true);
    expect(clips.map(f=>f.pulses).join('')).not.toBe(value);
  });
  it('leaves one authentic header and one hardware match',()=>{
    const headers=evidenceFor('ARCHIVE',5).find(f=>f.id==='packets')!.body['en-US'];
    const valid=[...headers.matchAll(/Packet (\d) · seal (\w+) · previous (\d+) · current (\d+)/g)].filter(m=>m[2]==='CLOSED' && Number(m[4])-Number(m[3])===1);
    expect(valid).toHaveLength(1);
    expect(revisedCorrect(5,'FIELD',{type:'CONFIRM_DIGIT',value:valid[0][1]})).toBe(true);
    const orders=evidenceFor('ARCHIVE',8).find(f=>f.id==='work-orders')!.body['en-US'];
    expect([...orders.matchAll(/Order (\d+) · brass latch · split-circle seal/g)].map(m=>m[1])).toEqual(['417']);
  });
  it('gives one corrected camera chronology instead of numerical camera order',()=>{
    const frames=evidenceFor('FIELD',6).filter(f=>/^C\d$/.test(f.id));
    const offset:Record<string,number>={C2:-6,C4:-8,C3:0,C1:3};
    const value=frames.map(f=>({id:f.id,time:Number(f.body['en-US'].match(/00:(\d+)/)![1])+offset[f.id]})).sort((a,b)=>a.time-b.time).map(f=>f.id);
    expect(permutations(value).filter(value=>revisedCorrect(6,'FIELD',{type:'TRACE_PATH',value}))).toHaveLength(1);
    expect(revisedCorrect(6,'FIELD',{type:'TRACE_PATH',value})).toBe(true);
  });
  it('requires call authentication and proof in both final claims',()=>{
    expect(revisedCorrect(7,'ARCHIVE',{type:'CALL_DECISION',value:'ANSWERED'})).toBe(false);
    expect(revisedCorrect(7,'ARCHIVE',{type:'CALL_DECISION',value:'DECLINED'})).toBe(true);
    for(const role of ['ARCHIVE','FIELD'] as const){
      const choices=role==='ARCHIVE'?['ADRIAN_VALE','OWEN_PIKE','NAOMI_BROOKS','ELI_REED']:['WINDOW','GUEST_ELEVATOR','MAINTENANCE_PASSAGE','NEVER_LEFT'];
      const proofs=role==='ARCHIVE'?['TX-17','TX-21','TX-24']:['417','528','631'];
      expect(choices.flatMap(c=>proofs.map(p=>[c,p])).filter(value=>revisedCorrect(9,role,{type:'FINAL_ANSWER',value}))).toHaveLength(1);
      for(const value of choices) expect(revisedCorrect(9,role,{type:'FINAL_ANSWER',value})).toBe(false);
    }
  });
  it('keeps all files role scoped, earned, localized and available later',()=>{
    for(const role of ['ARCHIVE','FIELD'] as const){
      const mine=evidenceFor(role,10); const other=evidenceFor(role==='ARCHIVE'?'FIELD':'ARCHIVE',10);
      expect(mine.some(f=>other.some(o=>f.id===o.id))).toBe(false);
      for(let stage=0;stage<=10;stage++){
        const earned=evidenceFor(role,stage);
        expect(earned.every(f=>f.stage<=stage)).toBe(true);
        expect(earned.every(f=>mine.some(m=>m.id===f.id))).toBe(true);
        for(const f of earned) for(const locale of ['en-US','pt-BR'] as const){expect(f.title[locale]).toBeTruthy();expect(f.body[locale]).toBeTruthy();}
      }
    }
    expect(evidenceFor(null,10)).toEqual([]);
    expect(evidenceFor('ARCHIVE',8).some(f=>f.id==='repair-note')).toBe(false);
    expect(evidenceFor('ARCHIVE',8,true).some(f=>f.id==='repair-note')).toBe(true);
  });
  it('has exactly one bilingual contextual hint per investigative step with no answer literals',()=>{
    expect(investigationPuzzles.map(p=>p.stage)).toEqual([1,2,4,5,6,7,8,9]);
    for(const puzzle of investigationPuzzles){
      expect(hintFor(puzzle.stage)).toEqual(puzzle.hint);
      for(const locale of ['en-US','pt-BR'] as const){
        const hint=puzzle.hint![locale]; expect(hint.length).toBeGreaterThan(40);
        for(const secret of ['2758','2031','Packet 4','Pacote 4','C3|C1|C2|C4','417','Owen','TX-17','MAINTENANCE_PASSAGE']) expect(hint).not.toContain(secret);
      }
    }
    expect(hintFor(3)).toBeUndefined();
  });
});
