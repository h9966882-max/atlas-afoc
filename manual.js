(() => {
  const openButton = document.getElementById('open-manual');
  const closeButton = document.getElementById('close-manual');
  const panel = document.getElementById('manual-panel');
  const backdrop = document.getElementById('manual-backdrop');
  if (!openButton || !closeButton || !panel || !backdrop) return;

  let previousFocus = null;

  function refreshManualCopy() {
    const intro = panel.querySelector('.manual-intro');
    if (intro) intro.textContent = 'AFOCは、学部全体の教材開発地図＋学部ごとの学修再開ナビ。普段の教材制作はChatGPT教材開発室で 👍➡️。授業を受ける時は「🎓 学修のつづき」から前回のCompassと次のReading Bookへ進める。';

    const callouts = panel.querySelectorAll('.manual-callout');
    if (callouts[0]) callouts[0].innerHTML = '<b>いちばん大事</b><br>通常制作の続行は、対応するChatGPT教材開発室で <span class="manual-kbd">👍➡️</span> を1回送るだけ。AFOCで先に📮指示を入れる必要はない。授業側は「🎓 学修のつづき」で学部ごとの前回・次回を確認できる。';
    if (callouts[1]) callouts[1].innerHTML = '<b>AFOCができること / まだできないこと</b><br>AFOCは教材開発全体の地図、Live現在地、学部別の学修再開、特殊指示の予約、Handoff / Room Full救済を担う。ただし、休止中の既存ChatGPTチャットに外部から新しいターンを自動発生させることはできない。';

    [...panel.querySelectorAll('.manual-step')].forEach((step) => {
      const text = step.textContent || '';
      if (text.includes('📮 1室だけ次へ')) {
        step.innerHTML = '<b>📮 特殊な指示を予約</b><br>通常の「次へ」には不要。特定の優先作業や次回起動時に必ず渡したい仕事がある時だけ使う。';
      } else if (text.includes('🐅🐥 みんな次へ')) {
        step.innerHTML = '<b>🐅🐥 一斉指示</b><br>全室へ仕事を予約する機能。ChatGPT開発室を自動起動する機能ではない。各室の新しいターンは別途必要。';
      } else if (text.includes('💤 quietだけど進めたい')) {
        step.innerHTML = '<b>💤 止まっていて続きを進めたい</b><br>対応するChatGPT教材開発室を開いて <span class="manual-kbd">👍➡️</span>。AFOCで先に指示を入れなくてOK。';
      } else if (text.includes('📚 ROOM FULL')) {
        step.innerHTML = '<b>📚 ROOM FULL / 📦 引継ぎ</b><br>Faculty詳細の引継ぎボタン、または「Room Fullとして引継ぎへ」を使う。Checkpoint作成と新しい開発室用プロンプトのコピーまでAFOCが担当する。';
      }
    });
  }

  function openManual() {
    previousFocus = document.activeElement;
    refreshManualCopy();
    backdrop.classList.remove('hidden');
    panel.classList.remove('hidden');
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      closeButton.focus();
    });
    document.body.classList.add('manual-open');
  }

  function closeManual() {
    backdrop.classList.remove('is-open');
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('manual-open');
    window.setTimeout(() => {
      backdrop.classList.add('hidden');
      panel.classList.add('hidden');
    }, 230);
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }

  refreshManualCopy();
  openButton.addEventListener('click', openManual);
  closeButton.addEventListener('click', closeManual);
  backdrop.addEventListener('click', closeManual);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.classList.contains('hidden')) closeManual();
  });
})();

(() => {
  if (document.querySelector('script[data-afoc-roomfull-rescue]')) return;
  const script = document.createElement('script');
  script.src = './roomfull-rescue.js';
  script.dataset.afocRoomfullRescue = '1';
  document.body.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-afoc-faculty-progress]')) return;
  const script = document.createElement('script');
  script.src = './faculty-progress.js';
  script.dataset.afocFacultyProgress = '1';
  document.body.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-afoc-learning-nav]')) return;
  const script = document.createElement('script');
  script.src = './learning-nav.js';
  script.dataset.afocLearningNav = '1';
  document.body.appendChild(script);
})();
