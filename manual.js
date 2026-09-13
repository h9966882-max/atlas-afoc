(() => {
  const openButton = document.getElementById('open-manual');
  const closeButton = document.getElementById('close-manual');
  const panel = document.getElementById('manual-panel');
  const backdrop = document.getElementById('manual-backdrop');
  if (!openButton || !closeButton || !panel || !backdrop) return;

  let previousFocus = null;

  function openManual() {
    previousFocus = document.activeElement;
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
