'use strict';
// Daily routines share the existing Painly backup, but never alter pain entries.
window.PainlyDailyRoutine = function (api) {
  const {getData, save, toast, esc, today, nowTime, identifier, fmtDate, download} = api;
  const $ = s => document.querySelector(s);
  const scores = ['beforeLeft', 'beforeRight', 'afterLeft', 'afterRight'];
  const extraScores = ['afterIsoLeft','afterIsoRight','afterStepLeft','afterStepRight'];
  const steps = ['Check in', 'Isometric', 'Step downs', 'Deep squats', 'Check out'];
  const validScore = n => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10;
  const duration = n => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 3600;
  const count = n => Number.isInteger(n) && n >= 0 && n <= 999;
  const blank = () => ({schema:2, settings:{seconds:45, appliedFrom:null, chime:true}, sessions:[], draft:null});
  let visible = false, audio = null, wakeLock = null, requestingWake = false, wakeAttempted = false;
  function validDraft(d) {
    const limit=d.timerType==='rest'?60:d.seconds;
    return d && typeof d.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && typeof d.time === 'string'
      && duration(d.seconds) && Number.isInteger(d.phase) && d.phase >= 0 && d.phase <= 4
      && [...scores,...extraScores].every(k => d[k] === null || validScore(d[k]))
      && ['leftReps','rightReps','squatReps'].every(k => d[k]===null || count(d[k]))
      && [1,3].includes(d.goalSets) && Number.isInteger(d.completedSets) && d.completedSets>=0 && d.completedSets<=d.goalSets
      && ['hold','rest'].includes(d.timerType) && typeof d.painStage==='boolean' && typeof d.early==='boolean'
      && typeof d.isoDone === 'boolean' && d.isoDone===(d.completedSets===d.goalSets) && typeof d.running === 'boolean'
      && Number.isFinite(d.remaining) && d.remaining >= 0 && d.remaining <= limit
      && Number.isFinite(d.endsAt) && d.endsAt >= 0;
  }
  function full(d) { return d.isoDone && d.leftReps >= 10 && d.rightReps >= 10 && d.squatReps >= 10 && !d.early; }
  function eligible(d) { return full(d) && scores.every(k => validScore(d[k]) && d[k] < 2); }
  function validateImport(raw) {
    if (!raw || ![1,2].includes(raw.schema) || !raw.settings || !duration(raw.settings.seconds)
      || !Array.isArray(raw.sessions) || raw.sessions.length > 10000) throw Error('Invalid daily routine data');
    const copy = JSON.parse(JSON.stringify(raw));
    if(raw.schema===1){
      const migrate=d=>({...d,goalSets:1,completedSets:d.isoDone?1:0,timerType:'hold',painStage:false,early:!(d.isoDone&&d.leftReps===10&&d.rightReps===10&&d.squatReps===10)&&d.phase===4,...Object.fromEntries(extraScores.map(k=>[k,null]))});
      copy.sessions=copy.sessions.map(migrate);copy.draft=copy.draft?migrate(copy.draft):null;copy.schema=2;
    }
    if (!copy.sessions.every(d=>validDraft(d)&&!d.running&&scores.every(k=>validScore(d[k])))
      || (copy.draft!==null&&!validDraft(copy.draft))) throw Error('Invalid daily routine records');
    copy.settings = {seconds:raw.settings.seconds, appliedFrom:typeof raw.settings.appliedFrom === 'string' ? raw.settings.appliedFrom : null, chime:raw.settings.chime !== false};
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
      const labels={before:'before routine',afterIso:'after isometrics',afterStep:'after step downs',after:'after deep squats'};
      return `<div class="form-field"><label for="routine-${key}">${side} knee · ${labels[when]}</label><select class="select" id="routine-${key}" data-routine-score="${key}"><option value="">Choose pain score</option>${Array.from({length:11},(_,n)=>`<option value="${n}" ${d[key]===n?'selected':''}>${n} / 10${n===0?' · No pain':''}</option>`).join('')}</select></div>`;
    }).join('')}</div>`;
  }
  function controls(key, label, n) {
    return `<div class="form-field"><label for="routine-${key}">${label} · repetitions completed</label><input class="input" id="routine-${key}" data-routine-reps="${key}" type="number" min="0" max="999" step="1" inputmode="numeric" placeholder="e.g. 10" value="${n??''}"><p class="hint">Target: 10. Enter the number you actually did.</p></div>`;
  }
  function painTable(d){
    const row=(label,prefix)=>`<tr><th scope="row">${label}</th><td>${d[prefix+'Left']??'—'}</td><td>${d[prefix+'Right']??'—'}</td></tr>`;
    return `<div class="routine-pain-table"><table><caption>Knee pain · 0–10</caption><thead><tr><th scope="col">Check-in</th><th scope="col">Left</th><th scope="col">Right</th></tr></thead><tbody>${row('Before routine','before')}${row('After isometrics','afterIso')}${row('After step downs','afterStep')}${row('After deep squats','after')}</tbody></table></div>`;
  }
  function summary(d){return `<div class="routine-summary"><span>Isometrics: ${d.completedSets}/${d.goalSets} sets × ${d.seconds} sec${d.goalSets>1?' · 60 sec rest between sets':' · earlier single-set routine'}</span><span>Step downs: left ${d.leftReps??0} · right ${d.rightReps??0} reps</span><span>Deep squats: ${d.squatReps??0} reps</span></div>`;}
  function proposalHTML() {
    const last=recent()[0];
    if(!last) return `<div class="notice"><strong>Your progression rule</strong><p class="hint">After a complete routine, all four scores must be below 2/10 before Painly offers +15 seconds. You decide whether to accept.</p></div>`;
    const ok=eligible(last), proposed=last.seconds+15, applied=state().settings.appliedFrom===last.id;
    return `<div class="notice"><strong>${ok?'Your rule allows a +15 second suggestion':'No increase suggested'}</strong><p class="hint">${ok?`Your latest routine (${esc(fmtDate(last.date))}) was complete and both knees were below 2/10 before and after. ${last.seconds} → ${proposed} seconds.`:'Your latest routine must be complete, with all four pain scores below 2/10. A score of 2 or more does not qualify.'}</p>${ok&&proposed<=3600?`<button type="button" class="btn secondary small" data-routine="accept" ${applied?'disabled':''}>${applied?'✓ Suggestion applied':`Use ${proposed} seconds next time`}</button>`:''}<p class="hint">Your personal tracking rule, not a clinical assessment. Time never increases automatically.</p></div>`;
  }
  function activeHTML(d) {
    let body='';
    if(d.phase===0) body=`<h2>Before you begin</h2><p class="sub">Rate both knees before the whole routine. Empty scores are never treated as zero.</p>${scoreFields(d,'before')}<button type="button" class="btn full" data-routine="next" ${!['beforeLeft','beforeRight'].every(k=>validScore(d[k]))?'disabled':''}>Continue to isometric →</button>`;
    if(d.phase===1) {
      const rest=d.timerType==='rest',total=rest?60:d.seconds;
      body=`<h2>${rest?'Rest between sets':'Isometric holds'}</h2><p class="sub">${d.goalSets} sets × ${d.seconds} seconds · 60 seconds rest between sets.</p><div class="routine-set-dots" aria-label="${d.completedSets} of ${d.goalSets} sets complete">${Array.from({length:d.goalSets},(_,i)=>`<span class="${i<d.completedSets?'done':''}">${i<d.completedSets?'✓':'Set '+(i+1)}</span>`).join('')}</div><div class="routine-clock" id="routineClock" role="timer" aria-label="Time remaining">${clock(remaining(d))}</div><p class="routine-timer-status" id="routineTimerStatus" role="status">${d.isoDone?'All isometric sets complete. Record your pain when ready.':rest?(d.running?'Resting — next set starts only when you press Start.':'Rest paused.'):(d.running?`Holding · set ${d.completedSets+1} of ${d.goalSets}`:d.remaining<d.seconds?'Hold paused.':`Ready for set ${d.completedSets+1} of ${d.goalSets}.`)}</p><div class="med-progress"><div class="med-progress-fill" id="routineFill" style="width:${(1-remaining(d)/total)*100}%"></div></div><div class="button-row routine-timer-buttons"><button type="button" class="btn" data-routine="start" ${d.running||d.isoDone?'disabled':''}>${d.remaining<total?'Resume':rest?'Resume rest':`Start set ${d.completedSets+1}`}</button><button type="button" class="btn secondary" data-routine="pause" ${!d.running?'disabled':''}>Pause</button><button type="button" class="btn ghost" data-routine="reset" ${d.isoDone?'disabled':''}>Reset ${rest?'rest':'hold'}</button></div><button type="button" class="btn full" data-routine="next" style="margin-top:18px" ${!d.isoDone?'disabled':''}>Done — record pain →</button><p class="hint">Keep Painly open. Rest starts automatically after sets 1 and 2. You start each hold yourself.</p>`;
    }
    if(d.phase===2) body=`<h2>Step downs</h2><p class="sub">Target: 10 per leg. Fill in the repetitions you completed, then tap Done.</p>${controls('leftReps','Left leg',d.leftReps)}${controls('rightReps','Right leg',d.rightReps)}<button type="button" class="btn full" data-routine="next" ${!['leftReps','rightReps'].every(k=>count(d[k]))?'disabled':''}>Done — record pain →</button>`;
    if(d.phase===3) body=`<h2>Deep squats</h2><p class="sub">Target: 10 repetitions. Enter what you completed.</p>${controls('squatReps','Deep squats',d.squatReps)}<button type="button" class="btn full" data-routine="next" ${!count(d.squatReps)?'disabled':''}>Done — record pain →</button>`;
    if(d.painStage&&[1,2].includes(d.phase)){
      const prefix=d.phase===1?'afterIso':'afterStep',name=d.phase===1?'isometrics':'step downs';
      body=`<h2>After ${name}</h2><p class="sub">How do both knees feel after this exercise?</p>${scoreFields(d,prefix)}<button type="button" class="btn full" data-routine="next" ${!['Left','Right'].every(side=>validScore(d[prefix+side]))?'disabled':''}>Continue to ${d.phase===1?'step downs':'deep squats'} →</button>`;
    }
    if(d.phase===4) body=`<h2>${d.early?'Finish your check-in':'After deep squats'}</h2><p class="sub">${d.early?'Record how both knees feel now. This session will be marked partial.':'Rate both knees after your last exercise. This is also your end-of-routine pain check.'}</p>${scoreFields(d,'after')}${summary(d)}${painTable(d)}<button type="button" class="btn full" data-routine="save" ${!scores.every(k=>validScore(d[k]))?'disabled':''}>Save ${full(d)?'morning':'partial'} routine ✓</button>`;
    return `<section class="card"><div class="routine-session-heading"><span class="badge">${esc(fmtDate(d.date))} · ${esc(d.time)}</span><span class="hint">Progress saved on this device</span></div><ol class="routine-steps" aria-label="Routine steps">${steps.map((name,i)=>`<li class="${d.phase===i?'current':d.phase>i?'past':''}" ${d.phase===i?'aria-current="step"':''}><span>${i+1}</span>${name}</li>`).join('')}</ol>${body}<div class="routine-bottom">${d.phase>0&&d.phase<4?'<button type="button" class="linkbtn" data-routine="early">Finish early & record pain</button>':''}<button type="button" class="linkbtn dangertext" data-routine="discard">Discard this routine</button></div></section>`;
  }
  function historyHTML(list) {
    return `<section class="card"><div class="history-head"><div><h2>Morning routine history</h2><p class="sub">Pain before your routine and after every exercise. Older entries show — for measurements not recorded.</p></div><button type="button" class="btn secondary small" data-routine="export" ${!list.length?'disabled':''}>Export routine CSV</button></div>${list.length?list.map(d=>`<article class="entry"><div class="entry-header"><strong>${esc(fmtDate(d.date))} · ${esc(d.time)}</strong><span class="badge">${full(d)?'Complete':'Partial'}</span></div>${summary(d)}${painTable(d)}<p class="hint">${eligible(d)?'Both knees below 2 before and at the end · qualifies for a +15 sec proposal.':'No progression proposal from this session.'}</p><button type="button" class="linkbtn dangertext" data-routine="delete" data-id="${esc(d.id)}">Delete routine</button></article>`).join(''):'<div class="empty">Your morning routine history starts here.</div>'}</section>`;
  }
  function render() {
    const s=state(), list=recent(), dates=new Set(list.filter(full).map(d=>d.date));
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-6);const min=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
    const week=[...dates].filter(d=>d>=min&&d<=today()).length;
    return `<div class="fullstack"><div class="columns"><div class="fullstack">${s.draft?activeHTML(s.draft):`<section class="card"><span class="eyebrow">YOUR MORNING CHECK-IN</span><h2 style="margin-top:8px">Your morning knee routine</h2><p class="sub">Three isometric holds with 60 seconds rest, then step downs and deep squats. Check your knees before the routine and after every exercise.</p><div class="routine-plan"><div><span>01</span><strong>Isometric</strong><small>3 × ${s.settings.seconds} sec<br>60 sec rest</small></div><div><span>02</span><strong>Step downs</strong><small>10 per leg</small></div><div><span>03</span><strong>Deep squats</strong><small>10 repetitions</small></div></div><div style="margin-bottom:18px"><button type="button" class="btn full" data-routine="new" style="margin-top:20px">${dates.has(today())?'Start another routine today':'Start morning routine'} →</button></div>${proposalHTML()}<div class="form-field"><label for="routineSeconds">Isometric timer · seconds per set</label><div class="routine-duration"><input class="input" type="number" min="1" max="3600" step="1" inputmode="numeric" id="routineSeconds" value="${s.settings.seconds}"><button type="button" class="btn secondary" data-routine="duration">Save time</button></div><div class="med-choices">${[45,60,90,120].map(n=>`<button type="button" class="med-duration ${s.settings.seconds===n?'chosen':''}" data-routine="preset" data-seconds="${n}" aria-pressed="${s.settings.seconds===n}">${n} sec</button>`).join('')}</div></div><label class="med-quiet"><input type="checkbox" id="routineChime" ${s.settings.chime?'checked':''}> Finish sound while Painly is open</label><p class="hint">Your last chosen time is remembered. You start each exercise yourself.</p></section>`}</div><aside class="card"><span class="eyebrow">ONE DAY AT A TIME</span><h2 style="margin-top:9px">Your routine overview</h2><div class="stat-grid"><div class="stat"><strong>${week}<small style="font-size:14px"> / 7</small></strong><span>days completed · past 7 days</span></div><div class="stat"><strong>${list.filter(full).length}</strong><span>complete routines</span></div></div><div class="notice"><strong>${dates.has(today())?'✓ Today’s routine completed':'Today is ready for your check-in'}</strong><div class="hint">${s.draft?'An unfinished routine is saved. Pick up where you left off.':'Each routine records your own timer setting and pain scores after each exercise.'}</div></div><div class="settings-box"><h3>Your +15 second rule</h3><p class="sub" style="margin:0">Both knees must be below 2/10, before and after a complete routine. Any score of 2 or higher blocks the suggestion. You choose whether to apply it.</p></div><p class="hint">This is your tracking rule, not a medical assessment or an automatic training prescription.</p><p class="hint">Settings → Download backup (JSON) includes your routines and timer settings.</p></aside></div>${historyHTML(list)}</div>`;
  }
  function setDuration(n) {
    if(!duration(n))return toast('Choose a whole number from 1 to 3600 seconds.');
    if(commit(s=>{s.settings.seconds=n;s.settings.appliedFrom=null;})){api.render();toast('Timer setting saved.');}
  }
  function finishTick() {
    const d=state().draft;
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
  function act(e) {
    const b=e.target.closest('[data-routine]');if(!b||b.disabled)return;
    const action=b.dataset.routine, d=state().draft;
    if(action==='preset')return setDuration(Number(b.dataset.seconds));
    if(action==='duration')return setDuration(Number($('#routineSeconds')?.value));
    if(action==='accept'){
      const last=recent()[0];
      if(d||!last||!eligible(last)||state().settings.appliedFrom===last.id||!duration(last.seconds+15))return;
      if(commit(s=>{s.settings.seconds=last.seconds+15;s.settings.appliedFrom=last.id;})){api.render();toast('New timer setting saved. Start the next routine when ready.');}return;
    }
    if(action==='new'){
      if(d)return;
      const seconds=Number($('#routineSeconds')?.value);
      if(!duration(seconds))return toast('Choose a whole number from 1 to 3600 seconds.');
      if(commit(s=>{s.settings.seconds=seconds;s.draft={id:identifier(),date:today(),time:nowTime(),seconds,phase:0,goalSets:3,completedSets:0,timerType:'hold',painStage:false,early:false,afterIsoLeft:null,afterIsoRight:null,afterStepLeft:null,afterStepRight:null,beforeLeft:null,beforeRight:null,afterLeft:null,afterRight:null,leftReps:null,rightReps:null,squatReps:null,isoDone:false,running:false,remaining:seconds,endsAt:0};}))api.render();return;
    }
    if(action==='delete'){
      if(!confirm('Delete this saved routine?'))return;
      if(commit(s=>{s.sessions=s.sessions.filter(x=>x.id!==b.dataset.id);})){api.render();toast('Routine deleted.');}return;
    }
    if(action==='export'){
      const rows=[['Date','Time','Isometric seconds per set','Isometric completed','Sets completed','Sets planned','Step downs left','Step downs right','Deep squats','Left knee before','Right knee before','Left knee after','Right knee after','Left after isometrics','Right after isometrics','Left after step downs','Right after step downs','Complete','Progression eligible'],...recent().map(x=>[x.date,x.time,x.seconds,x.isoDone,x.completedSets,x.goalSets,x.leftReps,x.rightReps,x.squatReps,x.beforeLeft,x.beforeRight,x.afterLeft,x.afterRight,x.afterIsoLeft??'',x.afterIsoRight??'',x.afterStepLeft??'',x.afterStepRight??'',full(x),eligible(x)])];
      download(`painly-routines-${today()}.csv`,'\ufeff'+rows.map(row=>row.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(';')).join('\r\n'),'text/csv;charset=utf-8');return;
    }
    if(!d)return;
    if(action==='discard'){
      if(confirm('Discard this unfinished routine? Saved routines and pain entries stay unchanged.')&&commit(s=>{s.draft=null;}))api.render();return;
    }
    if(action==='start'&&d.phase===1&&!d.running&&!d.isoDone){unlockAudio();if(commit(s=>{s.draft.running=true;s.draft.endsAt=Date.now()+s.draft.remaining*1000;}))api.render();return;}
    if(action==='pause'&&d.running){const n=remaining(d);if(commit(s=>{s.draft.remaining=n;s.draft.running=false;s.draft.endsAt=0;}))api.render();return;}
    if(action==='reset'&&d.phase===1){if((!d.running||confirm('Reset the current hold?'))&&commit(s=>{Object.assign(s.draft,{running:false,endsAt:0,remaining:d.timerType==='rest'?60:d.seconds});}))api.render();return;}
    if(action==='next'){
      if(d.painStage&&[1,2].includes(d.phase)){
        const prefix=d.phase===1?'afterIso':'afterStep';
        if(!['Left','Right'].every(side=>validScore(d[prefix+side])))return;
        if(commit(s=>{s.draft.painStage=false;s.draft.phase++;})){api.render();window.scrollTo(0,0);}return;
      }
      const ready=[()=>['beforeLeft','beforeRight'].every(k=>validScore(d[k])),()=>d.isoDone,()=>count(d.leftReps)&&count(d.rightReps),()=>count(d.squatReps)][d.phase];
      if(ready?.()&&commit(s=>{if([1,2].includes(s.draft.phase))s.draft.painStage=true;else s.draft.phase++;})){api.render();window.scrollTo(0,0);}return;
    }
    if(action==='early'&&d.phase>0&&d.phase<4){
      const n=remaining(d);
      if(commit(s=>{Object.assign(s.draft,{phase:4,early:true,painStage:false,running:false,remaining:n,endsAt:0});}))api.render();return;
    }
    if(action==='save'&&d.phase===4&&scores.every(k=>validScore(d[k]))){
      if(state().sessions.length>=10000)return toast('Export a backup and remove older routines before adding more.');
      if(commit(s=>{s.sessions.push({...s.draft,running:false,endsAt:0});s.draft=null;})){api.render();toast(full(d)?'Daily routine saved.':'Partial routine saved. No increase suggested.');}return;
    }
  }
  document.addEventListener('click',act);
  document.addEventListener('input',e=>{
    const k=e.target.dataset.routineReps,d=state().draft;if(!k||!d||!['leftReps','rightReps','squatReps'].includes(k))return;
    const n=e.target.value===''?null:Number(e.target.value),valid=n===null||count(n);
    e.target.setCustomValidity(valid?'':'Enter a whole number from 0 to 999.');
    const button=$('[data-routine="next"]');
    if(!valid){if(button)button.disabled=true;return;}
    if(!commit(s=>{s.draft[k]=n;})){e.target.value=state().draft[k]??'';return;}
    if(button)button.disabled=!(d.phase===2?['leftReps','rightReps'].every(key=>count(state().draft[key])):count(state().draft.squatReps));
  });
  document.addEventListener('change',e=>{
    const key=e.target.dataset.routineScore;
    if([...scores,...extraScores].includes(key)&&state().draft){
      const n=e.target.value===''?null:Number(e.target.value);
      if(n!==null&&!validScore(n))return;
      if(commit(s=>{s.draft[key]=n;}))api.render();else e.target.value=state().draft[key]??'';
    }
    if(e.target.id==='routineChime') {if(!commit(s=>{s.settings.chime=e.target.checked;}))e.target.checked=state().settings.chime;}
    if(e.target.id==='routineSeconds'){const n=Number(e.target.value);if(!duration(n)){toast('Choose a whole number from 1 to 3600 seconds.');return;}commit(s=>{s.settings.seconds=n;s.settings.appliedFrom=null;});}
  });
  document.addEventListener('visibilitychange',finishTick);
  window.addEventListener('pageshow',finishTick);
  setInterval(finishTick,250);
  return {render, validateImport, sync:p=>{visible=p==='routine';document.documentElement.dataset.page=p;screenLock();}};
};
