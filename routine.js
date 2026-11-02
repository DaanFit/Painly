'use strict';
// Daily routines share the existing Painly backup, but never alter pain entries.
window.PainlyDailyRoutine = function (api) {
  const {getData, save, toast, esc, today, nowTime, identifier, fmtDate, download} = api;
  const $ = s => document.querySelector(s);
  const scores = ['beforeLeft', 'beforeRight', 'afterLeft', 'afterRight'];
  const extraScores = ['afterIsoLeft','afterIsoRight','afterStepLeft','afterStepRight'];
  const duringScores=['duringIsoLeft','duringIsoRight','duringStepLeft','duringStepRight','duringSquatLeft','duringSquatRight'];
  const allScores=[...scores,...extraScores,...duringScores];
  let historyPeriod=30,visiblePage='routine',renderedDay=today();
  const steps = ['Check in', 'Isometric', 'Step downs', 'Deep squats', 'Check out'];
  const validScore = n => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10;
  const duration = n => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 3600;
  const weight = n => n===null || (typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=2000);
  const count = n => Number.isInteger(n) && n >= 0 && n <= 999;
  const blank = () => ({schema:3, settings:{seconds:45, appliedFrom:null, progressionResetDate:null, chime:true}, sessions:[], draft:null});
  let visible = false, audio = null, wakeLock = null, requestingWake = false, wakeAttempted = false;
  function validDraft(d) {
    const limit=d.timerType==='rest'?60:d.seconds;
    return d && typeof d.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && typeof d.time === 'string'
      && ['during','after'].includes(d.measurement) && weight(d.stepWeightKg) && weight(d.squatWeightKg)
      && typeof d.note==='string' && d.note.length<=2000
      && (d.totalMs===null || (Number.isFinite(d.totalMs)&&d.totalMs>=0))
      && (d.totalRunningSince===null || (Number.isFinite(d.totalRunningSince)&&d.totalRunningSince>=0))
      && ['totalStarted','totalFinished','totalPaused','resumeInterval','durationKnown'].every(k=>typeof d[k]==='boolean')
      && !(d.totalPaused&&d.totalRunningSince!==null)
      && duration(d.seconds) && Number.isInteger(d.phase) && d.phase >= 0 && d.phase <= 4
      && allScores.every(k => d[k] === null || validScore(d[k]))
      && ['leftReps','rightReps','squatReps'].every(k => d[k]===null || count(d[k]))
      && [1,3].includes(d.goalSets) && Number.isInteger(d.completedSets) && d.completedSets>=0 && d.completedSets<=d.goalSets
      && ['hold','rest'].includes(d.timerType) && typeof d.painStage==='boolean' && typeof d.early==='boolean'
      && typeof d.isoDone === 'boolean' && d.isoDone===(d.completedSets===d.goalSets) && typeof d.running === 'boolean'
      && Number.isFinite(d.remaining) && d.remaining >= 0 && d.remaining <= limit
      && Number.isFinite(d.endsAt) && d.endsAt >= 0;
  }
  function full(d) { return d.isoDone && d.leftReps >= 10 && d.rightReps >= 10 && d.squatReps >= 10 && !d.early; }
  function isoQualifies(d){return d.measurement==='during'&&d.isoDone&&d.goalSets===3&&['duringIsoLeft','duringIsoRight'].every(k=>validScore(d[k])&&d[k]<3);}
  function validateImport(raw) {
    if (!raw || ![1,2,3].includes(raw.schema) || !raw.settings || !duration(raw.settings.seconds)
      || !Array.isArray(raw.sessions) || raw.sessions.length > 10000) throw Error('Invalid daily routine data');
    const copy = JSON.parse(JSON.stringify(raw));
    if(raw.schema===1){
      const migrate=d=>({...d,goalSets:1,completedSets:d.isoDone?1:0,timerType:'hold',painStage:false,early:!(d.isoDone&&d.leftReps===10&&d.rightReps===10&&d.squatReps===10)&&d.phase===4,...Object.fromEntries(extraScores.map(k=>[k,null]))});
      copy.sessions=copy.sessions.map(migrate);copy.draft=copy.draft?migrate(copy.draft):null;copy.schema=2;
    }
    if(copy.schema===2){
      const upgrade=d=>({...d,measurement:'after',...Object.fromEntries(duringScores.map(k=>[k,null])),stepWeightKg:null,squatWeightKg:null,note:'',totalMs:null,totalRunningSince:null,totalStarted:false,totalFinished:false,totalPaused:false,resumeInterval:false,durationKnown:false});
      copy.sessions=copy.sessions.map(upgrade);copy.draft=copy.draft?upgrade(copy.draft):null;copy.schema=3;
    }
    if (!copy.sessions.every(d=>validDraft(d)&&!d.running&&d.totalRunningSince===null&&requiredScores(d).every(k=>validScore(d[k])))
      || (copy.draft!==null&&!validDraft(copy.draft))) throw Error('Invalid daily routine records');
    copy.settings = {seconds:raw.settings.seconds, appliedFrom:raw.schema===3&&typeof raw.settings.appliedFrom==='string'?raw.settings.appliedFrom:null,progressionResetDate:raw.schema===3&&dayIndex(raw.settings.progressionResetDate)!==null?raw.settings.progressionResetDate:null,chime:raw.settings.chime!==false};
    return copy;
  }
  if (getData().dailyRoutine) {
    try { getData().dailyRoutine = validateImport(getData().dailyRoutine); }
    catch { toast('Daily routine data could not be loaded. Export a backup before starting a new routine.'); }
  }
  const state = () => {const s=getData().dailyRoutine;return s && Array.isArray(s.sessions) && s.settings && duration(s.settings.seconds) ? s : blank();};
  // Commit with rollback, including on quota/storage errors. Failed edits do not look saved.
  function commit(change) {
    const previous = getData().dailyRoutine;
    let next;
    try { next = previous ? validateImport(previous) : blank(); }
    catch { toast('Export your backup before changing unreadable daily routine data.'); return false; }
    change(next); getData().dailyRoutine = next;
    if (save()) return true;
    getData().dailyRoutine = previous;
    return false;
  }
  const recent = () => [...state().sessions].reverse().sort((a,b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  const remaining = d => d.running ? Math.max(0, Math.ceil((d.endsAt - Date.now()) / 1000)) : d.remaining;
  const clock = n => `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`;
  function unlockAudio() {
    try { const A = window.AudioContext || window.webkitAudioContext; if (A) { audio = audio || new A(); audio.resume().catch(()=>{}); } } catch {}
  }
  function chime() {
    if (!state().settings.chime || document.visibilityState !== 'visible' || !audio) return;
    try {
      const t = audio.currentTime;
      for (let i=0;i<2;i++) {
        const o=audio.createOscillator(), g=audio.createGain(); o.frequency.value=i?660:523;
        g.gain.setValueAtTime(0.0001,t+i*.3); g.gain.exponentialRampToValueAtTime(.06,t+i*.3+.02);
        g.gain.exponentialRampToValueAtTime(.0001,t+i*.3+.3); o.connect(g).connect(audio.destination);
        o.start(t+i*.3); o.stop(t+i*.3+.32);
      }
    } catch {}
  }
  async function screenLock() {
    const need=visible && state().draft?.running && document.visibilityState==='visible';
    if (!need) { wakeAttempted=false; if(wakeLock) { wakeLock.release().catch(()=>{}); wakeLock=null; } return; }
    if (wakeLock || requestingWake || wakeAttempted || !navigator.wakeLock) return;
    requestingWake=true; wakeAttempted=true;
    try { wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>{wakeLock=null;}); }
    catch {} finally { requestingWake=false; }
    if (!visible || !state().draft?.running) { if(wakeLock) wakeLock.release().catch(()=>{}); wakeLock=null; }
  }
  function scoreFields(d, when) {
    return `<div class="routine-score-grid">${['Left','Right'].map(side=>{
      const key=when+side;
      const labels={before:'before routine',duringIso:'during isometrics',duringStep:'during step downs',duringSquat:'during deep squats',afterIso:'after isometrics (earlier routine)',afterStep:'after step downs (earlier routine)',after:'after deep squats (earlier routine)'};
      return `<div class="form-field"><label for="routine-${key}">${side} knee · ${labels[when]}</label><select class="select" id="routine-${key}" data-routine-score="${key}"><option value="">Choose pain score</option>${Array.from({length:11},(_,n)=>`<option value="${n}" ${d[key]===n?'selected':''}>${n} / 10${n===0?' · No pain':''}</option>`).join('')}</select></div>`;
    }).join('')}</div>`;
  }
  function controls(key, label, n) {
    return `<div class="form-field"><label for="routine-${key}">${label} · repetitions completed</label><input class="input" id="routine-${key}" data-routine-reps="${key}" type="number" min="0" max="999" step="1" inputmode="numeric" placeholder="e.g. 10" value="${n??''}"><p class="hint">Target: 10. Enter the number you actually did.</p></div>`;
  }
  function requiredScores(d){
    if(d.measurement==='after')return scores;
    const keys=['beforeLeft','beforeRight'];
    if(!d.early||d.completedSets>0)keys.push('duringIsoLeft','duringIsoRight');
    if(!d.early||d.leftReps>0||d.rightReps>0)keys.push('duringStepLeft','duringStepRight');
    if(!d.early||d.squatReps>0)keys.push('duringSquatLeft','duringSquatRight');
    return keys;
  }
  function dayIndex(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date)))return null;
    const ms=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==date)return null;
    return Math.floor(ms/86400000);
  }
  const dateAt=n=>new Date(n*86400000).toISOString().slice(0,10);
  function progression(){
    const groups=new Map(),now=dayIndex(today()),reset=dayIndex(state().settings.progressionResetDate);
    for(const d of recent()){
      const n=dayIndex(d.date);if(d.measurement!=='during'||n===null||n>now||(reset!==null&&n<=reset))continue;
      if(!groups.has(n))groups.set(n,[]);groups.get(n).push(d);
    }
    const passes=n=>{const list=groups.get(n);return list?.some(isoQualifies)&&!list.some(d=>['duringIsoLeft','duringIsoRight'].some(k=>validScore(d[k])&&d[k]>=3)||(d.isoDone&&!['duringIsoLeft','duringIsoRight'].every(k=>validScore(d[k]))));};
    let end=groups.has(now)?now:now-1,count=0;
    const days=[];while(count<4&&passes(end-count)){days.push(end-count);count++;}
    const key=count===4?days.map(n=>dateAt(n)+':'+groups.get(n).map(d=>d.id).sort().join(',')).join('|'):null;
    return {count,days,key,ready:count===4,nextSeconds:state().settings.seconds+15};
  }
  function elapsed(d){return (d.totalMs||0)+(d.totalRunningSince!==null?Math.max(0,Date.now()-d.totalRunningSince):0);}
  function elapsedClock(ms){const n=Math.floor(ms/1000),h=Math.floor(n/3600);return h?`${String(h).padStart(2,'0')}:${clock(n%3600)}`:clock(n);}
  function stopTotal(d){d.totalMs=elapsed(d);d.totalRunningSince=null;d.totalFinished=true;d.totalPaused=false;d.resumeInterval=false;}
  function totalHTML(d){
    return `<div class="routine-total"><div><span class="eyebrow">TOTAL WORKOUT</span><strong id="routineTotalClock" role="timer">${elapsedClock(elapsed(d))}</strong><span class="hint">${d.totalFinished?'Training finished · notes do not add time':d.totalPaused?'Workout paused':d.totalStarted?'Includes rests and time between exercises':'Starts with your first isometric hold'}${!d.durationKnown?' · earlier time unavailable':''}</span></div>${d.totalStarted&&!d.totalFinished?`<button type="button" class="btn secondary small" data-routine="${d.totalPaused?'workout-resume':'workout-pause'}">${d.totalPaused?'Resume workout':'Pause workout'}</button>`:''}</div>`;
  }
  function weightField(key,label,value){return `<div class="form-field"><label for="routine-${key}">${label} · added weight (kg)</label><input class="input" id="routine-${key}" data-routine-weight="${key}" type="number" min="0" max="2000" step="any" inputmode="decimal" value="${value??''}" placeholder="0"><p class="hint">0 kg = bodyweight only.${key==='stepWeightKg'?' Same added weight for both legs.':''}</p></div>`;}
  function painTable(d){
    const row=(label,prefix)=>`<tr><th scope="row">${label}</th><td>${d[prefix+'Left']??'—'}</td><td>${d[prefix+'Right']??'—'}</td></tr>`;
    const legacy=d.measurement==='after';
    return `<div class="routine-pain-table"><table><caption>Knee pain · 0–10${legacy?' · earlier after-exercise scores':''}</caption><thead><tr><th scope="col">Measurement</th><th scope="col">Left</th><th scope="col">Right</th></tr></thead><tbody>${row('Before routine','before')}${row(legacy?'After isometrics':'During isometrics',legacy?'afterIso':'duringIso')}${row(legacy?'After step downs':'During step downs',legacy?'afterStep':'duringStep')}${row(legacy?'After deep squats':'During deep squats',legacy?'after':'duringSquat')}</tbody></table></div>`;
  }
  function summary(d){return `<div class="routine-summary"><span>Isometrics: ${d.completedSets}/${d.goalSets} sets × ${d.seconds} sec${d.goalSets>1?' · 60 sec rest between sets':' · earlier single-set routine'}</span><span>Step downs: left ${d.leftReps??0} · right ${d.rightReps??0} reps · ${d.stepWeightKg===null?'weight not recorded':d.stepWeightKg+' kg added'}</span><span>Deep squats: ${d.squatReps??0} reps · ${d.squatWeightKg===null?'weight not recorded':d.squatWeightKg+' kg added'}</span><span>Total training time: ${d.durationKnown?elapsedClock(elapsed(d)):'not recorded in this earlier routine'}</span></div>`;}
  function proposalHTML(){
    const p=progression();
    return `<div class="notice" id="routineProposal"><strong>${p.ready?'Four consecutive days below 3/10':`${p.count} / 4 consecutive days`}</strong><p class="hint">Both knees during isometrics only. Scores 0, 1 or 2 qualify. A missing day or score of 3 or higher breaks the run. If you save multiple routines on one day, the highest recorded isometric scores count.</p><div class="routine-streak" aria-label="${p.count} of 4 qualifying days">${[1,2,3,4].map(n=>`<span class="${p.count>=n?'done':''}">${p.count>=n?'✓':n}</span>`).join('')}</div>${p.ready&&duration(p.nextSeconds)?`<button type="button" class="btn secondary small" data-routine="accept" ${state().draft?'disabled':''}>Use ${p.nextSeconds} seconds next time</button>`:''}<p class="hint">${state().settings.progressionResetDate?'Days used for your last accepted increase are not reused. ':''}Your personal tracking rule. You choose your own duration; it never changes automatically.</p></div>`;
  }
  function activeHTML(d) {
    let body='';
    if(d.phase===0) body=`<h2>Before you begin</h2><p class="sub">Rate both knees before the whole routine. Empty scores are never treated as zero.</p>${scoreFields(d,'before')}<button type="button" class="btn full" data-routine="next" ${!['beforeLeft','beforeRight'].every(k=>validScore(d[k]))?'disabled':''}>Continue to isometric →</button>`;
    if(d.phase===1) {
      const rest=d.timerType==='rest',total=rest?60:d.seconds;
      body=`<h2>${rest?'Rest between sets':'Isometric holds'}</h2><p class="sub">${d.goalSets} sets × ${d.seconds} seconds · 60 seconds rest between sets.</p><div class="routine-set-dots" aria-label="${d.completedSets} of ${d.goalSets} sets complete">${Array.from({length:d.goalSets},(_,i)=>`<span class="${i<d.completedSets?'done':''}">${i<d.completedSets?'✓':'Set '+(i+1)}</span>`).join('')}</div><div class="routine-clock" id="routineClock" role="timer" aria-label="Time remaining">${clock(remaining(d))}</div><p class="routine-timer-status" id="routineTimerStatus" role="status">${d.isoDone?'All isometric sets complete. Record your pain when ready.':rest?(d.running?'Resting — next set starts only when you press Start.':'Rest paused.'):(d.running?`Holding · set ${d.completedSets+1} of ${d.goalSets}`:d.remaining<d.seconds?'Hold paused.':`Ready for set ${d.completedSets+1} of ${d.goalSets}.`)}</p><div class="med-progress"><div class="med-progress-fill" id="routineFill" style="width:${(1-remaining(d)/total)*100}%"></div></div><div class="button-row routine-timer-buttons"><button type="button" class="btn" data-routine="start" ${d.running||d.isoDone?'disabled':''}>${d.remaining<total?'Resume':rest?'Resume rest':`Start set ${d.completedSets+1}`}</button><button type="button" class="btn secondary" data-routine="pause" ${!d.running?'disabled':''}>Pause</button><button type="button" class="btn ghost" data-routine="reset" ${d.isoDone?'disabled':''}>Reset ${rest?'rest':'hold'}</button></div><button type="button" class="btn full" data-routine="next" style="margin-top:18px" ${!d.isoDone?'disabled':''}>Done — record pain →</button><p class="hint">Keep Painly open. Rest starts automatically after sets 1 and 2. You start each hold yourself.</p>`;
    }
    if(d.phase===2) body=`<h2>Step downs</h2><p class="sub">Target: 10 per leg. Fill in the repetitions you completed, then tap Done.</p>${controls('leftReps','Left leg',d.leftReps)}${controls('rightReps','Right leg',d.rightReps)}${weightField('stepWeightKg','Step downs',d.stepWeightKg)}<button type="button" class="btn full" data-routine="next" ${!['leftReps','rightReps'].every(k=>count(d[k]))?'disabled':''}>Done — record pain →</button>`;
    if(d.phase===3) body=`<h2>Deep squats</h2><p class="sub">Target: 10 repetitions. Enter what you completed.</p>${controls('squatReps','Deep squats',d.squatReps)}${weightField('squatWeightKg','Deep squats',d.squatWeightKg)}<button type="button" class="btn full" data-routine="next" ${!count(d.squatReps)?'disabled':''}>Done — record pain →</button>`;
    if(d.painStage&&[1,2].includes(d.phase)){
      const prefix=d.measurement==='during'?(d.phase===1?'duringIso':'duringStep'):(d.phase===1?'afterIso':'afterStep'),name=d.phase===1?'isometrics':'step downs';
      body=`<h2>${d.measurement==='during'?'Pain during':'After'} ${name}</h2><p class="sub">${d.measurement==='during'?'How much pain did you feel during this exercise block? Rate each knee.':'How did both knees feel after this earlier exercise?'}</p>${scoreFields(d,prefix)}<button type="button" class="btn full" data-routine="next" ${!['Left','Right'].every(side=>validScore(d[prefix+side]))?'disabled':''}>Continue to ${d.phase===1?'step downs':'deep squats'} →</button>`;
    }
    if(d.phase===4){
      let pain='';
      if(d.measurement==='after')pain=scoreFields(d,'after');
      else if(!d.early)pain=scoreFields(d,'duringSquat');
      else for(const [prefix,performed] of [['duringIso',d.completedSets>0],['duringStep',d.leftReps>0||d.rightReps>0],['duringSquat',d.squatReps>0]])if(performed&&['Left','Right'].some(side=>!validScore(d[prefix+side])))pain+=scoreFields(d,prefix);
      body=`<h2>${d.early?'Finish your routine':d.measurement==='during'?'Pain during deep squats':'After deep squats'}</h2><p class="sub">${d.early?'This partial routine will keep only the exercises and scores you recorded.':d.measurement==='during'?'How much pain did you feel during the squats? The workout timer has stopped.':'Record the final scores for your earlier routine.'}</p>${pain}<div class="form-field"><label for="routineNote">Workout note <span class="hint">(optional)</span></label><textarea class="textarea" id="routineNote" maxlength="2000" placeholder="How did the session feel? Anything to remember?">${esc(d.note)}</textarea><div class="hint">Saved with this routine.</div></div>${summary(d)}${painTable(d)}<button type="button" class="btn full" data-routine="save" ${!requiredScores(d).every(k=>validScore(d[k]))?'disabled':''}>Save ${full(d)?'morning':'partial'} routine ✓</button>`;
    }
    return `<section class="card"><div class="routine-session-heading"><span class="badge">${esc(fmtDate(d.date))} · ${esc(d.time)}</span><span class="hint">Progress saved on this device</span></div><ol class="routine-steps" aria-label="Routine steps">${steps.map((name,i)=>`<li class="${d.phase===i?'current':d.phase>i?'past':''}" ${d.phase===i?'aria-current="step"':''}><span>${i+1}</span>${name}</li>`).join('')}</ol>${totalHTML(d)}<fieldset class="routine-stage" ${d.totalPaused?'disabled':''}>${body}</fieldset><div class="routine-bottom">${d.phase>0&&d.phase<4?'<button type="button" class="linkbtn" data-routine="early">Finish early & record pain</button>':''}<button type="button" class="linkbtn dangertext" data-routine="discard">Discard this routine</button></div></section>`;
  }
  function historyHTML(list){
    return `<section class="card"><div class="history-head"><div><h2>Your routines</h2><p class="sub">Times, weights, repetitions and pain during each exercise.</p></div><button type="button" class="btn secondary small" data-routine="export" ${!state().sessions.length?'disabled':''}>Export routine CSV</button></div>${list.length?list.map(d=>`<article class="entry"><div class="entry-header"><strong>${esc(fmtDate(d.date))} · ${esc(d.time)}</strong><span class="badge">${full(d)?'Complete':'Partial'}</span></div>${summary(d)}${painTable(d)}${d.note?`<div class="routine-note"><strong>Workout note</strong><p>${esc(d.note)}</p></div>`:''}${d.measurement==='after'?'<p class="hint">Earlier after-exercise measurements are preserved. They do not count as pain-during scores in the graph or four-day rule.</p>':''}<button type="button" class="linkbtn dangertext" data-routine="delete" data-id="${esc(d.id)}">Delete routine</button></article>`).join(''):'<div class="empty">No routines saved in this period.</div>'}</section>`;
  }
  function isoChart(list){
    const grouped=new Map();
    for(const d of list){if(d.measurement!=='during')continue;let day=grouped.get(d.date);if(!day){day={date:d.date,left:null,right:null};grouped.set(d.date,day);}for(const side of ['Left','Right'])if(validScore(d['duringIso'+side]))day[side.toLowerCase()]=Math.max(day[side.toLowerCase()]??0,d['duringIso'+side]);}
    const days=[...grouped.values()].filter(d=>d.left!==null||d.right!==null).sort((a,b)=>a.date.localeCompare(b.date));
    if(!days.length)return '<div class="empty">Your graph starts when you record pain during isometrics. Earlier after-exercise scores stay in the history below.</div>';
    const from=dayIndex(days[0].date),to=dayIndex(days.at(-1).date),span=Math.max(1,to-from);
    const x=d=>from===to?180:35+(dayIndex(d.date)-from)/span*290,y=n=>200-n*17;
    const grid=[0,2,4,6,8,10].map(n=>`<line x1="35" x2="325" y1="${y(n)}" y2="${y(n)}" stroke="var(--line)"/><text x="18" y="${y(n)+4}" text-anchor="end" fill="var(--muted)" font-size="12">${n}</text>`).join('');
    const series=['left','right'].map((side,i)=>{const colour=i?'var(--routine-right)':'var(--routine-left)';let prev=null;return days.map(d=>{if(d[side]===null){prev=null;return '';}let line=prev&&dayIndex(d.date)-dayIndex(prev.date)===1?`<line x1="${x(prev)}" y1="${y(prev[side])}" x2="${x(d)}" y2="${y(d[side])}" stroke="${colour}" stroke-width="3"/>`:'';prev=d;return line+`<circle cx="${x(d)}" cy="${y(d[side])}" r="${i?4:6}" fill="${colour}" stroke="var(--panel)" stroke-width="1.5"><title>${esc(d.date)} · ${side} knee: ${d[side]}/10</title></circle>`;}).join('');}).join('');
    return `<svg class="graph" viewBox="0 0 360 245" role="img" aria-label="Daily highest pain during isometrics, left and right knee, from ${esc(days[0].date)} to ${esc(days.at(-1).date)}">${grid}<line x1="35" x2="325" y1="${y(3)}" y2="${y(3)}" stroke="var(--muted)" stroke-dasharray="5 5"/><text x="332" y="${y(3)+4}" fill="var(--muted)" font-size="11">3</text>${series}<text x="35" y="230" fill="var(--muted)" font-size="12">${esc(fmtDate(days[0].date))}</text>${from!==to?`<text x="325" y="230" text-anchor="end" fill="var(--muted)" font-size="12">${esc(fmtDate(days.at(-1).date))}</text>`:''}</svg><div class="graph-legend"><span class="legend-item"><i class="legend-dot" style="background:var(--routine-left)"></i>Left knee</span><span class="legend-item"><i class="legend-dot" style="background:var(--routine-right)"></i>Right knee</span></div>`;
  }
  function renderHistory(){
    const now=dayIndex(today()),list=recent().filter(d=>{const n=dayIndex(d.date);return n!==null&&n<=now&&(historyPeriod===0||n>=now-historyPeriod+1);});
    return `<div class="fullstack"><section class="card"><div class="history-head"><div><h2>Pain during isometrics</h2><p class="sub">Daily highest score for each knee.</p></div><span class="badge">0–10 pain scale</span></div><div class="period-controls" aria-label="Routine history period">${[[7,'7 days'],[30,'30 days'],[90,'3 months'],[365,'1 year'],[0,'All']].map(([n,label])=>`<button type="button" class="period-btn ${n===historyPeriod?'active':''}" data-routine="period" data-days="${n}" aria-pressed="${n===historyPeriod}">${label}</button>`).join('')}</div><div class="graph-wrap">${isoChart(list)}</div><p class="hint">Only measured pain-during scores are plotted. Missing days are not zero and gaps are left unconnected.</p></section><section class="card"><h2>Your four-day progress</h2><p class="sub">This progress is based on your latest days, independently of the history filter.</p>${proposalHTML()}</section>${historyHTML(list)}</div>`;
  }
  function render() {
    const s=state(), list=recent(), dates=new Set(list.filter(full).map(d=>d.date));
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-6);const min=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
    const week=[...dates].filter(d=>d>=min&&d<=today()).length;
    return `<div class="fullstack"><div class="columns"><div class="fullstack">${s.draft?activeHTML(s.draft):`<section class="card"><span class="eyebrow">YOUR MORNING CHECK-IN</span><h2 style="margin-top:8px">Your morning knee routine</h2><p class="sub">Three isometric holds with 60 seconds rest, then step downs and deep squats. Record pain before the routine and pain felt during each exercise block.</p><div class="routine-plan"><div><span>01</span><strong>Isometric</strong><small>3 × ${s.settings.seconds} sec<br>60 sec rest</small></div><div><span>02</span><strong>Step downs</strong><small>10 per leg</small></div><div><span>03</span><strong>Deep squats</strong><small>10 repetitions</small></div></div><div style="margin-bottom:18px"><button type="button" class="btn full" data-routine="new" style="margin-top:20px">${dates.has(today())?'Start another routine today':'Start morning routine'} →</button></div>${proposalHTML()}<div class="form-field"><label for="routineSeconds">Isometric timer · seconds per set</label><div class="routine-duration"><input class="input" type="number" min="1" max="3600" step="1" inputmode="numeric" id="routineSeconds" value="${s.settings.seconds}"><button type="button" class="btn secondary" data-routine="duration">Save time</button></div><div class="med-choices">${[45,60,90,120].map(n=>`<button type="button" class="med-duration ${s.settings.seconds===n?'chosen':''}" data-routine="preset" data-seconds="${n}" aria-pressed="${s.settings.seconds===n}">${n} sec</button>`).join('')}</div></div><label class="med-quiet"><input type="checkbox" id="routineChime" ${s.settings.chime?'checked':''}> Finish sound while Painly is open</label><p class="hint">Your last chosen time is remembered. You start each exercise yourself.</p></section>`}</div><aside class="card"><span class="eyebrow">ONE DAY AT A TIME</span><h2 style="margin-top:9px">Your routine overview</h2><div class="stat-grid"><div class="stat"><strong>${week}<small style="font-size:14px"> / 7</small></strong><span>days completed · past 7 days</span></div><div class="stat"><strong>${list.filter(full).length}</strong><span>complete routines</span></div></div><div class="notice"><strong>${dates.has(today())?'✓ Today’s routine completed':'Today is ready for your check-in'}</strong><div class="hint">${s.draft?'An unfinished routine is saved. Pick up where you left off.':'Each routine records your own timer setting and pain during each exercise, weights and a workout note.'}</div></div><div class="settings-box"><h3>Your +15 second rule</h3><p class="sub" style="margin:0">Both knees during isometrics must be below 3/10 on four consecutive calendar days. Before-routine, step-down and squat scores do not affect this rule. You confirm any increase yourself.</p></div><p class="hint">This is your tracking rule, not a medical assessment or an automatic training prescription.</p><p class="hint">Settings → Download backup (JSON) includes your routines and timer settings.</p></aside></div><button type="button" class="btn secondary full" data-action="goto" data-page="history">View routine history & progress →</button></div>`;
  }
  function setDuration(n) {
    if(!duration(n))return toast('Choose a whole number from 1 to 3600 seconds.');
    if(commit(s=>{s.settings.seconds=n;s.settings.appliedFrom=null;})){api.render();toast('Timer setting saved.');}
  }
  function finishTick() {
    if(renderedDay!==today()){renderedDay=today();if(visiblePage==='routine'||visiblePage==='history')api.render();}
    const d=state().draft;
    if(visible&&d&&$('#routineTotalClock'))$('#routineTotalClock').textContent=elapsedClock(elapsed(d));
    // Only rests start automatically; a hold always needs an explicit Start tap.
    let transitions=0;
    while(state().draft?.running&&remaining(state().draft)===0&&transitions++<2){
      const end=state().draft.endsAt;
      if(!commit(s=>{const x=s.draft;
        if(x.timerType==='hold'){
          x.completedSets++;x.isoDone=x.completedSets===x.goalSets;
          if(x.isoDone){x.running=false;x.endsAt=0;x.remaining=0;}
          else {x.timerType='rest';x.remaining=60;x.endsAt=end+60000;x.running=true;}
        }else{x.timerType='hold';x.running=false;x.endsAt=0;x.remaining=x.seconds;}
      }))break;
      chime();if(visible)api.render();
    }
    if(visible&&state().draft?.phase===1){
      const x=state().draft,n=remaining(x);
      if($('#routineClock'))$('#routineClock').textContent=clock(n);
      if($('#routineFill'))$('#routineFill').style.width=`${(1-n/(x.timerType==='rest'?60:x.seconds))*100}%`;
    }
    screenLock();
  }
  function stageReady(){
    const d=state().draft;if(!d)return false;
    if([...document.querySelectorAll('.routine-stage input')].some(e=>!e.checkValidity()))return false;
    return d.phase===2?count(d.leftReps)&&count(d.rightReps):count(d.squatReps);
  }
  function exportCSV(){
    const cols=['Date','Time','Measurement type','Seconds per isometric set','Sets completed','Sets planned','Step downs left','Step downs right','Step downs added kg','Deep squats','Squats added kg','Total seconds','Before left','Before right','During isometrics left','During isometrics right','During step downs left','During step downs right','During squats left','During squats right','Earlier after isometrics left','Earlier after isometrics right','Earlier after step downs left','Earlier after step downs right','Earlier after squats left','Earlier after squats right','Note','Complete'];
    const rows=[cols,...recent().map(x=>[x.date,x.time,x.measurement,x.seconds,x.completedSets,x.goalSets,x.leftReps,x.rightReps,x.stepWeightKg,x.squatReps,x.squatWeightKg,x.durationKnown?Math.floor(elapsed(x)/1000):null,x.beforeLeft,x.beforeRight,...duringScores.map(k=>x[k]),x.afterIsoLeft,x.afterIsoRight,x.afterStepLeft,x.afterStepRight,x.afterLeft,x.afterRight,x.note,full(x)])];
    const field=v=>{let str=String(v??'');if(/^\s*[=+@\-]/.test(str))str="'"+str;return '"'+str.replaceAll('"','""')+'"';};
    download(`painly-routines-${today()}.csv`,'\ufeff'+rows.map(row=>row.map(field).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  }
  function act(e) {
    const b=e.target.closest('[data-routine]');if(!b||b.disabled)return;
    const action=b.dataset.routine, d=state().draft;
    if(action==='preset')return setDuration(Number(b.dataset.seconds));
    if(action==='duration')return setDuration(Number($('#routineSeconds')?.value));
    if(action==='period'){const n=Number(b.dataset.days);if([0,7,30,90,365].includes(n)){historyPeriod=n;api.render();}return;}
    if(action==='accept'){
      const p=progression();if(d||!p.ready||!duration(p.nextSeconds))return;
      if(commit(s=>{s.settings.seconds=p.nextSeconds;s.settings.appliedFrom=p.key;s.settings.progressionResetDate=dateAt(p.days[0]);})){api.render();toast('Timer setting updated. Your next qualifying day starts a new four-day run.');}return;
    }
    if(action==='new'){
      if(d)return;
      const seconds=Number($('#routineSeconds')?.value);
      if(!duration(seconds))return toast('Choose a whole number from 1 to 3600 seconds.');
      if(commit(s=>{s.settings.seconds=seconds;s.draft={id:identifier(),date:today(),time:nowTime(),seconds,phase:0,measurement:'during',...Object.fromEntries(duringScores.map(k=>[k,null])),stepWeightKg:0,squatWeightKg:0,note:'',totalMs:0,totalRunningSince:null,totalStarted:false,totalFinished:false,totalPaused:false,resumeInterval:false,durationKnown:true,goalSets:3,completedSets:0,timerType:'hold',painStage:false,early:false,afterIsoLeft:null,afterIsoRight:null,afterStepLeft:null,afterStepRight:null,beforeLeft:null,beforeRight:null,afterLeft:null,afterRight:null,leftReps:null,rightReps:null,squatReps:null,isoDone:false,running:false,remaining:seconds,endsAt:0};}))api.render();return;
    }
    if(action==='delete'){
      if(!confirm('Delete this saved routine?'))return;
      if(commit(s=>{s.sessions=s.sessions.filter(x=>x.id!==b.dataset.id);})){api.render();toast('Routine deleted.');}return;
    }
    if(action==='export'){exportCSV();return;}
    if(!d)return;
    if(action==='discard'){
      if(confirm('Discard this unfinished routine? Saved routines and pain entries stay unchanged.')&&commit(s=>{s.draft=null;}))api.render();return;
    }
    if(action==='workout-pause'&&d.totalStarted&&!d.totalFinished&&!d.totalPaused){
      const n=remaining(d);if(commit(s=>{const x=s.draft;x.totalMs=elapsed(x);x.totalRunningSince=null;x.totalPaused=true;x.resumeInterval=x.running;x.running=false;x.endsAt=0;x.remaining=n;}))api.render();return;
    }
    if(action==='workout-resume'&&d.totalPaused){
      unlockAudio();if(commit(s=>{const x=s.draft;x.totalPaused=false;x.totalRunningSince=Date.now();if(x.resumeInterval){x.running=true;x.endsAt=Date.now()+x.remaining*1000;}x.resumeInterval=false;}))api.render();return;
    }
    if(d.totalPaused)return toast('Resume the workout before continuing.');
    if(action==='start'&&d.phase===1&&!d.running&&!d.isoDone){unlockAudio();if(commit(s=>{if(!s.draft.totalStarted){s.draft.totalStarted=true;s.draft.totalMs=0;s.draft.totalRunningSince=Date.now();}s.draft.running=true;s.draft.endsAt=Date.now()+s.draft.remaining*1000;}))api.render();return;}
    if(action==='pause'&&d.running){const n=remaining(d);if(commit(s=>{s.draft.remaining=n;s.draft.running=false;s.draft.endsAt=0;}))api.render();return;}
    if(action==='reset'&&d.phase===1){if((!d.running||confirm('Reset the current hold?'))&&commit(s=>{Object.assign(s.draft,{running:false,endsAt:0,remaining:d.timerType==='rest'?60:d.seconds});}))api.render();return;}
    if(action==='next'){
      if([...document.querySelectorAll('.routine-stage input')].some(e=>!e.checkValidity()))return toast('Check the entered repetitions and weight.');
      if(d.painStage&&[1,2].includes(d.phase)){
        const prefix=d.measurement==='during'?(d.phase===1?'duringIso':'duringStep'):(d.phase===1?'afterIso':'afterStep');
        if(!['Left','Right'].every(side=>validScore(d[prefix+side])))return;
        if(commit(s=>{s.draft.painStage=false;s.draft.phase++;})){api.render();window.scrollTo(0,0);}return;
      }
      const ready=[()=>['beforeLeft','beforeRight'].every(k=>validScore(d[k])),()=>d.isoDone,()=>count(d.leftReps)&&count(d.rightReps),()=>count(d.squatReps)][d.phase];
      if(ready?.()&&commit(s=>{if([1,2].includes(s.draft.phase))s.draft.painStage=true;else {if(s.draft.phase===3)stopTotal(s.draft);s.draft.phase++;}})){api.render();window.scrollTo(0,0);}return;
    }
    if(action==='early'&&d.phase>0&&d.phase<4){
      const n=remaining(d);
      if(commit(s=>{stopTotal(s.draft);Object.assign(s.draft,{phase:4,early:true,painStage:false,running:false,remaining:n,endsAt:0});}))api.render();return;
    }
    if(action==='save'&&d.phase===4&&requiredScores(d).every(k=>validScore(d[k]))){
      if(state().sessions.length>=10000)return toast('Export a backup and remove older routines before adding more.');
      if(commit(s=>{stopTotal(s.draft);s.sessions.push({...s.draft,running:false,endsAt:0});s.draft=null;})){api.render();toast(full(d)?'Daily routine saved.':'Partial routine saved.');}return;
    }
  }
  document.addEventListener('click',act);
  document.addEventListener('input',e=>{
    const draft=state().draft;
    if(e.target.id==='routineNote'&&draft){const text=e.target.value.slice(0,2000);if(!commit(s=>{s.draft.note=text;}))e.target.value=state().draft.note;return;}
    const wk=e.target.dataset.routineWeight;
    if(wk&&draft&&!draft.totalPaused&&['stepWeightKg','squatWeightKg'].includes(wk)){
      const n=e.target.value===''?null:Number(e.target.value),ok=weight(n);e.target.setCustomValidity(ok?'':'Enter a weight between 0 and 2000 kg.');
      if(ok&&!commit(s=>{s.draft[wk]=n;}))e.target.value=state().draft[wk]??'';
      const btn=$('[data-routine="next"]');if(btn)btn.disabled=!stageReady();return;
    }
    const k=e.target.dataset.routineReps,d=state().draft;if(!k||!d||d.totalPaused||!['leftReps','rightReps','squatReps'].includes(k))return;
    const n=e.target.value===''?null:Number(e.target.value),valid=n===null||count(n);
    e.target.setCustomValidity(valid?'':'Enter a whole number from 0 to 999.');
    const button=$('[data-routine="next"]');
    if(!valid){if(button)button.disabled=true;return;}
    if(!commit(s=>{s.draft[k]=n;})){e.target.value=state().draft[k]??'';return;}
    if(button)button.disabled=!stageReady();
  });
  document.addEventListener('change',e=>{
    const key=e.target.dataset.routineScore;
    if(allScores.includes(key)&&state().draft&&!state().draft.totalPaused){
      const n=e.target.value===''?null:Number(e.target.value);
      if(n!==null&&!validScore(n))return;
      if(commit(s=>{s.draft[key]=n;}))api.render();else e.target.value=state().draft[key]??'';
    }
    if(e.target.id==='routineChime') {if(!commit(s=>{s.settings.chime=e.target.checked;}))e.target.checked=state().settings.chime;}
    if(e.target.id==='routineSeconds'){const n=Number(e.target.value);if(!duration(n)){toast('Choose a whole number from 1 to 3600 seconds.');return;}if(commit(s=>{s.settings.seconds=n;s.settings.appliedFrom=null;})&&$('#routineProposal'))$('#routineProposal').outerHTML=proposalHTML();}
  });
  document.addEventListener('visibilitychange',finishTick);
  window.addEventListener('pageshow',finishTick);
  setInterval(finishTick,250);
  return {render, renderHistory, exportCSV, validateImport, sync:p=>{visiblePage=p;renderedDay=today();visible=p==='routine';document.documentElement.dataset.page=p;screenLock();}};
};
