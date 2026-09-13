(() => {
  const config = window.AFOC_CONFIG || {};
  const atelierFrame = document.getElementById('atelier-frame');
  if (!atelierFrame || !config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) return;

  const style = document.createElement('style');
  style.textContent = `
    .learning-nav{padding:12px 12px 0;background:linear-gradient(180deg,#fbf8f4,#faf6f2)}
    .learning-shell{max-width:1180px;margin:0 auto;background:rgba(255,253,250,.98);border:1px solid #eaded6;border-radius:24px;box-shadow:0 12px 35px rgba(78,59,48,.07);overflow:hidden}
    .learning-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #eee3dc}
    .learning-eyebrow{font-size:8px;font-weight:950;letter-spacing:.14em;color:#9f837c}.learning-head h2{font-size:18px;margin:2px 0 1px;letter-spacing:-.03em}.learning-head p{font-size:9px;color:#837870;margin:0;line-height:1.55}
    .learning-toggle,.campus-toggle{border:1px solid #e5d9d1;background:#f7efe9;color:#675d57;border-radius:999px;padding:7px 10px;font:900 8px inherit;white-space:nowrap;cursor:pointer}
    .learning-content{padding:12px 14px 15px}.learning-content[hidden]{display:none!important}
    .learning-campus{margin-top:9px;border:1px solid #eaded6;border-radius:18px;background:#fff;overflow:hidden}.learning-campus:first-child{margin-top:0}
    .campus-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#faf7f4;border-bottom:1px solid #eee4dd}.campus-head h3{font-size:12px;margin:0}.campus-head span{font-size:7.5px;color:#938780;font-weight:850}
    .faculty-learn-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px}.faculty-learn-grid[hidden]{display:none!important}
    .learn-card{border:1px solid #eadfd8;border-radius:15px;background:#fff;padding:10px;min-width:0;box-shadow:0 4px 14px rgba(83,66,56,.035)}
    .learn-card.unstarted{background:linear-gradient(145deg,#fbfff6,#fff);border-color:#dfe9d4}.learn-card.active{background:linear-gradient(145deg,#fffaf3,#fff)}
    .learn-card-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.learn-code{font-size:7px;font-weight:950;color:#9d8b82;letter-spacing:.08em}.learn-name{font-size:11px;font-weight:950;margin-top:2px}.learn-status{border-radius:999px;padding:4px 7px;font-size:7px;font-weight:950;white-space:nowrap}.learn-status.unstarted{background:#edf5e5;color:#617150}.learn-status.active{background:#f8ede2;color:#765e48}.learn-status.milestone{background:#eef1f8;color:#59647b}.learn-status.needs_sync{background:#fff1d9;color:#7a5d2b}
    .learn-block{margin-top:8px;padding:8px;border-radius:11px;background:#f8f5f2;border:1px solid #eee6e1}.unstarted .learn-block{background:#f6faef;border-color:#e4ecd9}
    .learn-label{font-size:7px;font-weight:950;color:#988b83;letter-spacing:.04em}.learn-lecture{font-size:9px;font-weight:900;line-height:1.5;color:#4f4945;margin-top:2px;word-break:break-word}.learn-date{font-size:7px;color:#9b8f88;margin-top:3px}
    .learn-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.learn-action{appearance:none;border:1px solid #e2d8d1;background:#fff;border-radius:999px;padding:6px 8px;font:900 7.5px inherit;color:#625b56;text-decoration:none;cursor:pointer}.learn-action.primary{background:#626d68;color:#fff;border-color:#626d68}.learn-action.spark{background:#eef6e8;color:#596b4b;border-color:#d8e5cf}.learn-action[disabled]{opacity:.48;cursor:default}
    .learn-note{font-size:7px;color:#9b8e87;margin-top:7px;line-height:1.45}.learning-empty{padding:18px;text-align:center;font-size:9px;color:#8d817a}
    .copy-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(14px);z-index:9999;background:#504b47;color:white;border-radius:999px;padding:9px 13px;font-size:9px;font-weight:900;opacity:0;pointer-events:none;transition:.2s ease}.copy-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    @media(max-width:900px){.faculty-learn-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){.learning-nav{padding:8px 7px 0}.learning-head{padding:12px}.learning-content{padding:9px}.learning-head h2{font-size:16px}.faculty-learn-grid{grid-template-columns:1fr;padding:8px}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('section');
  root.className = 'learning-nav';
  root.id = 'faculty-learning-nav';
  root.innerHTML = '<div class="learning-shell"><div class="learning-empty">🎓 学部ごとの学修現在地を読み込み中…</div></div>';
  const progress = document.getElementById('faculty-curriculum-progress');
  if (progress) progress.parentNode.insertBefore(root, progress);
  else atelierFrame.parentNode.insertBefore(root, atelierFrame);

  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = '📋 授業開始文をコピーしたよ';
  document.body.appendChild(toast);

  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  let rows=[];
  let channel=null;
  let collapsed=localStorage.getItem('afoc-learning-collapsed')==='1';
  const campusClosed={
    KAKU:localStorage.getItem('afoc-learning-campus-KAKU')==='1',
    KYURI:localStorage.getItem('afoc-learning-campus-KYURI')==='1'
  };

  const esc=(v)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const safeUrl=(v)=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch(_){return ''}};
  const campusName=(code)=>code==='KAKU'?'🌿 格物致知キャンパス':code==='KYURI'?'🏛️ 究理キャンパス':code;
  const statusMeta=(s)=>({
    unstarted:['🌱 まだ未受講','unstarted'],
    active:['📚 受講中','active'],
    milestone:['🎓 ひと区切り到達','milestone'],
    needs_sync:['⚠️ 記録差分','needs_sync']
  }[s]||['📚 学修中','active']);

  function dateLabel(v){
    if(!v)return '';
    const d=new Date(v);if(!Number.isFinite(d.getTime()))return '';
    return d.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric'});
  }

  function buildPrompt(r){
    const first=r.learning_status==='unstarted';
    const opening=first
      ? `篤史、Atlas大学の${r.faculty_name}を初めて受けます！`
      : `篤史、Atlas大学の${r.faculty_name}の続きを受けたいです！`;
    const lines=[opening,'',`次の授業：${r.next_lecture_title||r.next_lecture_id||'正本から確認してね'}`];
    if(r.next_reading_url)lines.push(`Reading Book：${r.next_reading_url}`);
    lines.push('','Notion上の最新正本・LRDB・ACDBを確認して、この日の日次チャット内で正式受講を開始してください。');
    return lines.join('\n');
  }

  async function copyText(text){
    try{await navigator.clipboard.writeText(text)}catch(_){
      const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
    }
    toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1500);
  }

  function actionLink(url,label,klass=''){
    const href=safeUrl(url);
    return href?`<a class="learn-action ${klass}" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`:`<button class="learn-action ${klass}" type="button" disabled>${label}</button>`;
  }

  function renderCard(r){
    const [statusLabel,statusClass]=statusMeta(r.learning_status);
    const first=r.learning_status==='unstarted';
    const lastBlock=first?'':`<div class="learn-block"><div class="learn-label">🕘 最後に受けた授業</div><div class="learn-lecture">${esc(r.last_lecture_title||r.last_lecture_id||'記録確認中')}</div>${r.last_completed_at?`<div class="learn-date">${esc(dateLabel(r.last_completed_at))}</div>`:''}<div class="learn-actions">${actionLink(r.last_compass_url,r.last_compass_url?'🧭 Atlas Compass':'🧭 Compass 未登録')}</div></div>`;
    const nextLabel=first?'✨ 最初の授業':'▶️ 次の授業';
    const copyLabel=first?'📋 この学部をはじめる！':'📋 授業開始文をコピー';
    return `<article class="learn-card ${statusClass}" data-faculty="${esc(r.faculty_code)}">
      <div class="learn-card-top"><div><div class="learn-code">${esc(r.faculty_code)}</div><div class="learn-name">${esc(r.faculty_name)}</div></div><span class="learn-status ${statusClass}">${statusLabel}</span></div>
      ${lastBlock}
      <div class="learn-block"><div class="learn-label">${nextLabel}</div><div class="learn-lecture">${esc(r.next_lecture_title||r.next_lecture_id||'初回講義を正本確認中')}</div><div class="learn-actions">${actionLink(r.next_reading_url,r.next_reading_url?'📖 Reading Book':'📖 Reading Book 準備中','spark')}<button class="learn-action primary copy-start" type="button">${copyLabel}</button></div></div>
      ${r.source_note?`<div class="learn-note">${esc(r.source_note)}</div>`:''}
    </article>`;
  }

  function renderCampus(code){
    const list=rows.filter(r=>r.campus_code===code).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    if(!list.length)return '';
    const started=list.filter(r=>r.learning_status!=='unstarted').length;
    const closed=!!campusClosed[code];
    return `<section class="learning-campus" data-campus="${esc(code)}"><header class="campus-head"><div><h3>${campusName(code)}</h3><span>${started}学部で受講履歴あり・${list.length-started}学部はまだ未受講</span></div><button type="button" class="campus-toggle">${closed?'開く':'たたむ'}</button></header><div class="faculty-learn-grid" ${closed?'hidden':''}>${list.map(renderCard).join('')}</div></section>`;
  }

  function bind(){
    root.querySelector('.learning-toggle')?.addEventListener('click',()=>{collapsed=!collapsed;localStorage.setItem('afoc-learning-collapsed',collapsed?'1':'0');render()});
    root.querySelectorAll('.learning-campus').forEach(sec=>{
      sec.querySelector('.campus-toggle')?.addEventListener('click',()=>{const code=sec.dataset.campus;campusClosed[code]=!campusClosed[code];localStorage.setItem(`afoc-learning-campus-${code}`,campusClosed[code]?'1':'0');render()});
    });
    root.querySelectorAll('.learn-card').forEach(card=>{
      card.querySelector('.copy-start')?.addEventListener('click',()=>{const r=rows.find(x=>x.faculty_code===card.dataset.faculty);if(r)copyText(buildPrompt(r))});
    });
  }

  function render(){
    root.innerHTML=`<div class="learning-shell"><header class="learning-head"><div><div class="learning-eyebrow">ATLAS LEARNING CONTINUATION</div><h2>🎓 学修のつづき</h2><p>学部ごとに「前回 → Compass → 次回 → Reading → 授業開始」をつなぐ。</p></div><button class="learning-toggle" type="button">${collapsed?'🎓 開く':'▴ たたむ'}</button></header><div class="learning-content" ${collapsed?'hidden':''}>${rows.length?renderCampus('KAKU')+renderCampus('KYURI'):'<div class="learning-empty">学修現在地はまだ同期されていないよ。</div>'}</div></div>`;
    bind();
  }

  async function load(){
    const {data:sessionData}=await client.auth.getSession();if(!sessionData?.session)return;
    const {data,error}=await client.from('faculty_learning_navigation').select('*').eq('student_id','STU-1').order('sort_order');
    if(error){console.error('learning navigation load failed',error);return}
    rows=data||[];render();
  }

  async function startRealtime(){
    if(channel)await client.removeChannel(channel);
    channel=client.channel('afoc-learning-nav').on('postgres_changes',{event:'*',schema:'public',table:'faculty_learning_navigation'},()=>load()).subscribe();
  }

  client.auth.onAuthStateChange((_e,session)=>{if(session)setTimeout(()=>{load();startRealtime()},80)});
  setTimeout(()=>{load();startRealtime()},350);
  setInterval(load,60_000);
})();
