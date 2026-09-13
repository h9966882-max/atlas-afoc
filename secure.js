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

  const ready = Boolean(config.supabaseUrl && config.supabasePublishableKey);

  function setStatus(message = '', kind = '') {
    statusEl.textContent = message;
    statusEl.className = `status${kind ? ` ${kind}` : ''}`;
  }

  function showGate() {
    gate.classList.remove('hidden');
    app.classList.add('hidden');
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
      if (doc?.documentElement) {
        frame.style.height = `${doc.documentElement.scrollHeight}px`;
      }
    } catch (_) {
      frame.style.height = 'calc(100vh - 48px)';
    }
  }

  frame.addEventListener('load', () => {
    resizeFrame();
    try {
      new ResizeObserver(resizeFrame).observe(frame.contentDocument.body);
    } catch (_) {}
  });
  window.addEventListener('resize', resizeFrame);

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

    showApp(data.role || 'member');
    return true;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    loginButton.disabled = true;
    setStatus('📮 入館リンクを準備中…');

    const redirectTo = config.redirectUrl || window.location.href.split('#')[0].split('?')[0];
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo
      }
    });

    loginButton.disabled = false;

    if (error) {
      setStatus('入館リンクを送れなかったよ。登録済みアドレスか確認してね。', 'error');
      return;
    }

    setStatus('✉️ 入館リンクを送ったよ。メールから開いてね。');
  });

  logoutButton.addEventListener('click', async () => {
    await client.auth.signOut();
    memberRole.textContent = '';
    showGate();
    setStatus('退出したよ 🔐');
  });

  client.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await verifyMembership(session);
    } else {
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
