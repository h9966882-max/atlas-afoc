(() => {
  const config = window.AFOC_CONFIG || {};
  const app = document.getElementById('app');
  const atelierFrame = document.getElementById('atelier-frame');
  if (!app || !atelierFrame || !config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) return;

  const style = document.createElement('style');
  style.textContent = `
    .curriculum-board{padding:12px 12px 2px;background:linear-gradient(180deg,rgba(250,246,242,.96),rgba(247,241,238,.92));border-bottom:1px solid #eaded6}
    .curriculum-shell{max-width:1180px;margin:0 auto;background:rgba(255,253,250,.96);border:1px solid #eaded6;border-radius:24px;box-shadow:0 12px 35px rgba(78,59,48,.08);overflow:hidden}
    .curriculum-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 16px 11px;border-bottom:1px solid #eee3dc}
    .curriculum-eyebrow{font-size:8px;font-weight:900;letter-spacing:.14em;color:#a1847e}.curriculum-head h2{font-size:18px;margin:2px 0 1px;letter-spacing:-.03em}.curriculum-head p{font-size:9px;color:#827871;margin:0;line-height:1.55}
    .curriculum-toggle{border:1px solid #e5d9d1;background:#f7efe9;color:#675d57;border-radius:999px;padding:7px 10px;font:900 8px inherit;white-space:nowrap;cursor:pointer}
    .curriculum-content{padding:13px 15px 15px}.curriculum-content[hidden]{display:none!important}
    .map-section-title{font-size:8px;font-weight:950;letter-spacing:.11em;color:#927f76;margin:2px 2px 7px}.map-section-title:not(:first-child){margin-top:16px;padding-top:14px;border-top:1px dashed #eaded6}
    .campus-progress-card,.faculty-progress-card{border:1px solid #eaded6;border-radius:20px;background:#fffdfb;padding:12px;margin-bottom:10px}
    .campus-progress-card{background:linear-gradient(150deg,#f9f2e8,#fffdf9)}
    .campus-top,.faculty-top{display:grid;grid-template-columns:1.35fr repeat(3,minmax(110px,.55fr));gap:8px;margin-bottom:10px}
    .campus-identity,.campus-stat,.faculty-identity,.faculty-stat{border:1px solid #eaded6;border-radius:16px;background:#fff;padding:11px 12px}
    .campus-identity{background:linear-gradient(135deg,#efe8da,#fbf8f1)}.faculty-identity{background:linear-gradient(135deg,#f4ece6,#fbf8f4)}
    .campus-identity .label,.faculty-identity .label{font-size:8px;color:#9a837b;font-weight:900}.campus-identity b,.faculty-identity b{display:block;font-size:18px;margin:2px 0}.campus-identity span,.faculty-identity span{font-size:9px;color:#7a716b;line-height:1.5}
    .campus-stat small,.faculty-stat small{display:block;font-size:7px;color:#9b8e87;font-weight:900;margin-bottom:3px}.campus-stat strong,.faculty-stat strong{display:block;font-size:16px;letter-spacing:-.03em}.campus-stat em,.faculty-stat em{display:block;font-style:normal;font-size:7.5px;color:#7d746f;margin-top:2px;line-height:1.4}
    .material-lanes{display:grid;grid-template-columns:1fr 1fr;gap:10px}.material-lane{border:1px solid #eaded6;border-radius:18px;background:#fff;padding:12px;min-width:0}.material-lane.lecture{background:linear-gradient(145deg,#fffaf4,#fff)}.material-lane.reading{background:linear-gradient(145deg,#fffdf2,#fff)}
    .lane-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.lane-title{font-size:12px;font-weight:950}.lane-title small{display:block;font-size:7px;font-weight:800;color:#998b84;margin-top:2px}.lane-remain{text-align:right;font-size:8px;color:#776c66}.lane-remain b{display:block;font-size:11px;color:#4d4946}
    .progress-row{margin-top:10px}.progress-meta{display:flex;justify-content:space-between;gap:10px;font-size:8px;font-weight:900;margin-bottom:4px}.progress-track{height:8px;background:#eee8e3;border-radius:99px;overflow:hidden}.progress-fill{height:100%;border-radius:99px}.lecture .progress-fill{background:#8d755f}.reading .progress-fill{background:#8a9271}
    .current-work{margin-top:10px;padding:10px;border-radius:13px;background:#f7f3ef;border:1px solid #eee5df}.current-kicker{font-size:7px;color:#9b8b83;font-weight:900;letter-spacing:.08em}.current-title{font-size:11px;font-weight:950;margin:2px 0}.current-unit{font-size:8px;font-weight:850;color:#655d58}.current-phase,.current-next{font-size:8px;line-height:1.55;color:#756c66;margin-top:5px}.current-next b{color:#58514d}.live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#789079;margin-right:4px}.live-age{font-size:7px;color:#998e88;margin-top:6px}
    .curriculum-alert{margin-top:8px;border:1px solid #ead5a6;background:#fff8df;border-radius:12px;padding:8px 9px;font-size:8px;line-height:1.55;color:#6e6044}.curriculum-alert b{font-size:8.5px}.curriculum-ok{border-color:#d6e2cf;background:#f1f6ed;color:#52624d}.curriculum-info{border-color:#d9dce5;background:#f5f6f9;color:#5e6470}
    .phase-title{font-size:8px;font-weight:950;color:#786e68;margin:11px 1px 6px}.phase-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.phase-chip{border:1px solid #e8ddd6;border-radius:11px;background:#faf7f4;padding:7px;min-width:0}.phase-chip.current{background:#eef3e9;border-color:#d4dfca;box-shadow:inset 0 0 0 1px #dbe5d2}.phase-chip b{display:block;font-size:7.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.phase-chip span{display:block;font-size:6.5px;color:#90857e;margin-top:2px;line-height:1.4}.phase-chip em{display:block;font-style:normal;font-size:7px;font-weight:900;margin-top:5px}
    .campus-segment-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}.campus-segment{border:1px solid #e5dacd;border-radius:13px;background:rgba(255,255,255,.72);padding:9px;min-width:0}.campus-segment b{display:block;font-size:8.5px;margin-bottom:3px}.campus-segment .range{display:block;font-size:6.7px;color:#82776f;line-height:1.4;min-height:19px}.campus-segment .count{font-size:7.2px;font-weight:900;margin-top:5px}.campus-segment .status{display:block;font-size:6.5px;line-height:1.45;color:#7d716a;margin-top:3px}
    .canon-links{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.canon-links a{text-decoration:none;font-size:7px;font-weight:900;color:#625b56;border:1px solid #e4d9d1;background:#fff;border-radius:999px;padding:6px 8px}.curriculum-foot{font-size:7px;color:#978b84;margin-top:8px;line-height:1.55}
    .curriculum-loading{padding:18px;text-align:center;font-size:9px;color:#8c817a}
    @media(max-width:760px){.campus-top,.faculty-top{grid-template-columns:1fr 1fr}.campus-identity,.faculty-identity{grid-column:1/-1}.material-lanes{grid-template-columns:1fr}.phase-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.campus-segment-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.curriculum-board{padding:8px 7px 1px}.curriculum-head{padding:12px}.curriculum-content{padding:10px}.curriculum-head h2{font-size:16px}}
    @media(max-width:430px){.campus-top,.faculty-top{grid-template-columns:1fr}.campus-identity,.faculty-identity{grid-column:auto}.phase-strip{grid-template-columns:1fr}.campus-segment-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('section');
  root.id = 'faculty-curriculum-progress';
  root.className = 'curriculum-board';
  root.innerHTML = '<div class="curriculum-shell"><div class="curriculum-loading">📚 教材開発マップを読み込み中…</div></div>';
  atelierFrame.parentNode.insertBefore(root, atelierFrame);

  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let snapshot = { campuses: [], faculties: [], rooms: [], health: [] };
  let channel = null;
  let collapsed = localStorage.getItem('afoc-curriculum-collapsed') === '1';
  const facultyOrder = { PHL:1, REL:2, HIS:3, PSY:4, STR:5, ECO:6, BUS:7 };
  const facultyIcon = { PHL:'🏛️', REL:'🕯️', HIS:'📜', PSY:'🧠', STR:'♟️', ECO:'📈', BUS:'🛒' };

  const esc = (value) => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const num = (value) => Number(value || 0).toLocaleString();

  function percent(done,total){
    if(!total) return 0;
    return Math.max(0,Math.min(100,(Number(done||0)/Number(total))*100));
  }

  function age(value){
    if(!value) return 'Live未記録';
    const t = new Date(value).getTime();
    if(!Number.isFinite(t)) return 'Live未記録';
    const m = Math.max(0,Math.floor((Date.now()-t)/60000));
    if(m<1) return 'たった今';
    if(m<60) return `${m}分前`;
    const h=Math.floor(m/60);
    return h<24?`${h}時間前`:`${Math.floor(h/24)}日前`;
  }

  function canonDate(value){
    return value?new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'未記録';
  }

  function roomFor(facultyCode,material){
    return snapshot.rooms.find((r)=>r.faculty_code===facultyCode && r.material_type===material) || null;
  }

  function healthFor(roomId){
    return snapshot.health.find((h)=>h.id===roomId) || null;
  }

  function safeUrl(value){
    try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch(_){return ''}
  }

  function courseParts(code){
    const m=String(code||'').match(/^([A-Z]+)(\d{3})$/);
    return m?{prefix:m[1],num:Number(m[2])}:null;
  }

  function currentPhaseIndex(room,segments){
    const code=String(room?.current_course_code||'');
    if(!code)return -1;
    const parts=courseParts(code);
    const direct=segments.findIndex((s)=>Array.isArray(s.course_codes)&&s.course_codes.includes(code));
    if(direct>=0)return direct;
    if(parts){
      const ranged=segments.findIndex((s)=>{
        const prefixes=Array.isArray(s.course_prefixes)?s.course_prefixes:[s.course_prefix].filter(Boolean);
        if(prefixes.length && !prefixes.includes(parts.prefix))return false;
        const start=Number(s.start_num),end=Number(s.end_num);
        return Number.isFinite(start)&&Number.isFinite(end)&&parts.num>=start&&parts.num<=end;
      });
      if(ranged>=0)return ranged;
    }
    return -1;
  }

  function laneCurrent(room,icon){
    if(!room) return `<div class="current-work"><div class="current-kicker">LIVE CURRENT</div><div class="current-title">${icon} Live未接続</div></div>`;
    const health=healthFor(room.id);
    return `<div class="current-work">
      <div class="current-kicker"><span class="live-dot"></span>LIVE CURRENT · ${esc(room.status||'未同期')}</div>
      <div class="current-title">${esc(room.current_course_code||'未同期')}</div>
      <div class="current-unit">${esc(room.current_unit||'単位未同期')}</div>
      <div class="current-phase">${esc(room.current_phase||'工程未同期')}</div>
      <div class="current-next"><b>次：</b>${esc(room.next_step||'未同期')}</div>
      <div class="live-age">最終Live：${esc(age(health?.last_heartbeat_at||room.last_heartbeat_at))}</div>
    </div>`;
  }

  function renderCampus(c){
    const segments=Array.isArray(c.segments)?c.segments:[];
    const lbBodyPct=percent(c.lecture_body_units,c.total_units);
    const lbOpenPct=percent(c.lecture_open_units,c.total_units);
    const lbMaturePct=percent(c.lecture_mature_units,c.total_units);
    const rbPct=percent(c.reading_ready_units,c.total_units);
    const allTotal=Number(c.total_units||0)*2;
    const allExisting=Number(c.lecture_body_units||0)+Number(c.reading_ready_units||0);

    return `<article class="campus-progress-card">
      <div class="campus-top">
        <div class="campus-identity"><span class="label">CAMPUS CURRICULUM</span><b>🏫 ${esc(c.campus_name)}</b><span>基幹教材スコープ｜${num(c.total_courses)}科目・${num(c.total_units)}講</span></div>
        <div class="campus-stat"><small>📚 教材本文・開架</small><strong>${allExisting.toLocaleString()} / ${allTotal.toLocaleString()}</strong><em>Lecture + Reading の基幹教材</em></div>
        <div class="campus-stat"><small>📙 Lecture Book</small><strong>${num(c.lecture_open_units)} / ${num(c.total_units)}</strong><em>本文・検索カタログ開架</em></div>
        <div class="campus-stat"><small>📗 Reading Book</small><strong>${num(c.reading_ready_units)} / ${num(c.total_units)}</strong><em>品質適合正本・正式開架</em></div>
      </div>
      <div class="material-lanes">
        <section class="material-lane lecture">
          <div class="lane-head"><div class="lane-title">📙 Lecture Book<small>存在・開架とVersion成熟度を分けて表示</small></div><div class="lane-remain">本文・開架<b>${num(c.lecture_open_units)} / ${num(c.total_units)}</b></div></div>
          <div class="progress-row"><div class="progress-meta"><span>本文存在</span><span>${num(c.lecture_body_units)} / ${num(c.total_units)}｜${lbBodyPct.toFixed(1)}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${lbBodyPct}%"></div></div></div>
          <div class="progress-row"><div class="progress-meta"><span>検索カタログ開架</span><span>${num(c.lecture_open_units)} / ${num(c.total_units)}｜${lbOpenPct.toFixed(1)}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${lbOpenPct}%"></div></div></div>
          <div class="progress-row"><div class="progress-meta"><span>既存品質整備基盤</span><span>${num(c.lecture_mature_units)} / ${num(c.total_units)}｜${lbMaturePct.toFixed(1)}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${lbMaturePct}%"></div></div></div>
          <div class="curriculum-alert"><b>📌 第3期75講は「未制作」ではない</b><br>本文・検索カタログ開架は完了。Version 0.1系を含むため、FP＋第1期＋第2期の206講と成熟度を分けて表示している。</div>
        </section>
        <section class="material-lane reading">
          <div class="lane-head"><div class="lane-title">📗 Reading Book<small>品質適合済み正本の実測</small></div><div class="lane-remain">正式開架<b>${num(c.reading_ready_units)} / ${num(c.total_units)}</b></div></div>
          <div class="progress-row"><div class="progress-meta"><span>品質適合正本・正式開架</span><span>${num(c.reading_ready_units)} / ${num(c.total_units)}｜${rbPct.toFixed(1)}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${rbPct}%"></div></div></div>
          <div class="curriculum-alert curriculum-ok"><b>✅ 基幹Reading Book制作 281 / 281</b><br>FP56冊＋第1期75冊＋第2期75冊＋第3期75冊。制作・監査・正本化・正式開架まで到達。</div>
        </section>
      </div>
      ${segments.length?`<div class="phase-title">格物致知キャンパス｜教材群別の現在地</div><div class="campus-segment-grid">${segments.map((s)=>`<div class="campus-segment"><b>${esc(s.label)}｜${num(s.courses)}科目・${num(s.units)}講</b><span class="range">${esc(s.range||'')}</span><div class="count">📙 ${num(s.lecture_units)}/${num(s.units)}　📗 ${num(s.reading_units)}/${num(s.units)}</div><span class="status">Lecture：${esc(s.lecture_status||'未記録')}</span><span class="status">Reading：${esc(s.reading_status||'未記録')}</span></div>`).join('')}</div>`:''}
      <div class="canon-links">
        ${safeUrl(c.curriculum_canon_url)?`<a href="${esc(safeUrl(c.curriculum_canon_url))}" target="_blank" rel="noopener">↗ 科目・講義制作親台帳</a>`:''}
        ${safeUrl(c.lecture_canon_url)?`<a href="${esc(safeUrl(c.lecture_canon_url))}" target="_blank" rel="noopener">↗ Lecture検索カタログ</a>`:''}
        ${safeUrl(c.reading_canon_url)?`<a href="${esc(safeUrl(c.reading_canon_url))}" target="_blank" rel="noopener">↗ Reading本棚</a>`:''}
      </div>
      <div class="curriculum-foot">正本集計：${esc(canonDate(c.canon_checked_at))} JST｜${esc(c.note||'')}</div>
    </article>`;
  }

  function renderSegment(s,i,phaseNow,hasUnitTotal){
    const courses=Number(s.courses||0);
    const bodyCourses=Number(s.body_courses||0);
    const readyCourses=Number(s.lecture_ready_courses||0);
    const readingCourses=Number(s.reading_ready_courses||0);
    const units=Number(s.units||0);
    const unitLine=hasUnitTotal&&units>0
      ? `<em>🐅 正式提供 ${num(s.lecture_ready_units||0)}/${num(units)}講</em>${s.reading_ready_units!=null?`<span>🐥 開架 ${num(s.reading_ready_units)}/${num(units)}冊</span>`:''}`
      : `<em>🐅 本文 ${bodyCourses}/${courses}科目</em><span>正式提供 ${readyCourses}科目｜🐥 開架 ${readingCourses}科目</span>`;
    return `<div class="phase-chip ${i===phaseNow?'current':''}"><b>${esc(s.range||'')}</b><span>${esc(s.label||'')}</span>${unitLine}</div>`;
  }

  function renderFaculty(f){
    const lecture=roomFor(f.faculty_code,'lecture');
    const reading=roomFor(f.faculty_code,'reading');
    const segments=Array.isArray(f.segments)?f.segments:[];
    const partial=f.reading_partial && Object.keys(f.reading_partial).length?f.reading_partial:null;
    const phaseNow=Math.max(currentPhaseIndex(lecture,segments),currentPhaseIndex(reading,segments));
    const hasUnitTotal=Number(f.total_units)>0;
    const bodyBase=hasUnitTotal?Number(f.lecture_body_units||0):Number(f.lecture_body_courses||0);
    const bodyTotal=hasUnitTotal?Number(f.total_units||0):Number(f.total_courses||0);
    const lectureBase=hasUnitTotal?Number(f.lecture_ready_units||0):Number(f.lecture_ready_courses||0);
    const lectureTotal=hasUnitTotal?Number(f.total_units||0):Number(f.total_courses||0);
    const readingBase=hasUnitTotal?Number(f.reading_ready_units||0):Number(f.reading_ready_courses||0);
    const readingTotal=hasUnitTotal?Number(f.total_units||0):Number(f.total_courses||0);
    const bodyPct=percent(bodyBase,bodyTotal);
    const lecturePct=percent(lectureBase,lectureTotal);
    const readingPct=percent(readingBase,readingTotal);
    const scopeText=hasUnitTotal
      ? `${num(f.total_courses)}科目・${num(f.total_units)}講`
      : `${num(f.total_courses)}科目｜学部全講数は各シラバス確定に連動`;
    const bodyStrong=hasUnitTotal?`${num(f.lecture_body_units)} / ${num(f.total_units)}`:`${num(f.lecture_body_courses)} / ${num(f.total_courses)} 科目`;
    const bodyEm=hasUnitTotal?`${num(f.lecture_body_courses)}科目ぶん存在`:'完了科目ベース。現在科目の途中経過はLive欄に表示';
    const readyStrong=hasUnitTotal?`${num(f.lecture_ready_units)}講`:`${num(f.lecture_ready_courses)}科目`;
    const readyRemain=hasUnitTotal?`${num(f.lecture_remaining_courses)}科目・${num(f.lecture_remaining_units)}講`:`${num(f.lecture_remaining_courses)}科目`;
    const readingStrong=hasUnitTotal?`${num(f.reading_ready_units)}冊`:`${num(f.reading_ready_courses)}科目`;
    const readingRemain=hasUnitTotal?`${num(f.reading_remaining_courses)}科目・${num(f.reading_remaining_units)}冊`:`${num(f.reading_remaining_courses)}科目`;
    const icon=facultyIcon[f.faculty_code]||'🏛️';

    return `<article class="faculty-progress-card" data-faculty-progress="${esc(f.faculty_code)}">
      <div class="faculty-top">
        <div class="faculty-identity"><span class="label">FACULTY CURRICULUM</span><b>${icon} ${esc(f.faculty_name)}</b><span>正本カリキュラム規模｜${scopeText}</span></div>
        <div class="faculty-stat"><small>🐅 Lecture本文</small><strong>${bodyStrong}</strong><em>${bodyEm}</em></div>
        <div class="faculty-stat"><small>🐅 正式提供済み</small><strong>${readyStrong}</strong><em>${num(f.lecture_ready_courses)}科目｜残り ${num(f.lecture_remaining_courses)}科目</em></div>
        <div class="faculty-stat"><small>🐥 Reading正式開架</small><strong>${readingStrong}</strong><em>完了${num(f.reading_ready_courses)}科目${partial?'＋部分開架あり':''}</em></div>
      </div>
      <div class="material-lanes">
        <section class="material-lane lecture">
          <div class="lane-head"><div class="lane-title">🐅 Lecture Book<small>本文完成と「正式に履修できる」を分けて表示</small></div><div class="lane-remain">正式提供 残り<b>${readyRemain}</b></div></div>
          <div class="progress-row"><div class="progress-meta"><span>本文存在</span><span>${hasUnitTotal?`${num(f.lecture_body_units)} / ${num(f.total_units)}｜`: `${num(f.lecture_body_courses)} / ${num(f.total_courses)}科目｜`}${bodyPct.toFixed(1)}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${bodyPct}%"></div></div></div>
          <div class="progress-row"><div class="progress-meta"><span>正式提供</span><span>${hasUnitTotal?`${num(f.lecture_ready_units)} / ${num(f.total_units)}｜`: `${num(f.lecture_ready_courses)} / ${num(f.total_courses)}科目｜`}${lecturePct.toFixed(1)}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${lecturePct}%"></div></div></div>
          ${!hasUnitTotal?`<div class="curriculum-alert curriculum-info"><b>ℹ️ 学部全講数はまだ固定しない</b><br>科目総数は正本カリキュラムで確定済み。未設計科目の講数は、シラバスが正本化された時点でAFOCへ加算する。</div>`:''}
          ${laneCurrent(lecture,'🐅')}
        </section>
        <section class="material-lane reading">
          <div class="lane-head"><div class="lane-title">🐥 Reading Book<small>正式開架済みの実測値を表示</small></div><div class="lane-remain">正式開架 残り<b>${readingRemain}</b></div></div>
          <div class="progress-row"><div class="progress-meta"><span>正式開架</span><span>${hasUnitTotal?`${num(f.reading_ready_units)} / ${num(f.total_units)}｜`: `${num(f.reading_ready_courses)} / ${num(f.total_courses)}科目｜`}${readingPct.toFixed(1)}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${readingPct}%"></div></div></div>
          ${partial?`<div class="curriculum-alert"><b>⚠️ ${esc(partial.course_code)}｜${esc(partial.title||'部分開架')}：${num(partial.ready_units)}/${num(partial.total_units)} 正式開架</b><br>${esc(partial.reason||`残り${num(partial.pending_units)}冊は正式化待ち。`)}</div>`:''}
          ${laneCurrent(reading,'🐥')}
        </section>
      </div>
      ${segments.length?`<div class="phase-title">${esc(f.faculty_name)}カリキュラム全体｜群別の位置</div><div class="phase-strip">${segments.map((s,i)=>renderSegment(s,i,phaseNow,hasUnitTotal)).join('')}</div>`:''}
      <div class="canon-links">
        ${safeUrl(f.curriculum_canon_url)?`<a href="${esc(safeUrl(f.curriculum_canon_url))}" target="_blank" rel="noopener">↗ カリキュラム正本</a>`:''}
        ${safeUrl(f.lecture_canon_url)?`<a href="${esc(safeUrl(f.lecture_canon_url))}" target="_blank" rel="noopener">↗ Lecture全体監査</a>`:''}
        ${safeUrl(f.reading_canon_url)?`<a href="${esc(safeUrl(f.reading_canon_url))}" target="_blank" rel="noopener">↗ Reading書架</a>`:''}
      </div>
      <div class="curriculum-foot">正本集計：${esc(canonDate(f.canon_checked_at))} JST｜固定総数・正式状態＝Notion正本、現在作業＝開発室Live。${f.note?` ${esc(f.note)}`:''}</div>
    </article>`;
  }

  function render(){
    const campuses=snapshot.campuses||[];
    const faculties=[...(snapshot.faculties||[])].sort((a,b)=>(facultyOrder[a.faculty_code]||99)-(facultyOrder[b.faculty_code]||99));
    const campusHtml=campuses.length?`<div class="map-section-title">🏫 CAMPUS OVERVIEW｜キャンパス教材の全体像</div>${campuses.map(renderCampus).join('')}`:'';
    const facultyHtml=faculties.length?`<div class="map-section-title">🏛️ FACULTY DEVELOPMENT｜究理キャンパス7学部</div>${faculties.map(renderFaculty).join('')}`:'';
    root.innerHTML=`<div class="curriculum-shell">
      <header class="curriculum-head"><div><div class="curriculum-eyebrow">ATLAS CURRICULUM DEVELOPMENT MAP</div><h2>📚 キャンパス・学部 教材開発進捗</h2><p>「全部でどれだけある？ 今どこ？ 何が完成？ あとどれだけ？」を正本＋Liveで見る。</p></div><button class="curriculum-toggle" type="button">${collapsed?'📚 進捗を開く':'▴ たたむ'}</button></header>
      <div class="curriculum-content" ${collapsed?'hidden':''}>${campusHtml}${facultyHtml}${!campusHtml&&!facultyHtml?'<div class="curriculum-loading">正本集計済みの教材マップはまだないよ。</div>':''}</div>
    </div>`;
    root.querySelector('.curriculum-toggle')?.addEventListener('click',()=>{
      collapsed=!collapsed;
      localStorage.setItem('afoc-curriculum-collapsed',collapsed?'1':'0');
      render();
    });
  }

  async function load(){
    const {data:sessionData}=await client.auth.getSession();
    if(!sessionData?.session)return;
    const [cResult,fResult,rResult,hResult]=await Promise.all([
      client.from('campus_curriculum_progress').select('*').order('campus_code'),
      client.from('faculty_curriculum_progress').select('*'),
      client.from('development_rooms').select('id,faculty_code,faculty_name,material_type,status,current_course_code,current_unit,current_phase,next_step,last_heartbeat_at,state_source').eq('is_unlocked',true),
      client.from('afoc_room_health').select('id,health,last_heartbeat_at')
    ]);
    if(cResult.error||fResult.error||rResult.error||hResult.error){
      console.error('curriculum progress load failed',cResult.error||fResult.error||rResult.error||hResult.error);return;
    }
    snapshot={campuses:cResult.data||[],faculties:fResult.data||[],rooms:rResult.data||[],health:hResult.data||[]};
    render();
  }

  async function startRealtime(){
    if(channel)await client.removeChannel(channel);
    channel=client.channel('afoc-curriculum-map')
      .on('postgres_changes',{event:'*',schema:'public',table:'campus_curriculum_progress'},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'faculty_curriculum_progress'},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'development_rooms'},()=>load())
      .subscribe();
  }

  client.auth.onAuthStateChange((_event,session)=>{if(session)window.setTimeout(()=>{load();startRealtime()},80)});
  window.setInterval(load,60_000);
  window.setTimeout(()=>{load();startRealtime()},300);
})();
