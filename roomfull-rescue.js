(() => {
  const config = window.AFOC_CONFIG || {};
  const atelierFrame = document.getElementById('atelier-frame');
  if (!atelierFrame || !config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) return;

  const AFOC_PROTOCOL_URL = 'https://app.notion.com/p/3dac70c3c07681d6bb9bc2f4bf6bfe88?pvs=204';
  const SUPABASE_PROJECT_ID = 'wvsogabeckhuhcqelpja';
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let snapshot = { rooms: [], health: [], commands: [], instances: [] };
  let channel = null;
  let timer = null;

  function getInnerDoc() {
    try {
      const wrapperDoc = atelierFrame.contentDocument;
      const innerFrame = wrapperDoc?.getElementById('atelier');
      return innerFrame?.contentDocument || null;
    } catch (_) {
      return null;
    }
  }

  function roomHealth(roomId) {
    return snapshot.health.find((item) => item.id === roomId) || null;
  }

  function activeInstance(roomId) {
    return snapshot.instances.find((item) => item.room_id === roomId && item.status === 'active') ||
      snapshot.instances.find((item) => item.room_id === roomId) || null;
  }

  function queuedCommands(roomId) {
    return snapshot.commands.filter((item) => item.room_id === roomId && item.status === 'queued');
  }

  function jstDate() {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
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

  function buildPrompt(room, oldInstance, checkpointId) {
    const material = room.material_type === 'reading' ? 'Reading Book' : 'Lecture Book';
    const shortMaterial = room.material_type === 'reading' ? 'RB' : 'LB';
    const current = [room.current_course_code, room.current_unit].filter(Boolean).join('｜') || '未同期';
    const oldRoom = oldInstance?.room_label || room.room_name || '旧開発室';
    const newRoomLabel = `${room.faculty_name}${shortMaterial}開発室 ${jstDate()}`;
    const queued = queuedCommands(room.id);
    const queuedText = queued.length
      ? queued.map((item) => `- ${item.instruction}`).join('\n')
      : '- なし（Notion正本の next_step を基準に再開）';

    return `Atlas大学 AFOC｜教材開発室 Room Full Handoff再開\n\nあなたは、新しく作成したChatGPT上の「${room.faculty_name} ${material} 開発室」です。\n旧開発室がChatGPTのチャットルーム上限に到達したため、教材開発ラインを引き継いでください。\n\n【対象ライン】\nline_id: ${room.id}\n学部: ${room.faculty_name}\n教材: ${material}\n旧Room: ${oldRoom}\n新Room label: ${newRoomLabel}\nhandoff checkpoint: ${checkpointId}\n理由: room_full\n\n【AFOC現在表示】\n現在地: ${current}\n工程: ${room.current_phase || '未同期'}\n次: ${room.next_step || '未同期'}\nNotion URL: ${room.notion_page_url || 'AFOC/SupabaseとNotion正本から確認'}\n\n【AFOC待機中の指示】\n${queuedText}\n\n【再開手順】\n1. AFOC同期プロトコル v1.0 を確認する：\n${AFOC_PROTOCOL_URL}\n2. このチャットの過去履歴を長期記憶として扱わず、最新Notion正本を確認する。\n3. Supabaseの既存プロジェクト「Dialy」（project id: ${SUPABASE_PROJECT_ID}）で line_id=${room.id} の最新handoff checkpointとdevelopment_roomsを確認する。\n4. AFOC表示・Checkpoint・Notion正本に差分がある場合はNotion正本を正式基準として現在地を確定する。推測で補完しない。\n5. 確定した現在地・工程・次工程と room label「${newRoomLabel}」で public.afoc_open_shift を実行する。新しいactive Room Instanceを開始し、heartbeatとFIFO指示claimを行う。\n6. afoc_open_shiftの戻り値にcommandがあれば、Notion正本と最新ユーザー指示に矛盾しないことを確認してから実行する。\n7. state_source が room_heartbeat に戻り、AFOC上で room_full / handoff が解除されたことを確認する。\n8. 作業中は意味のある区切りで afoc_checkpoint_shift。完成時はNotion正本保存＋必要QAの後に afoc_complete_shift。ライン全体が本当に完了した場合以外は p_line_done=false。\n9. 新しい部屋もRoom Fullになった場合は afoc_handoff_room でCheckpointを残して次室へ引き継ぐ。\n\n【禁止】\n- 未確認の進捗・科目・講義番号を推測で埋めない。\n- Notionへ未保存の成果を正式完了扱いしない。\n- 教材制作ログを学生個人のLRDB/ADB/ACDBへ混入させない。\n\n最初の応答では、Notion正本＋handoff checkpointを確認し、afoc_open_shiftの結果（current / next / claimed command）をAFOCへ同期してから通常制作へ戻ってください。`;
  }

  function ensureStyle(doc) {
    if (doc.getElementById('afoc-roomfull-rescue-style')) return;
    const style = doc.createElement('style');
    style.id = 'afoc-roomfull-rescue-style';
    style.textContent = `
      .afoc-roomfull-rescue{margin:11px 0 0;padding:10px;border:1px solid #ead8ce;background:#fff5ef;border-radius:12px;text-align:left}
      .afoc-roomfull-rescue-note{font-size:7.5px;line-height:1.55;color:#6d5e56;margin-bottom:8px}.afoc-roomfull-rescue-note b{font-size:8px}
      .afoc-roomfull-rescue button{display:block;width:100%;border:0;border-radius:10px;padding:9px 10px;background:#8a6657;color:#fff;font:900 8px -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;box-shadow:0 5px 12px rgba(100,72,60,.14);cursor:pointer}
      .afoc-roomfull-rescue button:disabled{opacity:.66}.afoc-roomfull-rescue small{display:block;margin-top:6px;text-align:center;font-size:6.5px;color:#958177}
    `;
    doc.head.appendChild(style);
  }

  function patchCard(roomId) {
    const doc = getInnerDoc();
    if (!doc) return;
    ensureStyle(doc);
    const room = snapshot.rooms.find((item) => item.id === roomId);
    const card = doc.getElementById('afoc-live-detail');
    if (!room || !card || card.hidden) return;

    const alreadyHandoff = ['handoff', 'room_full'].includes(room.status);
    const needsRescue = !alreadyHandoff && room.status !== 'done';
    let rescue = card.querySelector('.afoc-roomfull-rescue');

    if (!needsRescue) {
      rescue?.remove();
      return;
    }

    if (!rescue) {
      rescue = doc.createElement('section');
      rescue.className = 'afoc-roomfull-rescue';
      rescue.innerHTML = `
        <div class="afoc-roomfull-rescue-note"><b>📚 ChatGPT側が上限なら</b><br>AFOCへRoom Full報告が届く前に止まった可能性がある。実際に上限表示が出ている時だけ使う。</div>
        <button type="button">📚 Room Fullとして引継ぎへ</button>
        <small>Checkpoint作成 → Room Full記録 → 新室用再開文コピー</small>
      `;
      const notionLink = card.querySelector('.notion');
      if (notionLink) card.insertBefore(rescue, notionLink);
      else card.appendChild(rescue);
    }

    const button = rescue.querySelector('button');
    button.onclick = async (event) => {
      event.stopPropagation();
      if (!window.confirm('このChatGPT開発室は実際に「チャットルーム上限」になっている？\nOKでRoom Fullとして引継ぎCheckpointを作るよ。')) return;

      const original = button.textContent;
      button.disabled = true;
      button.textContent = '📚 Room Fullを記録中…';
      const oldInstance = activeInstance(room.id);
      const cursor = {
        current_course_code: room.current_course_code || null,
        current_unit: room.current_unit || null,
        current_phase: room.current_phase || null,
        next_step: room.next_step || null,
        recovery_source: 'manual_room_full_rescue',
        recovered_at: new Date().toISOString()
      };
      const summary = room.next_step || `Room Full引継ぎ｜${room.current_course_code || room.id} の最新Notion正本・Checkpointから再開`;

      try {
        const { data: checkpointId, error } = await client.rpc('afoc_handoff_room', {
          p_room_id: room.id,
          p_summary: summary,
          p_cursor: cursor,
          p_notion_page_url: room.notion_page_url || null,
          p_reason: 'room_full'
        });
        if (error) throw error;
        await copyText(buildPrompt(room, oldInstance, checkpointId));
        button.textContent = '✅ 引継ぎ文をコピーしたよ！';
        await loadState();
        window.setTimeout(() => {
          button.disabled = false;
          button.textContent = original;
          patch();
        }, 1800);
      } catch (error) {
        console.error('Room Full rescue failed', error);
        button.textContent = '⚠️ 記録できなかったよ';
        window.setTimeout(() => {
          button.disabled = false;
          button.textContent = original;
        }, 1800);
      }
    };
  }

  function patch() {
    const doc = getInnerDoc();
    if (!doc) return;
    ensureStyle(doc);

    snapshot.rooms.forEach((room) => {
      const worker = doc.getElementById('worker-' + room.id);
      const pod = worker?.closest('.pod');
      if (!pod || pod.dataset.afocRoomFullBound === '1') return;
      pod.dataset.afocRoomFullBound = '1';
      const run = () => window.setTimeout(() => patchCard(room.id), 60);
      pod.addEventListener('click', run);
      pod.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') run();
      });
    });

    const card = doc.getElementById('afoc-live-detail');
    const selected = card?.dataset?.afocRoomId;
    if (selected) patchCard(selected);
  }

  async function loadState() {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session) return;
    const [roomsResult, healthResult, commandsResult, instancesResult] = await Promise.all([
      client.from('development_rooms').select('id,faculty_name,faculty_code,material_type,status,is_unlocked,current_course_code,current_unit,current_phase,next_step,state_source,canon_checked_at,notion_page_url,room_name').eq('is_unlocked', true),
      client.from('afoc_room_health').select('id,health,last_heartbeat_at'),
      client.from('commands').select('id,room_id,instruction,status,requested_at').in('status', ['queued', 'claimed']).order('requested_at'),
      client.from('room_instances').select('id,room_id,room_label,status,last_seen_at,ended_at,handoff_checkpoint_id').in('status', ['active', 'handoff', 'room_full']).order('started_at', { ascending: false })
    ]);
    if (roomsResult.error || healthResult.error || commandsResult.error || instancesResult.error) return;
    snapshot = {
      rooms: roomsResult.data || [],
      health: healthResult.data || [],
      commands: commandsResult.data || [],
      instances: instancesResult.data || []
    };
    patch();
  }

  async function startRealtime() {
    if (channel) await client.removeChannel(channel);
    channel = client.channel('afoc-roomfull-rescue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'development_rooms' }, () => loadState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_instances' }, () => loadState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commands' }, () => loadState())
      .subscribe();
  }

  atelierFrame.addEventListener('load', () => {
    window.setTimeout(patch, 500);
    window.setTimeout(patch, 1500);
  });

  client.auth.onAuthStateChange((_event, session) => {
    if (session) window.setTimeout(() => { loadState(); startRealtime(); }, 120);
  });

  timer = window.setInterval(() => { loadState(); patch(); }, 15_000);
  window.setTimeout(() => { loadState(); startRealtime(); }, 500);
})();
