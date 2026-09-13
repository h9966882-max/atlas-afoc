(() => {
  const config = window.AFOC_CONFIG || {};
  const panel = document.getElementById('command-panel');
  const openCommand = document.getElementById('open-command');
  const atelierFrame = document.getElementById('atelier-frame');
  if (!panel || !openCommand || !atelierFrame || !config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) return;

  const style = document.createElement('style');
  style.textContent = `
    .afoc-bulk{margin:0 0 12px;padding:11px;background:#f4eee8;border:1px solid #eaded6;border-radius:16px}
    .afoc-bulk button{width:100%;border:0;border-radius:14px;padding:12px 14px;background:#6e806f;color:#fff;font:900 11px inherit;box-shadow:0 7px 16px rgba(76,95,79,.13)}
    .afoc-bulk button:disabled{opacity:.48}.afoc-bulk small{display:block;margin-top:7px;font-size:8px;line-height:1.5;color:#847a73;text-align:center}
    .afoc-ops-title{display:flex;align-items:center;justify-content:space-between;margin:13px 1px 7px;font-size:9px;font-weight:900;color:#736a65}
    .afoc-ops-list{display:grid;gap:5px;max-height:210px;overflow:auto;padding-right:2px}
    .afoc-ops-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;background:#fff;border:1px solid #eee3dc;border-radius:12px;padding:7px 9px}
    .afoc-ops-name{min-width:0;font-size:8px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.afoc-ops-state{font-size:7px;font-weight:900;white-space:nowrap;border-radius:999px;padding:4px 7px;background:#f0ece8}
    .afoc-ops-state.working{background:#e8f1e8}.afoc-ops-state.quiet{background:#f4eee0}.afoc-ops-state.waiting-command{background:#fff0bd}.afoc-ops-state.processing{background:#e6edf5}.afoc-ops-state.attention{background:#f7dfdc}.afoc-ops-state.done{background:#eceae7}
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

  let snapshot = { rooms: [], health: [], commands: [] };
  let channel = null;
  let timer = null;
  let patchTimer = null;

  const activeRoom = (room) => room.is_unlocked && room.status !== 'done';
  const roomCommands = (roomId) => snapshot.commands.filter((c) => c.room_id === roomId);
  const roomHealth = (roomId) => snapshot.health.find((h) => h.id === roomId) || null;

  function operationalState(room) {
    const commands = roomCommands(room.id);
    const claimed = commands.find((c) => c.status === 'claimed');
    const queued = commands.find((c) => c.status === 'queued');
    const health = roomHealth(room.id)?.health;

    if (['blocked', 'room_full', 'handoff', 'stalled'].includes(room.status) || health === 'stalled') {
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

    summaryEl.textContent = `📮${counts['waiting-command'] || 0} · ▶️${counts.processing || 0} · 💤${counts.quiet || 0}`;
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
          .afoc-op-badge.working{background:#e8f1e8}.afoc-op-badge.quiet{background:#f4eee0}.afoc-op-badge.waiting-command{background:#fff0bd}.afoc-op-badge.processing{background:#e6edf5}.afoc-op-badge.attention{background:#f7dfdc}
          @media(max-width:720px){.afoc-op-badge{font-size:5.7px;top:1px;padding:3px 5px}}
        `;
        doc.head.appendChild(s);
      }

      const rooms = snapshot.rooms.filter(activeRoom);
      const states = rooms.map((room) => ({ room, op: operationalState(room) }));
      const live = rooms.filter((r) => r.state_source === 'room_heartbeat').length;
      const canon = rooms.filter((r) => Boolean(r.canon_checked_at)).length;
      const attention = states.filter((x) => x.op.key === 'attention').length;
      const wake = states.filter((x) => x.op.key === 'waiting-command').length;
      const quiet = states.filter((x) => x.op.key === 'quiet').length;

      const liveEl = doc.querySelector('.live');
      if (liveEl) {
        liveEl.innerHTML = `<i></i>⚡${live} live · 📚${canon} canon${quiet ? ` · 💤${quiet}休憩中` : ''}${wake ? ` · 📮${wake}起動待ち` : ''}${attention ? ` · ⚠️${attention}要確認` : ''}`;
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
      });
    } catch (error) {
      console.debug('AFOC ops patch waiting for atelier', error);
    }
  }

  async function loadOps() {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session) return;

    const [roomsResult, healthResult, commandsResult] = await Promise.all([
      client.from('development_rooms').select('id,faculty_name,faculty_code,material_type,status,is_unlocked,current_course_code,state_source,canon_checked_at').order('faculty_code'),
      client.from('afoc_room_health').select('id,health,last_heartbeat_at'),
      client.from('commands').select('id,room_id,command_type,instruction,status,requested_at,claimed_at').in('status', ['queued', 'claimed']).order('requested_at')
    ]);
    if (roomsResult.error || healthResult.error || commandsResult.error) return;
    snapshot = { rooms: roomsResult.data || [], health: healthResult.data || [], commands: commandsResult.data || [] };
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
