// Input state: pointer aim, firing, colour selection and pause. One job, no game rules.

export function createInput(canvas, onColour, onPause, onBurst) {
  const state = { mx: 0, my: 0, down: false, space: false };

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mx = (e.clientX - r.left) / r.width * canvas.width;
    state.my = (e.clientY - r.top) / r.height * canvas.height;
  });
  canvas.addEventListener('pointerdown', () => { state.down = true; });
  window.addEventListener('pointerup', () => { state.down = false; });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { state.space = true; e.preventDefault(); }
    if (e.code === 'Digit1') onColour(0);
    if (e.code === 'Digit2') onColour(1);
    if (e.code === 'Digit3') onColour(2);
    if (e.code === 'KeyP' || e.code === 'Escape') onPause();
    if (e.code === 'KeyB') onBurst();
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') state.space = false; });

  return state;
}
