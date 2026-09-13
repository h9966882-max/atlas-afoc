(() => {
  const config = window.AFOC_CONFIG || {};
  const gate = document.getElementById('gate');
  const app = document.getElementById('app');
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
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
  let healthTimer = null;
  let currentSession = null;
  let state = {
    rooms: [],
    notes: [],
    health: [],
    commands: [],
    instances: []
  };

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

  function updateCommandButton() {
    const pending = state.commands.filter((command) =>
      ['queued', 'claimed'].includes(command.status)
    ).length;
    openCommand.textContent = pending ? `📮 指示する ${pending}` : '📮 指示する';
    openCommand.setAttribute(
      'aria-label',
      pending ? `Facultyへ指示する。未処理${pending}件` : 'Facultyへ指示する'
    );
  }

  function updateCommandRooms() {
    const selected = commandRoom.value;
    commandRoom.innerHTML = '<option value="">担当Facultyを選択</option>';
    state.rooms
      .filter((room) => room.is_unlocked && room.status !== 'done')
      .forEach((room) => {
        const option = document.createElement('option');
        option.value = room.id;
        const material = room.material_type === 'reading' ? 'Reading' : 'Lecture';
        const current = [room.current_course_code, room.current_unit].filter(Boolean).join('-');
        option.textContent = `${room.faculty_name} ${material}${current ? `｜${current}` : ''}`;
        commandRoom.appendChild(option);
      });
    if ([...commandRoom.options].some((option) => option.value === selected)) {
      commandRoom.value = selected;
    }
  }

  frame.addEventListener('load', () => {
    resizeFrame();
    sendStateToAtelier();
    try {
      new ResizeObserver(resizeFrame).observe(frame.contentDocument.body);
    } catch (_) {}
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
    passwordInput.disabled = true;
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
    const [roomsResult, notesResult, healthResult, commandsResult, instancesResult] =
      await Promise.all([
        client
          .from('development_rooms')
          .select('*')
          .order('faculty_code', { ascending: true })
          .order('material_type', { ascending: true }),
        client
          .from('completion_notes')
          .select('id,room_id,title,subtitle,notion_page_url,completed_at,seen_at')
          .order('completed_at', { ascending: false })
          .limit(12),
        client
          .from('afoc_room_health')
          .select('*')
          .order('faculty_code', { ascending: true })
          .order('material_type', { ascending: true }),
        client
          .from('commands')
          .select('id,room_id,command_type,instruction,status,requested_at,claimed_at,completed_at')
          .in('status', ['queued', 'claimed'])
          .order('requested_at', { ascending: true })
          .limit(50),
        client
          .from('room_instances')
          .select('id,room_id,external_room_key,room_label,status,started_at,last_seen_at,ended_at,handoff_checkpoint_id')
          .in('status', ['active', 'handoff', 'room_full'])
          .order('started_at', { ascending: false })
          .limit(50)
      ]);

    const results = [
      ['development_rooms', roomsResult],
      ['completion_notes', notesResult],
      ['afoc_room_health', healthResult],
      ['commands', commandsResult],
      ['room_instances', instancesResult]
    ];

    for (const [label, result] of results) {
      if (result.error) {
        console.error(`AFOC load failed: ${label}`, result.error);
        throw result.error;
      }
    }

    state = {
      rooms: roomsResult.data || [],
      notes: notesResult.data || [],
      health: healthResult.data || [],
      commands: commandsResult.data || [],
      instances: instancesResult.data || []
    };

    updateCommandRooms();
    updateCommandButton();
    sendStateToAtelier();
  }

  async function startRealtime() {
    if (liveChannel) {
      await client.removeChannel(liveChannel);
      liveChannel = null;
    }

    liveChannel = client
      .channel('afoc-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'development_rooms' },
        () => loadOperationalState().catch(console.error)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'completion_notes' },
        () => loadOperationalState().catch(console.error)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commands' },
        () => loadOperationalState().catch(console.error)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_instances' },
        () => loadOperationalState().catch(console.error)
      )
      .subscribe();

    if (healthTimer) clearInterval(healthTimer);
    healthTimer = setInterval(() => {
      if (currentSession) loadOperationalState().catch(console.error);
    }, 60_000);
  }

  async function stopRealtime() {
    if (liveChannel) await client.removeChannel(liveChannel);
    liveChannel = null;
    if (healthTimer) clearInterval(healthTimer);
    healthTimer = null;
    state = { rooms: [], notes: [], health: [], commands: [], instances: [] };
    currentSession = null;
    updateCommandButton();
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

    const room = state.rooms.find((item) => item.id === roomId);
    if (!room?.is_unlocked || room.status === 'done') {
      throw new Error('このFacultyは現在、指示受付対象ではないよ。');
    }

    const commandType =
      trimmed === '次の実装へ進んで' ? 'next_implementation' : 'instruction';
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
      await loadOperationalState();
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
    const password = passwordInput.value;
    if (!email || !password) return;

    loginButton.disabled = true;
    setStatus('🔐 入館確認中…');

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    loginButton.disabled = false;

    if (error || !data.session) {
      setStatus('メールアドレスかパスワードを確認してね。', 'error');
      return;
    }

    passwordInput.value = '';
    setStatus('');
  });

  logoutButton.addEventListener('click', async () => {
    await stopRealtime();
    await client.auth.signOut();
    memberRole.textContent = '';
    showGate();
    setStatus('退出したよ 🔐');
  });

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(async () => {
      if (session) {
        await verifyMembership(session);
      } else {
        await stopRealtime();
        showGate();
      }
    }, 0);
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