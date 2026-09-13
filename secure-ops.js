(() => {
  const config = window.AFOC_CONFIG || {};
  const panel = document.getElementById('command-panel');
  const openCommand = document.getElementById('open-command');
  const atelierFrame = document.getElementById('atelier-frame');
  if (!panel || !openCommand || !atelierFrame || !config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) return;

  const AFOC_PROTOCOL_URL = 'https://app.notion.com/p/3dac70c3c07681d6bb9bc2f4bf6bfe88?pvs=204';
  const SUPABASE_PROJECT_ID = 'wvsogabeckhuhcqelpja';

  const style = document.createElement('style');
  style.textContent = `
    .afoc-bulk{margin:0 0 12px;padding:11px;background:#f4eee8;border:1px solid #eaded6;border-radius:16px}
    .afoc-bulk button{width:100%;border:0;border-radius:14px;padding:12px 14px;background:#6e806f;color:#fff;font:900 11px inherit;box-shadow:0 7px 16px rgba(76,95,79,.13)}
    .afoc-bulk button:disabled{opacity:.48}.afoc-bulk small{display:block;margin-top:7px;font-size:8px;line-height:1.5;color:#847a73;text-align:center}
    .afoc-ops-title{display:flex;align-items:center;justify-content:space-between;margin:13px 1px 7px;font-size:9px;font-weight:900;color:#736a65}
    .afoc-ops-list{display:grid;gap:5px;max-height:210px;overflow:auto;padding-right:2px}
    .afoc-ops-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;background:#fff;border:1px solid #eee3dc;border-radius:12px;padding:7px 9px}
    .afoc-ops-name{min-width:0;font-size:8px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.afoc-ops-state{font-size:7px;font-weight:900;white-space:nowrap;border-radius:999px;padding:4px 7px;background:#f0ece8}
    .afoc-ops-state.working{background:#e8f1e8}.afoc-ops-state.quiet{background:#f4eee0}.afoc-ops-state.waiting-command{background:#fff0bd}.afoc-ops-state.processing{background:#e6edf5}.afoc-ops-state.attention{background:#f7dfdc}.afoc-ops-state.handoff{background:#eee5f3}.afoc-ops-state.done{background:#eceae7}
    .afoc-ops-summary{font-size:8px;color:#8b817a;font-weight:700}
  `;
  document.head.appendChild(style);

  const form = panel.querySelector('#command-form');
  const bulk = document.createElement('section');
  bulk.className = 'afoc-bulk';
  bulk.innerHTML = `<button id="afoc-bulk-next" type="button">🐅🐥 みんな次へ進んで！</button><small>すでに「次へ」を待機・処理中のFacultyは重複投入せずスキップするよ。</small>`;
  panel.insertBefore(bulk, form);

  const opsTitle = document.createElement('div');
  opsTitle.className = 'afoc-ops-title';
  opsTitle.innerHTML = `<span>🐅🐥 Faculty状態</span><span id="afoc-ops-summary" class="afoc-ops-summary"></span>`;
  panel.appendChild(opsTitle);
  const opsList = document.createElement('div');
  opsList.id = 'afoc-ops-list';
  opsList.className = 'afoc-ops-list';
  panel.appendChild(opsList);

  const bulkButton = document.getElementById('afoc-bulk-next');
  const summaryEl = document.getElementById('afoc-ops-summary');
  const commandStatus = document.getElementById('command-status');

  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let snapshot = { rooms: [], health: [], commands: [], instances: [] };
  let channel = null;
  let timer = null;
  let patchTimer = null;

  const activeRoom = (room) => room.is_unlocked && room.status !== 'done';
  const roomCommands = (roomId) => snapshot.commands.filter((c) => c.room_id === roomId);
  const roomHealth = (roomId) => snapshot.health.find((h) => h.id === roomId) || null;
  const roomInstance = (roomId) => snapshot.instances.find((i) => i.room_id === roomId) || null;

  function operationalState(room) {
    const commands = roomCommands(room.id);
    const claimed = commands.find((c) => c.status === 'claimed');
    const queued = commands.find((c) => c.status === 'queued');
    const health = roomHealth(room.id)?.health;

    if (room.status === 'handoff') return { key: 'handoff', label: '📦 引継ぎ待ち' };
    if (room.status === 'room_full') return { key: 'handoff', label: '📚 ROOM FULL' };
    if (['blocked', 'stalled'].includes(room.status) || health === 'stalled') {
      return { key: 'attention', label: '⚠️ 要確認' };
    }
    if (claimed) return { key: 'processing', label: '▶️ 指示処理中' };
    if (queued) return { key: 'waiting-command', label: '📮 指示あり・起動待ち' };
    if (health === 'quiet') return { key: 'quiet', label: '💤 休憩中' };
    if (health === 'healthy') return { key: 'working', label: '🟢 稼働中' };
    if (room.status === 'done') return { key: 'done', label: '✅ 完了' };
    return { key: 'quiet', label: '💤 待機中' };
  }

  function renderOps() {
    const rooms = snapshot.rooms.filter(activeRoom);
    const states = rooms.map((room) => ({ room, op: operationalState(room) }));
    const counts = states.reduce((acc, item) => {
      acc[item.op.key] = (acc[item.op.key] || 0) + 1;
      return acc;
    }, {});

    summaryEl.textContent = `📮${counts['waiting-command'] || 0} · ▶️${counts.processing || 0} · 💤${counts.quiet || 0}${counts.handoff ? ` · 📦${counts.handoff}` : ''}`;
    opsList.innerHTML = '';
    states.forEach(({ room, op }) => {
      const row = document.createElement('div');
      row.className = 'afoc-ops-row';
      const material = room.material_type === 'reading' ? '🐥 Reading' : '🐅 Lecture';
      const course = room.current_course_code ? ` · ${room.current_course_code}` : '';
      row.innerHTML = `<div class="afoc-ops-name">${room.faculty_name} ${material}${course}</div><span class="afoc-ops-state ${op.key}">${op.label}</span>`;
      opsList.appendChild(row);
    });
  }

  function jstDate() {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }

  function buildHandoffPrompt(room) {
    const instance = roomInstance(room.id);
    const queued = roomCommands(room.id).filter((c) => c.status === 'queued');
    const material = room.material_type === 'reading' ? 'Reading Book' : 'Lecture Book';
    const shortMaterial = room.material_type === 'reading' ? 'RB' : 'LB';
    const current = [room.current_course_code, room.current_unit].filter(Boolean).join('｜') || '未同期';
    const queuedText = queued.length ? queued.map((c) => `- ${c.instruction}`).join('\n') : '- なし（Notion正本の next_step を基準に再開）';
    const oldRoom = instance?.room_label || room.room_name || '旧開発室';
    const checkpoint = instance?.handoff_checkpoint_id || 'AFOC/Supabaseで最新handoff checkpointを取得';
    const newRoomLabel = `${room.faculty_name}${shortMaterial}開発室 ${jstDate()}`;

    return `Atlas大学 AFOC｜教材開発室 Handoff再開\n\nあなたは、新しく作成したChatGPT上の「${room.faculty_name} ${material} 開発室」です。\n旧開発室から教材開発ラインを引き継いでください。\n\n【対象ライン】\nline_id: ${room.id}\n学部: ${room.faculty_name}\n教材: ${material}\n旧Room: ${oldRoom}\n新Room label: ${newRoomLabel}\nhandoff checkpoint: ${checkpoint}\n\n【AFOC現在表示】\n現在地: ${current}\n工程: ${room.current_phase || '未同期'}\n次: ${room.next_step || '未同期'}\nNotion URL: ${room.notion_page_url || 'AFOC/SupabaseとNotion正本から確認'}\n\n【AFOC待機中の指示】\n${queuedText}\n\n【再開手順】\n1. 最初にAFOC同期プロトコル v1.0 を確認する：\n${AFOC_PROTOCOL_URL}\n2. このチャットの過去履歴を長期記憶として扱わず、最新Notion正本を確認する。\n3. Supabaseの既存プロジェクト「Dialy」（project id: ${SUPABASE_PROJECT_ID}）で、line_id=${room.id} の最新handoff checkpointとdevelopment_roomsを確認する。\n4. AFOC表示・Checkpoint・Notion正本に差分がある場合は、Notion正本を正式基準として現在地を確定する。推測で補完しない。\n5. 確定した現在地・工程・次工程と room label「${newRoomLabel}」を使い、public.afoc_open_shift を実行する。これにより新しいactive Room Instanceを開始し、heartbeatとFIFO指示claimを行う。\n6. afoc_open_shiftの戻り値にcommandがあれば、Notion正本と最新ユーザー指示に矛盾しないことを確認してから実行する。古い／競合する指示は盲目的に実行しない。\n7. state_source が room_heartbeat に戻り、AFOC上で handoff が解除されたことを確認する。\n8. 作業中は意味のある区切りで afoc_checkpoint_shift。完成時はNotion正本保存＋必要QAの後に afoc_complete_shift を使う。ライン全体が本当に完了した場合以外は p_line_done=false。\n9. 新しい開発室もRoom Fullになった場合は afoc_handoff_room でCheckpointを残して次室へ引き継ぐ。\n\n【禁止】\n- 未確認の進捗・科目・講義番号を推測で埋めない。\n- Notionへ未保存の成果を正式完了扱いしない。\n- 教材制作ログを学生個人のLRDB/ADB/ACDBへ混入させない。\n\n最初の応答では、Notion正本＋handoff checkpointを確認し、afoc_open_shiftの結果（current / next / claimed command）をAFOCへ同期してから通常制作へ戻ってください。`;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  function patchHandoffDetail(doc, roomId) {
    const room = snapshot.rooms.find((r) => r.id === roomId);
    const card = doc?.getElementById('afoc-live-detail');
    if (!room || !card || card.hidden) return;
    card.dataset.afocRoomId = roomId;

    const needsHandoff = ['handoff', 'room_full'].includes(room.status);
    let action = card.querySelector('.afoc-handoff-action');
    if (!needsHandoff) {
      action?.remove();
      return;
    }

    if (!action) {
      action = doc.createElement('section');
      action.className = 'afoc-handoff-action';
      action.innerHTML = `
        <div class="afoc-handoff-copy-note"><b>📦 この開発室は引継ぎ待ち</b><br>新しいChatGPT開発室を作り、下のボタンでコピーした再開文を貼る。</div>
        <button type="button" class="afoc-handoff-copy">📦 新しい開発室へ引き継ぐ</button>
        <small>再開地点・Checkpoint・待機中の指示をまとめてコピー</small>
      `;
      const notionLink = card.querySelector('.notion');
      if (notionLink) card.insertBefore(action, notionLink);
      else card.appendChild(action);
    }

    const button = action.querySelector('.afoc-handoff-copy');
    button.onclick = async (event) => {
      event.stopPropagation();
      const original = button.textContent;
      button.disabled = true;
      try {
        await copyText(buildHandoffPrompt(room));
        button.textContent = '✅ 引継ぎ文をコピーしたよ！';
        window.setTimeout(() => { button.textContent = original; button.disabled = false; }, 1800);
      } catch (error) {
        console.error(error);
        button.textContent = 'コピーできなかったよ';
        window.setTimeout(() => { button.textContent = original; button.disabled = false; }, 1800);
      }
    };
  }

  function patchAtelier() {
    try {
      const wrapperDoc = atelierFrame.contentDocument;
      const innerFrame = wrapperDoc?.getElementById('atelier');
      const doc = innerFrame?.contentDocument;
      if (!doc) return;

      if (!doc.getElementById('afoc-ops-patch-style')) {
        const s = doc.createElement('style');
        s.id = 'afoc-ops-patch-style';
        s.textContent = `
          .afoc-op-badge{position:absolute;left:50%;top:4px;transform:translateX(-50%);z-index:35;font-size:6.2px;font-weight:900;white-space:nowrap;border:1px solid #e8ddd6;border-radius:999px;padding:3px 6px;background:#fffdf9;box-shadow:0 3px 8px rgba(80,60,45,.07);pointer-events:none}
          .afoc-op-badge.working{background:#e8f1e8}.afoc-op-badge.quiet{background:#f4eee0}.afoc-op-badge.waiting-command{background:#fff0bd}.afoc-op-badge.processing{background:#e6edf5}.afoc-op-badge.attention{background:#f7dfdc}.afoc-op-badge.handoff{background:#eee5f3}
          .afoc-handoff-action{margin:11px 0 0;padding:10px;border:1px solid #ded0e8;background:#f7f1fa;border-radius:12px;text-align:left}
          .afoc-handoff-copy-note{font-size:7.5px;line-height:1.55;color:#655a69;margin-bottom:8px}.afoc-handoff-copy-note b{font-size:8px}
          .afoc-handoff-copy{display:block;width:100%;border:0;border-radius:10px;padding:9px 10px;background:#77647f;color:#fff;font:900 8px -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;box-shadow:0 5px 12px rgba(86,68,95,.14);cursor:pointer}
          .afoc-handoff-copy:disabled{opacity:.66}.afoc-handoff-action small{display:block;margin-top:6px;text-align:center;font-size:6.5px;color:#8b7c90}
          @media(max-width:720px){.afoc-op-badge{font-size:5.7px;top:1px;padding:3px 5px}}
        `;
        doc.head.appendChild(s);
      }

      const rooms = snapshot.rooms.filter(activeRoom);
      const states = rooms.map((room) => ({ room, op: operationalState(room) }));
      const live = rooms.filter((r) => r.state_source === 'room_heartbeat').length;
      const canon = rooms.filter((r) => Boolean(r.canon_checked_at)).length;
      const attention = states.filter((x) => x.op.key === 'attention').length;
      const handoff = states.filter((x) => x.op.key === 'handoff').length;
      const wake = states.filter((x) => x.op.key === 'waiting-command').length;
      const quiet = states.filter((x) => x.op.key === 'quiet').length;

      const liveEl = doc.querySelector('.live');
      if (liveEl) {
        liveEl.innerHTML = `<i></i>⚡${live} live · 📚${canon} canon${quiet ? ` · 💤${quiet}休憩中` : ''}${wake ? ` · 📮${wake}起動待ち` : ''}${handoff ? ` · 📦${handoff}引継ぎ` : ''}${attention ? ` · ⚠️${attention}要確認` : ''}`;
      }

      states.forEach(({ room, op }) => {
        const worker = doc.getElementById('worker-' + room.id);
        const pod = worker?.closest('.pod');
        if (!pod) return;
        let badge = pod.querySelector('.afoc-op-badge');
        if (!badge) {
          badge = doc.createElement('span');
          badge.className = 'afoc-op-badge';
          pod.appendChild(badge);
        }
        badge.className = `afoc-op-badge ${op.key}`;
        badge.textContent = op.label;

        if (pod.dataset.afocHandoffBound !== '1') {
          pod.dataset.afocHandoffBound = '1';
          const patchSelected = () => window.setTimeout(() => patchHandoffDetail(doc, room.id), 30);
          pod.addEventListener('click', patchSelected);
          pod.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') patchSelected();
          });
        }
      });

      const detail = doc.getElementById('afoc-live-detail');
      const selectedId = detail?.dataset?.afocRoomId;
      if (selectedId) patchHandoffDetail(doc, selectedId);
    } catch (error) {
      console.debug('AFOC ops patch waiting for atelier', error);
    }
  }

  async function loadOps() {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session) return;

    const [roomsResult, healthResult, commandsResult, instancesResult] = await Promise.all([
      client.from('development_rooms').select('id,faculty_name,faculty_code,material_type,status,is_unlocked,current_course_code,current_unit,current_phase,next_step,state_source,canon_checked_at,notion_page_url,room_name').order('faculty_code'),
      client.from('afoc_room_health').select('id,health,last_heartbeat_at'),
      client.from('commands').select('id,room_id,command_type,instruction,status,requested_at,claimed_at').in('status', ['queued', 'claimed']).order('requested_at'),
      client.from('room_instances').select('id,room_id,room_label,status,last_seen_at,ended_at,handoff_checkpoint_id').in('status', ['active', 'handoff', 'room_full']).order('started_at', { ascending: false })
    ]);
    if (roomsResult.error || healthResult.error || commandsResult.error || instancesResult.error) return;
    snapshot = {
      rooms: roomsResult.data || [],
      health: healthResult.data || [],
      commands: commandsResult.data || [],
      instances: instancesResult.data || []
    };
    renderOps();
    patchAtelier();
  }

  async function bulkNext() {
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData?.session;
    if (!session) {
      commandStatus.textContent = '🔒 AFOCへログインしてね。';
      return;
    }

    bulkButton.disabled = true;
    commandStatus.textContent = '📮 みんなへの指示を整理中…';
    try {
      await loadOps();
      const rooms = snapshot.rooms.filter(activeRoom);
      const already = new Set(
        snapshot.commands
          .filter((c) => ['queued', 'claimed'].includes(c.status) && (c.command_type === 'next_implementation' || c.instruction === '次の実装へ進んで'))
          .map((c) => c.room_id)
      );
      const targets = rooms.filter((room) => !already.has(room.id));
      if (!targets.length) {
        commandStatus.textContent = '✅ 全員すでに「次へ」を待機・処理中だよ。重複投入なし！';
        return;
      }

      const rows = targets.map((room) => ({
        room_id: room.id,
        command_type: 'next_implementation',
        instruction: '次の実装へ進んで',
        requested_by: session.user.id,
        status: 'queued'
      }));
      const { error } = await client.from('commands').insert(rows);
      if (error) throw error;
      const skipped = rooms.length - targets.length;
      commandStatus.textContent = `✅ ${targets.length}室へ「次へ」を送ったよ${skipped ? `。${skipped}室は既存指示ありでスキップ` : ''}。`;
      await loadOps();
    } catch (error) {
      console.error(error);
      commandStatus.textContent = '指示を一括送信できなかったよ。';
    } finally {
      bulkButton.disabled = false;
    }
  }

  bulkButton.addEventListener('click', bulkNext);
  openCommand.addEventListener('click', () => window.setTimeout(loadOps, 20));
  atelierFrame.addEventListener('load', () => {
    window.setTimeout(patchAtelier, 300);
    window.setTimeout(patchAtelier, 1200);
  });

  async function startRealtime() {
    if (channel) await client.removeChannel(channel);
    channel = client.channel('afoc-ops-ui')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'development_rooms' }, () => loadOps())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commands' }, () => loadOps())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_instances' }, () => loadOps())
      .subscribe();
  }

  client.auth.onAuthStateChange((_event, session) => {
    if (session) {
      window.setTimeout(() => { loadOps(); startRealtime(); }, 80);
    }
  });

  timer = window.setInterval(loadOps, 60_000);
  patchTimer = window.setInterval(patchAtelier, 10_000);
  window.setTimeout(() => { loadOps(); startRealtime(); }, 350);
})();
