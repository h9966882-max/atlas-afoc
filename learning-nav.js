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
    .learning-jump{margin:0 0 10px;padding:9px 10px;border:1px solid #eaded6;border-radius:15px;background:linear-gradient(135deg,#fff,#faf7f3)}
    .learning-jump-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}.learning-jump-head b{font-size:8px;color:#746a64}.learning-jump-head span{font-size:7px;color:#9b8e86}
    .learning-jump-rail{display:flex;gap:5px;overflow-x:auto;padding:1px 1px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.learning-jump-rail::-webkit-scrollbar{display:none}
    .learning-jump-chip{flex:0 0 auto;border:1px solid #e4d9d2;background:#fff;color:#625b56;border-radius:999px;padding:6px 8px;font:950 7.5px inherit;cursor:pointer;white-space:nowrap}.learning-jump-chip.foundation{background:#f6f2fb;border-color:#ded6eb;color:#695f78}.learning-jump-chip.kaku{background:#f4f8ef;border-color:#dce6d3;color:#5e6c53}.learning-jump-chip.kyuri{background:#f2f4f7;border-color:#dce1e8;color:#5e6673}.learning-jump-chip.all{background:#f7efe9}
    .learning-campus{margin-top:9px;border:1px solid #eaded6;border-radius:18px;background:#fff;overflow:hidden;scroll-margin-top:12px}.learning-campus:first-child{margin-top:0}
    .learning-campus.foundation{border-color:#ddd8e8;background:linear-gradient(145deg,#fbf9ff,#fff)}
    .learning-campus.foundation .campus-head{background:linear-gradient(135deg,#f5f2fb,#faf8ff)}
    .learning-campus.foundation .faculty-learn-grid{grid-template-columns:1fr}
    .campus-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#faf7f4;border-bottom:1px solid #eee4dd}.campus-head h3{font-size:12px;margin:0}.campus-head span{font-size:7.5px;color:#938780;font-weight:850}
    .faculty-learn-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px}.faculty-learn-grid[hidden]{display:none!important}
    .learn-card{border:1px solid #eadfd8;border-radius:15px;background:#fff;padding:10px;min-width:0;box-shadow:0 4px 14px rgba(83,66,56,.035);scroll-margin-top:14px;transition:box-shadow .25s ease,transform .25s ease,border-color .25s ease}
    .learn-card.jump-flash{box-shadow:0 0 0 3px rgba(157,137,102,.18),0 10px 28px rgba(83,66,56,.12);transform:translateY(-1px);border-color:#cdbd9f}
    .learn-card.unstarted{background:linear-gradient(145deg,#fbfff6,#fff);border-color:#dfe9d4}.learn-card.active{background:linear-gradient(145deg,#fffaf3,#fff)}
    .learn-card-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.learn-code{font-size:7px;font-weight:950;color:#9d8b82;letter-spacing:.08em}.learn-name{font-size:11px;font-weight:950;margin-top:2px}.learn-status{border-radius:999px;padding:4px 7px;font-size:7px;font-weight:950;white-space:nowrap}.learn-status.unstarted{background:#edf5e5;color:#617150}.learn-status.active{background:#f8ede2;color:#765e48}.learn-status.milestone{background:#eef1f8;color:#59647b}.learn-status.needs_sync{background:#fff1d9;color:#7a5d2b}
    .learn-block{margin-top:8px;padding:8px;border-radius:11px;background:#f8f5f2;border:1px solid #eee6e1}.unstarted .learn-block{background:#f6faef;border-color:#e4ecd9}
    .learn-label{font-size:7px;font-weight:950;color:#988b83;letter-spacing:.04em}.learn-lecture{font-size:9px;font-weight:900;line-height:1.5;color:#4f4945;margin-top:2px;word-break:break-word}.learn-date{font-size:7px;color:#9b8f88;margin-top:3px}
    .learn-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.learn-action{appearance:none;border:1px solid #e2d8d1;background:#fff;border-radius:999px;padding:6px 8px;font:900 7.5px inherit;color:#625b56;text-decoration:none;cursor:pointer}.learn-action.primary{background:#626d68;color:#fff;border-color:#626d68}.learn-action.spark{background:#eef6e8;color:#596b4b;border-color:#d8e5cf}.learn-action.issue{background:#fff7e7;color:#745a2c;border-color:#e9d4a8}.learn-action[disabled]{opacity:.48;cursor:default}
    .learn-note{font-size:7px;color:#9b8e87;margin-top:7px;line-height:1.45}.learning-empty{padding:18px;text-align:center;font-size:9px;color:#8d817a}
    .learn-issue{margin-top:8px;padding:8px 9px;border:1px solid #ecd7a7;border-radius:11px;background:#fff9e9}.learn-issue b{display:block;font-size:7.5px;color:#745d34}.learn-issue p{margin:3px 0 0;font-size:7px;line-height:1.5;color:#887450}.learn-issue .learn-actions{margin-top:6px}
    .copy-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(14px);z-index:9999;background:#504b47;color:white;border-radius:999px;padding:9px 13px;font-size:9px;font-weight:900;opacity:0;pointer-events:none;transition:.2s ease;max-width:min(88vw,420px);text-align:center}.copy-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    @media(max-width:900px){.faculty-learn-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){.learning-nav{padding:8px 7px 0}.learning-head{padding:12px}.learning-content{padding:9px}.learning-head h2{font-size:16px}.faculty-learn-grid{grid-template-columns:1fr;padding:8px}.learning-jump{margin-bottom:8px}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('section');
  root.className = 'learning-nav';
  root.id = 'faculty-learning-nav';
  root.innerHTML = '<div class="learning-shell"><div class="learning-empty">🎓 共通基盤＋学部ごとの学修現在地を読み込み中…</div></div>';
  const progress = document.getElementById('faculty-curriculum-progress');
  if (progress) progress.parentNode.insertBefore(root, progress);
  else atelierFrame.parentNode.insertBefore(root, atelierFrame);

  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  document.body.appendChild(toast);

  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  let rows=[];
  let channel=null;
  let collapsed=localStorage.getItem('afoc-learning-collapsed')==='1';
  const campusClosed={
    FOUNDATION:localStorage.getItem('afoc-learning-campus-FOUNDATION')==='1',
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
    const isFoundation=r.faculty_code==='FP';
    const opening=isFoundation
      ? '篤史、Atlas大学の共通基盤課程FPの続きを受けたいです！'
      : first
        ? `篤史、Atlas大学の${r.faculty_name}を初めて受けます！`
        : `篤史、Atlas大学の${r.faculty_name}の続きを受けたいです！`;
    const lines=[opening,'',`次の授業：${r.next_lecture_title||r.next_lecture_id||'正本から確認してね'}`];
    if(r.next_reading_url)lines.push(`Reading Book：${r.next_reading_url}`);
    lines.push('','Notion上の最新正本・LRDB・ACDBを確認して、この日の日次チャット内で正式受講を開始してください。');
    return lines.join('\n');
  }

  function issuesFor(r){
    const issues=[];
    const first=r.learning_status==='unstarted';
    if(r.learning_status==='needs_sync')issues.push('AFOC上で「記録差分」状態になっている。');
    if(!first && r.last_lecture_id && !safeUrl(r.last_compass_url))issues.push(`受講済みの ${r.last_lecture_id} に対応するAtlas Compassが学修ナビへ接続されていない。`);
    if(r.next_lecture_id && !safeUrl(r.next_reading_url))issues.push(`次講義 ${r.next_lecture_id} のReading Bookリンクが学修ナビへ接続されていない。`);
    return [...new Set(issues)];
  }

  function buildIssueMemo(r){
    const issues=issuesFor(r);
    const scope=r.faculty_code==='FP'?'共通基盤課程 FP101〜107':`${r.faculty_code}｜${r.faculty_name}`;
    const lines=[
      'Atlas大学 AFOC｜学修記録確認 Handoff',
      '',
      '篤史、AFOCの「学修のつづき」で確認が必要な状態を見つけました。',
      '',
      `【対象】${scope}`,
      `【AFOC状態】${statusMeta(r.learning_status)[0]}`,
      '',
      '【現在の表示】',
      `最後の授業：${r.last_lecture_title||r.last_lecture_id||'なし／未確認'}`,
      `完了日：${r.last_completed_at?dateLabel(r.last_completed_at):'未記録'}`,
      `Atlas Compass：${safeUrl(r.last_compass_url)||'未登録／未接続'}`,
      `次の授業：${r.next_lecture_title||r.next_lecture_id||'未設定'}`,
      `次のReading Book：${safeUrl(r.next_reading_url)||'未登録／未接続'}`
    ];
    if(safeUrl(r.next_lesson_url))lines.push(`次の受講ページ：${safeUrl(r.next_lesson_url)}`);
    lines.push('','【検出した差分】');
    (issues.length?issues:['AFOC側で確認フラグが立っている。']).forEach(x=>lines.push(`- ${x}`));
    if(r.source_note)lines.push('','【AFOCメモ】',r.source_note);
    lines.push(
      '',
      '【確認してほしいこと】',
      'Notion上の最新の正式運用文書・正本を優先し、LRDB・ACDB・LDB・必要な教材正本を照合してください。',
      '差分の原因を特定し、正本側の不足または同期漏れを必要に応じて修正したうえで、AFOC学修ナビの表示を正本と一致させてください。',
      '推測で受講完了・Compass・教材リンクを新規作成せず、確認できた事実だけで復旧してください。'
    );
    return lines.join('\n');
  }

  async function copyText(text,message='📋 コピーしたよ'){
    try{await navigator.clipboard.writeText(text)}catch(_){
      const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
    }
    toast.textContent=message;
    toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1600);
  }

  function actionLink(url,label,klass=''){
    const href=safeUrl(url);
    return href?`<a class="learn-action ${klass}" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`:`<button class="learn-action ${klass}" type="button" disabled>${label}</button>`;
  }

  function renderCard(r){
    const [statusLabel,statusClass]=statusMeta(r.learning_status);
    const first=r.learning_status==='unstarted';
    const isFoundation=r.faculty_code==='FP';
    const issues=issuesFor(r);
    const lastBlock=first?'':`<div class="learn-block"><div class="learn-label">🕘 最後に受けた授業</div><div class="learn-lecture">${esc(r.last_lecture_title||r.last_lecture_id||'記録確認中')}</div>${r.last_completed_at?`<div class="learn-date">${esc(dateLabel(r.last_completed_at))}</div>`:''}<div class="learn-actions">${actionLink(r.last_compass_url,r.last_compass_url?'🧭 Atlas Compass':'🧭 Compass 未登録')}</div></div>`;
    const nextLabel=first?'✨ 最初の授業':'▶️ 次の授業';
    const copyLabel=isFoundation?'📋 FPの続きを受ける！':first?'📋 この学部をはじめる！':'📋 授業開始文をコピー';
    const issueBlock=issues.length?`<div class="learn-issue"><b>⚠️ 確認したい状態があるよ</b><p>${esc(issues[0])}${issues.length>1?` ほか${issues.length-1}件。`:''}</p><div class="learn-actions"><button class="learn-action issue copy-issue" type="button">🧰 篤史に確認を引き継ぐ</button></div></div>`:'';
    return `<article id="learn-card-${esc(r.faculty_code)}" class="learn-card ${statusClass}" data-faculty="${esc(r.faculty_code)}">
      <div class="learn-card-top"><div><div class="learn-code">${esc(r.faculty_code)}</div><div class="learn-name">${esc(r.faculty_name)}</div></div><span class="learn-status ${statusClass}">${statusLabel}</span></div>
      ${lastBlock}
      <div class="learn-block"><div class="learn-label">${nextLabel}</div><div class="learn-lecture">${esc(r.next_lecture_title||r.next_lecture_id||'初回講義を正本確認中')}</div><div class="learn-actions">${actionLink(r.next_reading_url,r.next_reading_url?'📖 Reading Book':'📖 Reading Book 準備中','spark')}<button class="learn-action primary copy-start" type="button">${copyLabel}</button></div></div>
      ${r.source_note?`<div class="learn-note">${esc(r.source_note)}</div>`:''}
      ${issueBlock}
    </article>`;
  }

  function renderFoundation(){
    const list=rows.filter(r=>r.campus_code==='FOUNDATION').sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    if(!list.length)return '';
    const closed=!!campusClosed.FOUNDATION;
    return `<section class="learning-campus foundation" data-campus="FOUNDATION"><header class="campus-head"><div><h3>🧭 共通基盤課程｜FP101〜107</h3><span>7科目・56講｜学部とは別の共通基盤</span></div><button type="button" class="campus-toggle">${closed?'開く':'たたむ'}</button></header><div class="faculty-learn-grid" ${closed?'hidden':''}>${list.map(renderCard).join('')}</div></section>`;
  }

  function renderCampus(code){
    const list=rows.filter(r=>r.campus_code===code).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    if(!list.length)return '';
    const started=list.filter(r=>r.learning_status!=='unstarted').length;
    const closed=!!campusClosed[code];
    return `<section class="learning-campus" data-campus="${esc(code)}"><header class="campus-head"><div><h3>${campusName(code)}</h3><span>${started}学部で受講履歴あり・${list.length-started}学部はまだ未受講</span></div><button type="button" class="campus-toggle">${closed?'開く':'たたむ'}</button></header><div class="faculty-learn-grid" ${closed?'hidden':''}>${list.map(renderCard).join('')}</div></section>`;
  }

  function jumpClass(r){
    if(r.campus_code==='FOUNDATION')return 'foundation';
    if(r.campus_code==='KAKU')return 'kaku';
    if(r.campus_code==='KYURI')return 'kyuri';
    return '';
  }

  function renderJumpBar(){
    const ordered=[...rows].sort((a,b)=>{
      const group={FOUNDATION:0,KAKU:1,KYURI:2};
      return (group[a.campus_code]??9)-(group[b.campus_code]??9)||(a.sort_order||0)-(b.sort_order||0);
    });
    if(!ordered.length)return '';
    return `<nav class="learning-jump" aria-label="学修ナビの学部ジャンプ"><div class="learning-jump-head"><b>🧭 ピンポイントで移動</b><span>横にスライドできるよ</span></div><div class="learning-jump-rail"><button type="button" class="learning-jump-chip all" data-jump-top="1">全体</button>${ordered.map(r=>`<button type="button" class="learning-jump-chip ${jumpClass(r)}" data-jump-faculty="${esc(r.faculty_code)}" aria-label="${esc(r.faculty_name)}へ移動">${esc(r.faculty_code)}</button>`).join('')}</div></nav>`;
  }

  function jumpToFaculty(code){
    const row=rows.find(r=>r.faculty_code===code);
    if(!row)return;
    if(collapsed){collapsed=false;localStorage.setItem('afoc-learning-collapsed','0')}
    if(campusClosed[row.campus_code]){
      campusClosed[row.campus_code]=false;
      localStorage.setItem(`afoc-learning-campus-${row.campus_code}`,'0');
      render();
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const target=root.querySelector(`#learn-card-${CSS.escape(code)}`);
      if(!target)return;
      target.scrollIntoView({behavior:'smooth',block:'start'});
      target.classList.add('jump-flash');
      setTimeout(()=>target.classList.remove('jump-flash'),1300);
    }));
  }

  function bind(){
    root.querySelector('.learning-toggle')?.addEventListener('click',()=>{collapsed=!collapsed;localStorage.setItem('afoc-learning-collapsed',collapsed?'1':'0');render()});
    root.querySelectorAll('.learning-campus').forEach(sec=>{
      sec.querySelector('.campus-toggle')?.addEventListener('click',()=>{const code=sec.dataset.campus;campusClosed[code]=!campusClosed[code];localStorage.setItem(`afoc-learning-campus-${code}`,campusClosed[code]?'1':'0');render()});
    });
    root.querySelectorAll('.learn-card').forEach(card=>{
      const getRow=()=>rows.find(x=>x.faculty_code===card.dataset.faculty);
      card.querySelector('.copy-start')?.addEventListener('click',()=>{const r=getRow();if(r)copyText(buildPrompt(r),'📋 授業開始文をコピーしたよ')});
      card.querySelector('.copy-issue')?.addEventListener('click',()=>{const r=getRow();if(r)copyText(buildIssueMemo(r),'🧰 篤史への確認メモをコピーしたよ')});
    });
    root.querySelectorAll('[data-jump-faculty]').forEach(button=>button.addEventListener('click',()=>jumpToFaculty(button.dataset.jumpFaculty)));
    root.querySelector('[data-jump-top]')?.addEventListener('click',()=>root.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function render(){
    root.innerHTML=`<div class="learning-shell"><header class="learning-head"><div><div class="learning-eyebrow">ATLAS LEARNING CONTINUATION</div><h2>🎓 学修のつづき</h2><p>共通基盤＋学部ごとに「前回 → Compass → 次回 → Reading → 授業開始」をつなぐ。</p></div><button class="learning-toggle" type="button">${collapsed?'🎓 開く':'▴ たたむ'}</button></header><div class="learning-content" ${collapsed?'hidden':''}>${rows.length?renderJumpBar()+renderFoundation()+renderCampus('KAKU')+renderCampus('KYURI'):'<div class="learning-empty">学修現在地はまだ同期されていないよ。</div>'}</div></div>`;
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
