/* NoirPlan — Full app.js (Home + Schedule + Vertical Timeline, lanes=2, +N pill) */
(() => {
  const $ = s => document.querySelector(s);

  // namespace
  window.NoirPlan = window.NoirPlan || {};
  const NP = window.NoirPlan;

  /* ========== Core State & DOM ========== */
  NP.route = 'home'; // 'home' | 'schedule' | 'stats' | 'settings' | 'about'
  NP.go = to => { NP.route = to; NP.render(); };

  NP.view = $('#view');
  NP.search = $('#search');
  NP.tabs = [...document.querySelectorAll('.nav-btn')];

  // Modal refs
  NP.modal = $('#modal'); NP.modalTitle = $('#modalTitle'); NP.closeModalBtn = $('#closeModal');
  NP.mDate = $('#mDate'); NP.mStart = $('#mStart'); NP.mEnd = $('#mEnd'); NP.mTitle = $('#mTitle'); NP.mNotes = $('#mNotes');
  NP.mRepeat = $('#mRepeat'); NP.tagChips = $('#tagChips'); NP.mCustom = $('#mCustom');
  NP.saveBtn = $('#saveBtn'); NP.delBtn = $('#delBtn'); NP.toast = $('#toast');
  NP.emojiBtn = document.getElementById('emojiBtn'); NP.emojiPicker = document.getElementById('emojiPicker');
  NP.navBar = document.querySelector('.nav');

  /* ========== IndexedDB ========== */
  const DB = 'noirplan.db', STORE = 'events'; let db;
  NP.openDB = () => new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => (db = r.result, res());
    r.onerror = () => rej(r.error);
  });
  const store = (mode='readonly') => db.transaction(STORE, mode).objectStore(STORE);
  NP.getAll = () => new Promise((res, rej) => { const q = store().getAll(); q.onsuccess=()=>res(q.result||[]); q.onerror=()=>rej(q.error); });
  NP.put = (obj) => new Promise((res, rej) => { const q = store('readwrite').put(obj); q.onsuccess=()=>res(); q.onerror=()=>rej(q.error); });
  NP.remove = (id) => new Promise((res, rej) => { const q = store('readwrite').delete(id); q.onsuccess=()=>res(); q.onerror=()=>rej(q.error); });

  /* ========== Utils =========== */
  const tzISO = (d=new Date()) => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const addDays = (iso, n) => { const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return tzISO(d); };
  const fmtTime = t => t || '—';
  const esc = s => String(s||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const wkShort = i => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i];
  const tagClass = t => ['work','study','health','errand','default'].includes(t) ? t : 'other';
  NP.utils = { tzISO, addDays, fmtTime, esc, wkShort, tagClass };

  /* ========== Emoji helpers ========== */
  NP.splitLeadingEmoji = function(str){
    const text = String(str||'').trimStart(); if (!text) return { emoji:'', text:'' };
    const arr = Array.from(text), first = arr[0]||''; const cp = first.codePointAt(0)||0;
    const isEmj = (cp >= 0x1F300 && cp <= 0x1FAFF) || (cp >= 0x1F170 && cp <= 0x1F251) || (cp >= 0x2600 && cp <= 0x27BF) || [0x24C2,0x3030,0x303D,0x3297,0x3299].includes(cp);
    return isEmj ? { emoji:first, text:arr.slice(1).join('').replace(/^\s+/, '') } : { emoji:'', text };
  };
  NP.minutesSinceMidnight = function(t){
    if(!t || !/^[0-2]\d:[0-5]\d$/.test(t)) return null; const [H,M]=t.split(':').map(Number); return H*60+M;
  };

  /* ========== Schedule State ========== */
  NP.tab='today'; NP.editId=null; NP.tag='default'; NP.query=''; NP.currentEmoji=(NP.emojiBtn?.textContent||'😀').trim()||'😀';

  /* ========== Emoji Picker ========== */
  const emojiList = "😀🙂😊😉😍😘😎🤓🤩🥳🤔🙌👍👏🔥⭐️✨⚡️💡📚🗓️🏃‍♂️🏋️‍♀️🧘‍♂️🚴‍♀️💼🛠️🧠💬🎯🍎☕️🍷🚬💩".split('');
  function renderEmojiPicker(){
    if(!NP.emojiPicker) return; const wrap=document.createElement('div'); wrap.style.display='grid'; wrap.style.gridTemplateColumns='repeat(8,1fr)'; wrap.style.gap='6px';
    NP.emojiPicker.innerHTML=''; NP.emojiPicker.appendChild(wrap);
    for(const e of emojiList){
      const b=document.createElement('button'); b.type='button'; b.className='emoji-item'; b.textContent=e;
      b.onclick=()=>{ NP.currentEmoji=e; NP.emojiBtn.textContent=e; toggleEmojiPicker(false); };
      wrap.appendChild(b);
    }
  }
  function toggleEmojiPicker(show=null){
    if(!NP.emojiPicker) return; const willShow = show===null ? NP.emojiPicker.classList.contains('hidden') : show;
    if (willShow){ renderEmojiPicker(); NP.emojiPicker.classList.remove('hidden'); NP.emojiPicker.setAttribute('aria-hidden','false'); }
    else { NP.emojiPicker.classList.add('hidden'); NP.emojiPicker.setAttribute('aria-hidden','true'); }
  }
  if(NP.emojiBtn && NP.emojiPicker){
    NP.emojiBtn.addEventListener('click', e=>{ e.stopPropagation(); toggleEmojiPicker(); });
    document.addEventListener('click', ev=>{
      if(!NP.emojiPicker.classList.contains('hidden')){
        const inside = NP.emojiPicker.contains(ev.target)||NP.emojiBtn.contains(ev.target);
        if(!inside) toggleEmojiPicker(false);
      }
    });
  }

  /* ========== Quick Templates & Tag Chips ========== */
  const qt = document.getElementById('quickTemplates');
  if (qt){
    qt.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tpl-btn'); if(!btn) return;
      const emo = btn.getAttribute('data-emoji')||'', txt = btn.getAttribute('data-text')||'';
      if (emo){ NP.currentEmoji=emo; NP.emojiBtn.textContent=emo; }
      NP.mTitle.value = (emo?emo+' ':'') + txt; NP.mTitle.dispatchEvent(new Event('input',{bubbles:true}));
    });
  }
  NP.mTitle?.addEventListener('input', ()=>{ const p=NP.splitLeadingEmoji(NP.mTitle.value||''); if(p.emoji){ NP.currentEmoji=p.emoji; NP.emojiBtn.textContent=NP.currentEmoji; }});

  NP.tagChips.addEventListener('click',(e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    [...NP.tagChips.querySelectorAll('.chip')].forEach(c=>c.classList.remove('active'));
    b.classList.add('active'); NP.tag=b.dataset.tag;
    if (NP.tag==='custom'){ NP.mCustom.classList.remove('hidden'); } else { NP.mCustom.classList.add('hidden'); NP.mCustom.value=''; }
  });

  /* ========== Modal Helpers ========== */
  NP.openModal = (isEdit=false)=>{
    document.body.classList.add('modal-open');
    NP.modal.classList.remove('hidden');
    NP.modal.setAttribute('aria-hidden','false');
    NP.modalTitle.textContent=isEdit?'Edit event':'Add event';
    NP.emojiBtn.textContent=NP.currentEmoji;
  };
  NP.closeModal = ()=>{
    NP.modal.classList.add('hidden');
    NP.modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
    NP.clearForm();
  };
  NP.closeModalBtn.onclick = NP.closeModal;
  NP.modal.addEventListener('click',e=>{ if(e.target===NP.modal) NP.closeModal(); });

  NP.clearForm = function(){
    NP.editId=null; NP.tag='default';
    NP.mDate.value=tzISO(); NP.mStart.value=''; NP.mEnd.value=''; NP.mTitle.value=''; NP.mNotes.value='';
    [...NP.tagChips.querySelectorAll('.chip')].forEach(c=>c.classList.remove('active'));
    NP.tagChips.querySelector('[data-tag="default"]').classList.add('active');
    NP.mCustom.classList.add('hidden'); NP.mCustom.value=''; NP.mRepeat.value='none'; NP.delBtn.classList.add('hidden');
  };
  NP.toastMsg = s=>{ NP.toast.textContent=s; NP.toast.classList.add('show'); setTimeout(()=>NP.toast.classList.remove('show'),1200); };

  NP.saveBtn.onclick = async ()=>{
    const d=NP.mDate.value||tzISO(); let tRaw=(NP.mTitle.value||'').trim(); if(!tRaw){ NP.mTitle.focus(); return; }
    const parts=NP.splitLeadingEmoji(tRaw);
    const chosenEmoji=parts.emoji||NP.currentEmoji||''; 
    const normalizedTitle = chosenEmoji ? (chosenEmoji + (parts.text? ' '+parts.text:'')) : tRaw;
    let useTag = NP.tag==='custom' ? (NP.mCustom.value.trim()||'other') : NP.tag;
    const base = { id: NP.editId || (Date.now().toString(36)+Math.random().toString(36).slice(2,7)), date:d, start:NP.mStart.value||'', end:NP.mEnd.value||'', title:normalizedTitle, notes:NP.mNotes.value||'', tag:useTag, createdAt:Date.now() };
    if(!NP.editId && NP.mRepeat.value!=='none'){
      for(let i=0;i<10;i++){
        await NP.put({ ...base, id: base.id+'_'+i, date: NP.mRepeat.value==='daily'? addDays(d,i): addDays(d, i*7)});
      }
    } else { await NP.put(base); }
    NP.toastMsg('Saved'); NP.closeModal(); NP.render();
  };
  NP.delBtn.onclick = async ()=>{ if(!NP.editId) return; await NP.remove(NP.editId); NP.toastMsg('Deleted'); NP.closeModal(); NP.render(); };

  /* ========== Home & Stubs ========== */
  NP.renderHome = function(){
    if (NP.navBar) NP.navBar.style.display = 'none';
    NP.view.innerHTML = `
      <section class="section">
        <div class="home-hero glass">
          <div class="home-title">NoirPlan</div>
          <div class="home-sub">Lightweight schedule & daily tracker</div>
          <div class="home-actions">
            <button class="home-btn primary" id="openSchedule">📅 Open Schedule</button>
            <button class="home-btn" id="openStats">📈 Stats</button>
            <button class="home-btn" id="openSettings">⚙️ Settings</button>
            <button class="home-btn" id="openAbout">ℹ️ About</button>
            <button class="home-btn" id="pwaInstallBtn">⬇️ Install</button>
          </div>
        </div>
        <div class="home-grid">
          <button class="home-card" id="quickToday"><div class="hc-emoji">🕒</div><div class="hc-title">Today</div><div class="hc-sub">Jump to your day</div></button>
          <button class="home-card" id="quickWeek"><div class="hc-emoji">🗓️</div><div class="hc-title">Week</div><div class="hc-sub">Next 7 days</div></button>
          <button class="home-card" id="quickAdd"><div class="hc-emoji">➕</div><div class="hc-title">Add Activity</div><div class="hc-sub">Fast add</div></button>
        </div>
      </section>`;
    $('#openSchedule')?.addEventListener('click', ()=> NP.go('schedule'));
    $('#openStats')?.addEventListener('click', ()=> NP.go('stats'));
    $('#openSettings')?.addEventListener('click', ()=> NP.go('settings'));
    $('#openAbout')?.addEventListener('click', ()=> NP.go('about'));
    $('#quickToday')?.addEventListener('click', ()=>{ NP.go('schedule'); NP.tab='today'; });
    $('#quickWeek')?.addEventListener('click', ()=>{ NP.go('schedule'); NP.tab='week'; });
    $('#quickAdd')?.addEventListener('click', ()=>{ NP.go('schedule'); setTimeout(()=> document.querySelector('#addTopBtn')?.click(), 60); });
  };

  NP.renderStub = function(title, body){
    if (NP.navBar) NP.navBar.style.display = 'none';
    NP.view.innerHTML = `
      <section class="section">
        <div class="home-hero glass">
          <div class="home-title">${title}</div>
          <div class="home-sub">${body}</div>
          <div class="home-actions">
            <button class="home-btn" id="backHome">← Back to Home</button>
            <button class="home-btn primary" id="goSchedule">📅 Open Schedule</button>
          </div>
        </div>
      </section>`;
    $('#backHome')?.addEventListener('click', ()=> NP.go('home'));
    $('#goSchedule')?.addEventListener('click', ()=> NP.go('schedule'));
  };
/* ========== Timeline, Details, Schedule ========== */

// "+N" popover for overflowed overlaps
function showMorePopover(anchorEl, list){
  let pop = document.getElementById('morePopover'); if(pop) pop.remove();
  pop = document.createElement('div'); pop.id='morePopover'; pop.className='more-pop glass';
  pop.innerHTML = `<div class="more-head">Overlapping (${list.length})</div>` + list.map(x=>{
    const p = NP.splitLeadingEmoji(x.title||''); const tm = `${x.start||'—'}–${x.end||'—'}`;
    return `<button class="more-item" data-id="${x.id}">
      <span class="mi-logo">${p.emoji||'•'}</span>
      <span class="mi-title">${NP.utils.esc(p.text||'Untitled')}</span>
      <span class="mi-time">${tm}</span>
    </button>`;
  }).join('');
  document.body.appendChild(pop);
  const r = anchorEl.getBoundingClientRect();
  pop.style.left = Math.max(8, r.right - 220) + 'px';
  pop.style.top  = (r.top + window.scrollY + 6) + 'px';
  pop.addEventListener('click', (e)=>{
    const btn=e.target.closest('.more-item'); if(!btn) return;
    NP.openDetail(btn.dataset.id); pop.remove();
  });
  document.addEventListener('click', function onDoc(e){
    if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener('click', onDoc); }
  }, {capture:true, once:true});
}

// Build vertical timeline (2 lanes max)
function buildTimelineVertical(rows, mountEl){
  const gridPxPerMin=1, minPx=36, maxPx=120, MAX_LANES=2, gutter=72, padLR=8, gap=6;

  const items = rows.map(ev=>{
    let s=NP.minutesSinceMidnight(ev.start), e=NP.minutesSinceMidnight(ev.end);
    if(s==null && e==null){ s=9*60; e=9*60+40; }
    else if(s!=null && e==null){ e=s+40; }
    else if(s==null && e!=null){ s=Math.max(0,e-40); }
    if(e<s) e=s+15; const displayEnd=Math.max(e, s+Math.ceil(minPx/gridPxPerMin));
    return { ev, s, e, displayEnd };
  }).sort((a,b)=> (a.s-b.s) || (a.displayEnd-b.displayEnd));

  const card=document.createElement('div'); card.className='timeline-card glass';
  const tl=document.createElement('div'); tl.className='timeline-grid'; card.appendChild(tl); mountEl.appendChild(card);

  for(let h=0; h<=24; h++){
    const line=document.createElement('div'); line.className='tl-hour'; line.style.top=(h*60)+'px';
    if(h<24){ const lab=document.createElement('div'); lab.className='lab'; lab.textContent=String(h).padStart(2,'0')+':00'; line.appendChild(lab); }
    tl.appendChild(line);
  }
  const now=new Date(), nm=now.getHours()*60+now.getMinutes();
  const nowLine=document.createElement('div'); nowLine.className='tl-now'; nowLine.style.top=(nm*gridPxPerMin)+'px'; tl.appendChild(nowLine);

  // clusters
  const clusters=[]; let cur=[], curEnd=-1;
  for(const it of items){
    if(!cur.length || it.s < curEnd){ cur.push(it); curEnd=Math.max(curEnd,it.displayEnd); }
    else { clusters.push(cur); cur=[it]; curEnd=it.displayEnd; }
  }
  if(cur.length) clusters.push(cur);

  for(const cluster of clusters){
    const laneEnds=[], placed=[], overflow=[];
    for(const it of cluster){
      let lane=0; while(lane<laneEnds.length && laneEnds[lane]>it.s) lane++;
      if(lane<MAX_LANES){ laneEnds[lane]=it.displayEnd; placed.push({...it,lane}); } else { overflow.push(it); }
    }
    const lanes=Math.max(1, Math.min(MAX_LANES, laneEnds.length));
    const avail = Math.max(140, (mountEl.clientWidth || window.innerWidth || 360) - gutter - padLR*2);
    const laneWidth=(avail - (lanes-1)*gap)/lanes;

    for(const p of placed){
      const b=document.createElement('div');
      const tag=p.ev.tag&&['work','study','health','errand','default'].includes(p.ev.tag)?p.ev.tag:(p.ev.tag?'other':'default');
      b.className=`ev2 ${tag}`; b.dataset.id=p.ev.id; b.style.cursor='pointer';

      const top=p.s*gridPxPerMin, rawH=(p.e-p.s)*gridPxPerMin, height=Math.max(minPx, Math.min(maxPx, rawH));
      const leftPx=gutter + padLR + p.lane*(laneWidth+gap);
      b.style.top=top+'px'; b.style.height=height+'px'; b.style.left=leftPx+'px'; b.style.width=laneWidth+'px';

      const T=NP.splitLeadingEmoji(p.ev.title||'');
      const logo=document.createElement('div'); logo.className='emlogo'; logo.textContent=T.emoji||'•'; b.appendChild(logo);

      const cont=document.createElement('div'); cont.className='ev2-content';
      const title=document.createElement('div'); title.className='t';
      const tx=document.createElement('span'); tx.textContent=(T.text||'Untitled'); title.appendChild(tx);
      const meta=document.createElement('div'); meta.className='meta';
      const tm=document.createElement('span'); tm.className='tm';
      tm.textContent=(p.ev.start?p.ev.start:'—')+'–'+(p.ev.end?p.ev.end:'—'); meta.appendChild(tm);
      if(p.ev.notes){ const notes=document.createElement('span'); notes.className='notes'; notes.textContent=' · '+(p.ev.notes||''); meta.appendChild(notes); }
      cont.appendChild(title); cont.appendChild(meta); b.appendChild(cont);

      if(rawH>height){ const clamp=document.createElement('div'); clamp.className='clamp-fade'; b.appendChild(clamp); }
      tl.appendChild(b);
    }

    if(overflow.length){
      const btn=document.createElement('button'); btn.className='more-btn'; btn.textContent=`+${overflow.length}`;
      const topY=Math.min(...cluster.map(x=>x.s))*gridPxPerMin;
      const bottomY=Math.max(...cluster.map(x=>x.displayEnd))*gridPxPerMin;
      const midY=(topY+bottomY)/2;
      btn.style.top=(midY-10)+'px'; btn.style.right='6px';
      btn.onclick = (e)=>{ e.stopPropagation(); showMorePopover(btn, overflow.map(o=>o.ev)); };
      tl.appendChild(btn);
    }
  }

  setTimeout(()=>{ const y=Math.max(0, (new Date().getHours()*60+new Date().getMinutes())*gridPxPerMin - 180); tl.scrollTo({top:y,behavior:'smooth'}); }, 50);
  tl.addEventListener('click', e=>{ const el=e.target.closest('.ev2'); if(el && el.dataset.id) NP.openDetail(el.dataset.id); });
}

/* Details page */
NP.openDetail = async function(id){
  const all = await NP.getAll(); const ev = all.find(x=>x.id===id); if(!ev) return;
  const t = NP.splitLeadingEmoji(ev.title); const pretty = (ev.start||'—')+'–'+(ev.end||'—');
  NP.view.innerHTML = `
    <section class="section">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <button id="backBtn" class="btn">← Home</button>
        <div style="flex:1"></div>
        <button id="editBtn" class="btn">Edit</button>
        <button id="deleteBtn" class="btn danger">Delete</button>
      </div>
      <div class="glass" style="padding:12px">
        <h2 style="margin:0 0 8px 0; font-size:18px; display:flex; align-items:center; gap:8px;">
          ${t.emoji?`<span style="font-size:18px">${t.emoji}</span>`:''}<span>${NP.utils.esc(t.text||'Untitled')}</span>
        </h2>
        <div style="display:grid;gap:6px;font-size:14px">
          <div><b>Date</b> <span>${NP.utils.esc(ev.date)}</span></div>
          <div><b>Time</b> <span>${NP.utils.esc(pretty)}</span></div>
          <div><b>Tag</b> <span>${NP.utils.esc(ev.tag||'default')}</span></div>
          ${ev.notes?`<div><b>Notes</b> <span>${NP.utils.esc(ev.notes)}</span></div>`:''}
        </div>
      </div>
    </section>`;
  document.getElementById('backBtn')?.addEventListener('click', ()=> NP.go('home'));
  document.getElementById('editBtn')?.addEventListener('click', ()=>{
    NP.editId=ev.id; NP.mDate.value=ev.date; NP.mStart.value=ev.start||''; NP.mEnd.value=ev.end||''; NP.mTitle.value=ev.title; NP.mNotes.value=ev.notes||'';
    const parts=NP.splitLeadingEmoji(ev.title||''); if(parts.emoji){ NP.currentEmoji=parts.emoji; NP.emojiBtn.textContent=NP.currentEmoji; }
    let tg=ev.tag||'default'; [...NP.tagChips.querySelectorAll('.chip')].forEach(c=>c.classList.remove('active'));
    if(['work','study','health','errand','default'].includes(tg)){
      NP.tagChips.querySelector(`[data-tag="${tg}"]`).classList.add('active'); NP.tag=tg; NP.mCustom.classList.add('hidden'); NP.mCustom.value='';
    } else {
      NP.tagChips.querySelector('[data-tag="custom"]').classList.add('active'); NP.tag='custom'; NP.mCustom.classList.remove('hidden'); NP.mCustom.value=tg;
    }
    NP.delBtn.classList.remove('hidden'); NP.openModal(true);
  });
  document.getElementById('deleteBtn')?.addEventListener('click', async ()=>{ await NP.remove(ev.id); NP.toastMsg('Deleted'); NP.go('home'); });
};

/* Filters & grouping for schedule */
NP.matches = ev => !NP.query || (ev.title+' '+(ev.notes||'')+' '+(ev.tag||'')).toLowerCase().includes(NP.query);
NP.groupByDate = arr => { const m={}; for(const e of arr){ (m[e.date] ||= []).push(e); } for(const k in m){ m[k].sort((a,b)=>(a.start||'').localeCompare(b.start||'')); } return m; };

/* Schedule view (today/week/all) */
NP.renderSchedule = async function(){
  if (NP.navBar) NP.navBar.style.display = 'flex';
  const all=(await NP.getAll()).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  const todayISO = NP.utils.tzISO();

  if(NP.tab==='today'){
    const rows = all.filter(e=>e.date===todayISO).filter(NP.matches);
    NP.view.innerHTML = `
      <section class="section">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <button class="btn" id="homeBtn">← Home</button>
          <div class="h2" style="margin:0">Today · ${todayISO}</div>
          <div style="flex:1"></div>
          <button id="addTopBtn" class="btn-add">Add</button>
        </div>
        <div id="tlMount"></div>
        ${rows.length? '' : '<div style="color:var(--muted);margin-top:8px">No events yet — tap Add.</div>'}
      </section>`;
    document.getElementById('homeBtn')?.addEventListener('click', ()=>NP.go('home'));
    document.getElementById('addTopBtn')?.addEventListener('click', ()=>{ NP.clearForm(); NP.openModal(false); });
    buildTimelineVertical(rows, document.querySelector('#tlMount'));
  }
  else if(NP.tab==='week'){
    const days=Array.from({length:7},(_,i)=>NP.utils.addDays(todayISO,i)), byDate=NP.groupByDate(all);
    NP.view.innerHTML = `<section class="section">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <button class="btn" id="homeBtn">← Home</button>
        <div class="h2" style="margin:0">Next 7 days</div>
        <div style="flex:1"></div>
        <button id="addTopBtn" class="btn-add">Add</button>
      </div>
      <div class="glass" style="padding:10px;display:grid;gap:10px">
        ${days.map(d=>{
          const dt=new Date(d+'T00:00:00'); const title=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]+' · '+d.slice(5);
          const items=(byDate[d]||[]).map(e=>`<span style="display:inline-block;background:#1b1b1b;border:1px solid var(--hair);border-radius:999px;padding:4px 8px;margin:2px"><b>${NP.utils.fmtTime(e.start)}</b> ${NP.utils.esc(e.title)}</span>`).join('')||`<span style="color:var(--muted)">—</span>`;
          return `<div><h3 style="margin:0 0 6px 0;font-size:14px;color:var(--muted)">${title}</h3>${items}</div>`;
        }).join('')}
      </div>
    </section>`;
    document.getElementById('homeBtn')?.addEventListener('click', ()=>NP.go('home'));
    document.getElementById('addTopBtn')?.addEventListener('click', ()=>{ NP.clearForm(); NP.openModal(false); });
  }
  else { // all
    const groups=NP.groupByDate(all), dates=Object.keys(groups).sort();
    NP.view.innerHTML = `<section class="section">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <button class="btn" id="homeBtn">← Home</button>
        <div class="h2" style="margin:0">All events</div>
        <div style="flex:1"></div>
        <button id="addTopBtn" class="btn-add">Add</button>
      </div>
      <div id="allWrap" class="glass" style="padding:8px"></div>
    </section>`;
    document.getElementById('homeBtn')?.addEventListener('click', ()=>NP.go('home'));
    document.getElementById('addTopBtn')?.addEventListener('click', ()=>{ NP.clearForm(); NP.openModal(false); });

    const wrap=document.getElementById('allWrap'); if(!dates.length){ wrap.innerHTML='<div style="color:var(--muted)">No events yet.</div>'; return; }
    for(const d of dates){
      const head=document.createElement('div'); head.textContent=d; head.style.cssText='margin-top:8px;color:var(--muted);font-size:13px'; wrap.appendChild(head);
      for(const e of groups[d]){
        const row=document.createElement('div'); row.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--hair)';
        row.innerHTML=`<span style="background:#1b1b1b;border:1px solid var(--hair);border-radius:999px;padding:3px 8px;font-size:11px">${NP.utils.fmtTime(e.start)}–${NP.utils.fmtTime(e.end)}</span>
        <div style="flex:1 1 auto;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${NP.utils.esc(e.title)}</div>
        <div style="color:var(--muted);font-size:12px">${NP.utils.esc(e.tag||'default')} ${e.notes? '• '+NP.utils.esc(e.notes):''}</div></div>
        <div style="display:flex;gap:6px"><button class="btn" data-act="edit" data-id="${e.id}">Edit</button><button class="btn danger" data-act="del" data-id="${e.id}">Delete</button></div>`;
        wrap.appendChild(row);
        row.addEventListener('click',(ev)=>{
          const t=ev.target.closest('button'); if(!t) return;
          if(t.dataset.act==='edit'){
            NP.editId=e.id; NP.mDate.value=e.date; NP.mStart.value=e.start||''; NP.mEnd.value=e.end||''; NP.mTitle.value=e.title; NP.mNotes.value=e.notes||'';
            const parts=NP.splitLeadingEmoji(e.title||''); if(parts.emoji){ NP.currentEmoji=parts.emoji; NP.emojiBtn.textContent=NP.currentEmoji; }
            let tg=e.tag||'default'; [...NP.tagChips.querySelectorAll('.chip')].forEach(c=>c.classList.remove('active'));
            if(['work','study','health','errand','default'].includes(tg)){
              NP.tagChips.querySelector(`[data-tag="${tg}"]`).classList.add('active'); NP.tag=tg; NP.mCustom.classList.add('hidden'); NP.mCustom.value='';
            } else {
              NP.tagChips.querySelector('[data-tag="custom"]').classList.add('active'); NP.tag='custom'; NP.mCustom.classList.remove('hidden'); NP.mCustom.value=tg;
            }
            NP.delBtn.classList.remove('hidden'); NP.openModal(true);
          } else if(t.dataset.act==='del'){ NP.remove(e.id).then(()=>{ NP.toastMsg('Deleted'); NP.render(); }); }
        });
      }
    }
  }
};
/* ========== Router, Nav wiring, Init ========== */

// Route switcher
NP.render = async function(){
  if(NP.route==='home')       return NP.renderHome();
  if(NP.route==='schedule')   return NP.renderSchedule();
  if(NP.route==='stats')      return NP.renderStub('Stats','(Coming soon) Quick summaries and streaks.');
  if(NP.route==='settings')   return NP.renderStub('Settings','(Coming soon) Theme and preferences.');
  if(NP.route==='about')      return NP.renderStub('About','NoirPlan — a tiny mobile schedule.');
};

// Tabs & search wiring
NP.tabs.forEach(b=>{
  b.addEventListener('click', ()=>{
    NP.tabs.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    NP.tab = b.dataset.tab;
    NP.render();
  });
});
NP.search?.addEventListener('input', ()=>{
  NP.query = NP.search.value.trim().toLowerCase();
  NP.render();
});

// Boot
(async function(){
  await NP.openDB();
  if (NP.emojiBtn && NP.emojiBtn.textContent) NP.currentEmoji = NP.emojiBtn.textContent.trim() || NP.currentEmoji;
  NP.mDate.value = NP.utils.tzISO();
  NP.render();
})();
})();
