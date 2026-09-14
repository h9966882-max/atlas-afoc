(() => {
  const ROOT_ID = 'faculty-curriculum-progress';
  const MAIN_COLLAPSE_KEY = 'afoc-curriculum-collapsed';
  const CARD_KEY_PREFIX = 'afoc-curriculum-card-';

  // The curriculum map now uses per-card folding instead of one giant fold.
  localStorage.setItem(MAIN_COLLAPSE_KEY, '0');

  function ensureStyle() {
    if (document.getElementById('afoc-curriculum-controls-style')) return;
    const style = document.createElement('style');
    style.id = 'afoc-curriculum-controls-style';
    style.textContent = `
      #${ROOT_ID} .curriculum-toggle{display:none!important}
      #${ROOT_ID} .curriculum-jumpbar{position:sticky;top:48px;z-index:18;margin:0 0 10px;padding:8px 9px;border:1px solid #eaded6;border-radius:15px;background:rgba(255,253,250,.94);box-shadow:0 7px 18px rgba(78,59,48,.07);backdrop-filter:blur(12px)}
      #${ROOT_ID} .curriculum-jump-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;font-size:7px;color:#92857e;font-weight:900}
      #${ROOT_ID} .curriculum-jump-head b{font-size:8px;color:#6f655f}
      #${ROOT_ID} .curriculum-jump-rail{display:flex;gap:5px;overflow-x:auto;padding:1px 1px 3px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
      #${ROOT_ID} .curriculum-jump-rail::-webkit-scrollbar{display:none}
      #${ROOT_ID} .curriculum-jump-chip{flex:0 0 auto;border:1px solid #e3d8d0;background:#fff;color:#625a55;border-radius:999px;padding:6px 9px;font:900 7.5px inherit;white-space:nowrap;cursor:pointer}
      #${ROOT_ID} .curriculum-jump-chip.campus{background:#f7f1e8;border-color:#e5d7c6}
      #${ROOT_ID} .curriculum-jump-chip.all{background:#f3eeea}
      #${ROOT_ID} .campus-progress-card,#${ROOT_ID} .faculty-progress-card{scroll-margin-top:112px;transition:box-shadow .24s ease,transform .24s ease,border-color .24s ease}
      #${ROOT_ID} .curriculum-jump-flash{box-shadow:0 0 0 3px rgba(151,126,94,.18),0 12px 32px rgba(78,59,48,.12)!important;transform:translateY(-1px);border-color:#cdb99e!important}
      #${ROOT_ID} .campus-identity,#${ROOT_ID} .faculty-identity{position:relative;padding-right:86px}
      #${ROOT_ID} .curriculum-card-toggle{position:absolute;right:9px;top:9px;border:1px solid #ded2ca;background:rgba(255,255,255,.9);color:#665d57;border-radius:999px;padding:6px 8px;font:900 7px inherit;white-space:nowrap;cursor:pointer}
      #${ROOT_ID} .curriculum-card-collapsed>.campus-top,#${ROOT_ID} .curriculum-card-collapsed>.faculty-top{display:block;margin-bottom:0}
      #${ROOT_ID} .curriculum-card-collapsed>.campus-top>.campus-stat,#${ROOT_ID} .curriculum-card-collapsed>.faculty-top>.faculty-stat{display:none!important}
      #${ROOT_ID} .curriculum-card-collapsed>.material-lanes,
      #${ROOT_ID} .curriculum-card-collapsed>.phase-title,
      #${ROOT_ID} .curriculum-card-collapsed>.phase-strip,
      #${ROOT_ID} .curriculum-card-collapsed>.campus-segment-grid,
      #${ROOT_ID} .curriculum-card-collapsed>.canon-links,
      #${ROOT_ID} .curriculum-card-collapsed>.curriculum-foot{display:none!important}
      #${ROOT_ID} .curriculum-card-collapsed .campus-identity,#${ROOT_ID} .curriculum-card-collapsed .faculty-identity{min-height:62px;padding-top:10px;padding-bottom:10px}
      #${ROOT_ID} .curriculum-card-collapsed .campus-identity .label,#${ROOT_ID} .curriculum-card-collapsed .faculty-identity .label{display:none}
      #${ROOT_ID} .curriculum-card-collapsed .campus-identity b,#${ROOT_ID} .curriculum-card-collapsed .faculty-identity b{font-size:14px;margin:0 0 2px}
      #${ROOT_ID} .curriculum-card-collapsed .campus-identity span,#${ROOT_ID} .curriculum-card-collapsed .faculty-identity span{font-size:7.5px}
      @media(max-width:760px){
        #${ROOT_ID} .curriculum-jumpbar{top:48px;margin-bottom:8px;padding:7px 8px}
        #${ROOT_ID} .campus-progress-card,#${ROOT_ID} .faculty-progress-card{scroll-margin-top:104px}
      }
    `;
    document.head.appendChild(style);
  }

  function campusCode(card, index) {
    const text = card.querySelector('.campus-identity b')?.textContent || '';
    if (text.includes('格物致知')) return 'KAKU';
    if (text.includes('究理')) return 'KYURI';
    return `CAMPUS${index + 1}`;
  }

  function campusShortName(card, code) {
    const text = (card.querySelector('.campus-identity b')?.textContent || '').replace(/^\s*🏫\s*/, '').trim();
    if (code === 'KAKU') return '格物致知';
    if (code === 'KYURI') return '究理';
    return text || code;
  }

  function storageKey(key) {
    return `${CARD_KEY_PREFIX}${key}`;
  }

  function applyCardState(card, key) {
    const isCollapsed = localStorage.getItem(storageKey(key)) === '1';
    card.classList.toggle('curriculum-card-collapsed', isCollapsed);
    const button = card.querySelector('.curriculum-card-toggle');
    if (button) {
      button.textContent = isCollapsed ? '📚 開く' : '▴ たたむ';
      button.setAttribute('aria-expanded', String(!isCollapsed));
    }
  }

  function installCardToggle(card, key) {
    const identity = card.querySelector('.faculty-identity,.campus-identity');
    if (!identity) return;
    card.dataset.curriculumCardKey = key;
    if (!card.id) card.id = `curriculum-${key.toLowerCase()}`;

    let button = identity.querySelector('.curriculum-card-toggle');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'curriculum-card-toggle';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = !card.classList.contains('curriculum-card-collapsed');
        localStorage.setItem(storageKey(key), next ? '1' : '0');
        applyCardState(card, key);
      });
      identity.appendChild(button);
    }
    applyCardState(card, key);
  }

  function openCard(card) {
    if (!card) return;
    const key = card.dataset.curriculumCardKey;
    if (key && card.classList.contains('curriculum-card-collapsed')) {
      localStorage.setItem(storageKey(key), '0');
      applyCardState(card, key);
    }
  }

  function jumpTo(card) {
    if (!card) return;
    openCard(card);
    window.setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.classList.add('curriculum-jump-flash');
      window.setTimeout(() => card.classList.remove('curriculum-jump-flash'), 1250);
    }, 20);
  }

  function installJumpbar(root, content, campuses, faculties) {
    if (content.querySelector('.curriculum-jumpbar')) return;
    const bar = document.createElement('nav');
    bar.className = 'curriculum-jumpbar';
    bar.setAttribute('aria-label', '教材開発進捗ジャンプ');
    bar.innerHTML = `
      <div class="curriculum-jump-head"><b>🧭 学部ジャンプ</b><span>ピンポイントで現在地へ</span></div>
      <div class="curriculum-jump-rail"></div>
    `;
    const rail = bar.querySelector('.curriculum-jump-rail');

    const addChip = (label, card, klass = '') => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `curriculum-jump-chip ${klass}`.trim();
      chip.textContent = label;
      chip.addEventListener('click', () => jumpTo(card));
      rail.appendChild(chip);
    };

    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'curriculum-jump-chip all';
    all.textContent = '全体';
    all.addEventListener('click', () => root.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    rail.appendChild(all);

    campuses.forEach(({ card, code, label }) => addChip(`🏫 ${label}`, card, 'campus'));

    const facultyLabels = {
      PHL:'哲学', REL:'宗教', HIS:'歴史', PSY:'心理', STR:'戦略', ECO:'経済', BUS:'商学'
    };
    faculties.forEach(({ card, code }) => addChip(facultyLabels[code] || code, card));

    content.insertBefore(bar, content.firstChild);
  }

  let enhancing = false;
  function enhance() {
    if (enhancing) return;
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const content = root.querySelector('.curriculum-content');
    if (!content) return;

    // Clear the old one-button-for-everything state once, then use per-card controls.
    if (content.hasAttribute('hidden')) {
      const globalToggle = root.querySelector('.curriculum-toggle');
      if (globalToggle) {
        globalToggle.click();
        return;
      }
      content.removeAttribute('hidden');
    }

    enhancing = true;
    try {
      ensureStyle();
      const campusCards = [...content.querySelectorAll('.campus-progress-card')];
      const facultyCards = [...content.querySelectorAll('.faculty-progress-card[data-faculty-progress]')];

      const campuses = campusCards.map((card, index) => {
        const code = campusCode(card, index);
        card.id = `curriculum-campus-${code.toLowerCase()}`;
        installCardToggle(card, `CAMPUS-${code}`);
        return { card, code, label: campusShortName(card, code) };
      });

      const faculties = facultyCards.map((card) => {
        const code = card.dataset.facultyProgress || 'FACULTY';
        card.id = `curriculum-faculty-${code.toLowerCase()}`;
        installCardToggle(card, `FACULTY-${code}`);
        return { card, code };
      });

      installJumpbar(root, content, campuses, faculties);
    } finally {
      enhancing = false;
    }
  }

  let scheduled = false;
  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      enhance();
    }, 20);
  }

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleEnhance();
  window.setTimeout(scheduleEnhance, 350);
  window.setTimeout(scheduleEnhance, 1200);
})();
