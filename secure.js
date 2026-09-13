(() => {
  const config = window.AFOC_CONFIG || {};
  const gate = document.getElementById('gate');
  const app = document.getElementById('app');
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const loginButton = document.getElementById('login-button');
  const statusEl = document.getElementById('status');
  const logoutButton = document.getElementById('logout');
  const memberRole = document.getElementById('member-role');
  const frame = document.getElementById('atelier-frame');
  const commandPanel = document.getElementById('command-panel');
  const openCommand = document.getElementById('open-command');
  const closeCommand = document.getElementById('close-command');
  const commandForm = document.getElementById('command-form');
  const commandRoom = document.getElementById('command-room');
  const commandText = document.getElementById('command-text');
  const nextCommand = document.getElementById('next-command');
  const sendCommand = document.getElementById('send-command');
  const commandStatus = document.getElementById('command-status');

  const ready = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  let liveChannel = null;
  let currentSession = null;
  let state = { rooms: [], notes: [] };

  function setStatus(message = '', kind = '') {
    statusEl.textContent = message;
    statusEl.className = `status${kind ? ` ${kind}` : ''}`;
  }

  function setCommandStatus(message = '') {
    commandStatus.textContent = message;
  }

  function showGate() {
    gate.classList.remove('hidden');
    app.classList.add('hidden');
    commandPanel.classList.add('hidden');
  }

  function showApp(role = '') {
    gate.classList.add('hidden');
    app.classList.remove('hidden');
    memberRole.textContent = role ? `· ${role}` : '';
    resizeFrame();
  }

  function resizeFrame() {
    try {
      const doc = frame.contentDocument;
      if (doc?.documentElement) frame.style.height = `${doc.documentElement.scrollHeight}px`;
    } catch (_) {
      frame.style.height = 'calc(100vh - 48px)';
    }
  }

  function sendStateToAtelier() {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage(
      { type: 'afoc-state', payload: state },
      window.location.origin
    );
  }

  function updateCommandRooms() {
    const selected = commandRoom.value;
    commandRoom.innerHTML = '<option value="">担当Facultyを選択</option>';
    state.rooms.forEach((room) => {
      const option = document.createElement('option');
      option.value = room.id;
      const material = room.material_type === 'reading' ? 'Reading' : 'Lecture';
      const current = [room.current_course_code, room.current_unit].filter(Boolean).join('-');
      option.textContent = `${room.faculty_name} ${material}${current ? `｜${current}` : ''}`;
      commandRoom.appendChild(option);
    });
    if ([...commandRoom.options].some((o) => o.value === selected)) commandRoom.value = selected;
  }

  frame.addEventListener('load', () => {
    resizeFrame();
    sendStateToAtelier();
    try { new ResizeObserver(resizeFrame).observe(frame.contentDocument.body); } catch (_) {}
  });
  window.addEventListener('resize', resizeFrame);

  openCommand.addEventListener('click', () => {
    commandPanel.classList.remove('hidden');
    updateCommandRooms();
  });
  closeCommand.addEventListener('click', () => commandPanel.classList.add('hidden'));
  nextCommand.addEventListener('click', () => {
    commandText.value = '次の実装へ進んで';
    commandText.focus();
  });

  if (!ready) {
    loginButton.disabled = true;
    emailInput.disabled = true;
    setStatus('🔧 認証基盤を接続中。Supabase設定後にこの扉が開くよ。');
    return;
  }

  const client = window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  async function loadOperationalState() {
    const [roomsResult, notesResult] = await Promise.all([
      client.from('development_rooms').select('*').order('faculty_code', { ascending: true }),
      client
        .from('completion_notes')
        .select('id,room_id,title,subtitle,notion_page_url,completed_at,seen_at')
        .order('completed_at', { ascending: false })
        .limit(12)
    ]);

    if (roomsResult.error) throw roomsResult.error;
    if (notesResult.error) throw notesResult.error;

    state = { rooms: roomsResult.data || [], notes: notesResult.data || [] };
    updateCommandRooms();
    sendStateToAtelier();
  }

  async function startRealtime() {
    if (liveChannel) {
      await client.removeChannel(liveChannel);
      liveChannel = null;
    }

    liveChannel = client
      .channel('afoc-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'development_rooms' }, () => loadOperationalState().catch(console.error))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'completion_notes' }, () => loadOperationalState().catch(console.error))
      .subscribe();
  }

  async function stopRealtime() {
    if (liveChannel) await client.removeChannel(liveChannel);
    liveChannel = null;
    state = { rooms: [], notes: [] };
    currentSession = null;
  }

  async function verifyMembership(session) {
    if (!session?.user) {
      showGate();
      return false;
    }

    const { data, error } = await client
      .from('afoc_members')
      .select('role,active')
      .eq('user_id', session.user.id)
      .eq('active', true)
      .maybeSingle();

    if (error || !data) {
      await client.auth.signOut();
      showGate();
      setStatus('このアカウントはAFOC利用者として登録されていないよ。', 'error');
      return false;
    }

    currentSession = session;
    showApp(data.role || 'member');
    try {
      await loadOperationalState();
      await startRealtime();
    } catch (loadError) {
      console.error(loadError);
      setStatus('AFOCデータの読み込みでエラーが起きたよ。', 'error');
    }
    return true;
  }

  async function enqueueCommand(roomId, instruction) {
    if (!currentSession?.user) throw new Error('No active AFOC session');
    const trimmed = instruction.trim();
    if (!roomId || !trimmed) throw new Error('担当Facultyと指示内容を選んでね。');

    const commandType = trimmed === '次の実装へ進んで' ? 'next_implementation' : 'instruction';
    const { error } = await client.from('commands').insert({
      room_id: roomId,
      command_type: commandType,
      instruction: trimmed,
      requested_by: currentSession.user.id,
      status: 'queued'
    });
    if (error) throw error;
  }

  commandForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setCommandStatus('📮 指示をキューへ送信中…');
    sendCommand.disabled = true;
    try {
      await enqueueCommand(commandRoom.value, commandText.value);
      setCommandStatus('✅ 指示をキューへ入れたよ。');
      commandText.value = '';
    } catch (error) {
      console.error(error);
      setCommandStatus(error.message || '指示を送れなかったよ。');
    } finally {
      sendCommand.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    loginButton.disabled = true;
    setStatus('📮 入館リンクを準備中…');
    const redirectTo = config.redirectUrl || window.location.href.split('#')[0].split('?')[0];
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo }
    });
    loginButton.disabled = false;

    if (error) {
      setStatus('入館リンクを送れなかったよ。登録済みアドレスか確認してね。', 'error');
      return;
    }
    setStatus('✉️ 入館リンクを送ったよ。メールから開いてね。');
  });

  logoutButton.addEventListener('click', async () => {
    await stopRealtime();
    await client.auth.signOut();
    memberRole.textContent = '';
    showGate();
    setStatus('退出したよ 🔐');
  });

  client.auth.onAuthStateChange(async (_event, session) => {
    if (session) await verifyMembership(session);
    else {
      await stopRealtime();
      showGate();
    }
  });

  (async () => {
    setStatus('🔐 入館状態を確認中…');
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      showGate();
      setStatus('');
      return;
    }
    await verifyMembership(data.session);
    setStatus('');
  })();
})();
