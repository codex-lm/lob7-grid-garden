'use strict';
(() => {
  const garden = document.getElementById('garden');
  const message = document.getElementById('message');
  const levelLabel = document.getElementById('level');
  const movesLabel = document.getElementById('moves');
  const startButton = document.getElementById('start');
  const nextButton = document.getElementById('next');
  const undoButton = document.getElementById('undo');
  const hintButton = document.getElementById('hint');
  const resetButton = document.getElementById('reset');
  const levels = [
    { size: 3, seed: [4], name: 'A first bloom' },
    { size: 3, seed: [0, 8, 4], name: 'Corners and company' },
    { size: 4, seed: [1, 5, 8, 14], name: 'A winding path' },
    { size: 4, seed: [0, 2, 6, 9, 11, 15], name: 'The evening garden' }
  ];
  let levelIndex = 0;
  let board = [];
  let solution = new Set();
  let history = [];
  let state = 'ready';
  let lastActivity = 0;
  let hint = -1;
  let pauseFromVisibility = false;

  function signal(event) {
    if (window.parent !== window) window.parent.postMessage({ type: 'lob7:game', event }, 'https://lob7.com');
  }
  function activity() {
    if (performance.now() - lastActivity >= 2000) { lastActivity = performance.now(); signal('activity'); }
  }
  function change(index) {
    const size = levels[levelIndex].size;
    const row = Math.floor(index / size), col = index % size;
    for (const [r, c] of [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]) {
      if (r >= 0 && r < size && c >= 0 && c < size) board[r * size + c] = !board[r * size + c];
    }
    if (solution.has(index)) solution.delete(index); else solution.add(index);
  }
  function render(focusIndex) {
    const size = levels[levelIndex].size;
    garden.style.setProperty('--size', String(size));
    garden.replaceChildren();
    board.forEach((bloom, index) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = `tile${bloom ? ' bloom' : ''}${hint === index ? ' hinted' : ''}`;
      tile.textContent = bloom ? '✿' : '·';
      tile.setAttribute('aria-label', `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}: ${bloom ? 'blooming' : 'sleeping'}`);
      tile.setAttribute('aria-pressed', String(bloom));
      tile.disabled = state !== 'playing';
      tile.addEventListener('click', () => plant(index));
      tile.addEventListener('keydown', event => {
        let target;
        if (event.key === 'ArrowLeft') target = Math.max(0, index - 1);
        if (event.key === 'ArrowRight') target = Math.min(board.length - 1, index + 1);
        if (event.key === 'ArrowUp') target = Math.max(0, index - size);
        if (event.key === 'ArrowDown') target = Math.min(board.length - 1, index + size);
        if (target !== undefined) { event.preventDefault(); garden.children[target].focus(); }
      });
      garden.append(tile);
    });
    levelLabel.textContent = `Garden ${levelIndex + 1}/${levels.length} · ${levels[levelIndex].name}`;
    movesLabel.textContent = `Moves: ${history.length}`;
    undoButton.disabled = state !== 'playing' || history.length === 0;
    hintButton.disabled = state !== 'playing';
    resetButton.disabled = state === 'ready' || state === 'finished';
    if (focusIndex !== undefined && state === 'playing') garden.children[focusIndex].focus();
  }
  function setup() {
    const level = levels[levelIndex];
    board = Array(level.size * level.size).fill(true);
    solution = new Set(); history = []; hint = -1;
    for (const index of level.seed) change(index);
    state = 'playing';
    message.textContent = levelIndex === 0 ? 'Try the centre tile. What happens to its neighbours?' : 'Bring every flower into bloom. There is always a way.';
    startButton.hidden = true; nextButton.hidden = true;
    render();
  }
  function plant(index) {
    if (state !== 'playing' || document.hidden) return;
    change(index); history.push(index); hint = -1; activity();
    const count = board.filter(Boolean).length;
    if (count === board.length) {
      if (levelIndex === levels.length - 1) {
        state = 'finished'; message.textContent = 'Every garden is in bloom. Beautifully done!';
        startButton.hidden = false; startButton.textContent = 'Plant a new garden'; signal('end');
      } else {
        state = 'between'; message.textContent = `Garden complete in ${history.length} ${history.length === 1 ? 'move' : 'moves'}!`;
        nextButton.hidden = false;
      }
    } else message.textContent = `${count} of ${board.length} flowers are blooming. Keep growing.`;
    render(index);
    if (state === 'between') nextButton.focus();
    if (state === 'finished') startButton.focus();
  }
  startButton.addEventListener('click', () => { levelIndex = 0; setup(); signal('start'); });
  nextButton.addEventListener('click', () => { levelIndex += 1; setup(); });
  resetButton.addEventListener('click', () => { if (state === 'playing' || state === 'between') { setup(); activity(); } });
  undoButton.addEventListener('click', () => {
    if (state !== 'playing' || !history.length) return;
    const index = history.pop(); change(index); hint = -1;
    message.textContent = 'Last move undone. Try another path.'; render(index); activity();
  });
  hintButton.addEventListener('click', () => {
    if (state !== 'playing') return;
    hint = solution.values().next().value;
    message.textContent = 'The highlighted tile is a useful next move. You still make the choice.';
    render(hint); activity();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state === 'playing' || state === 'between')) { pauseFromVisibility = true; signal('pause'); }
    else if (!document.hidden && pauseFromVisibility) { pauseFromVisibility = false; signal('resume'); }
  });
  board = Array(9).fill(true);
  render();
  levelLabel.textContent = 'Four small gardens. No time limit.';
  signal('ready');
})();
