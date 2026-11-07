import { bootAcademy } from './academy-client.js';
import { sudokuAdapter } from './academy-adapter.js';
import { createPuzzle, hashSeed, candidates, getPeers, getHelpfulCell, completed, FORMATS } from './sudoku.mjs';

const STORAGE_KEY = 'hero-academy-sudoku-v1';
const AVATARS = ['🦊', '🐻', '🐰', '🐸', '🦄', '🐼', '🦁', '🐧'];
const CHAPTERS = [
  { id: 'spark', name: 'First Spark', subtitle: 'One little square', size: 1, count: 1, icon: '🌱', lesson: 'Meet your first square', explanation: 'There is only one place for the number 1. Tap the empty square, then tap 1.', objective: 'Find the only missing number.', rule: 'Start with just one square. No rush!' },
  { id: 'brook', name: 'Little Brook', subtitle: 'Rows and columns', size: 2, count: 4, icon: '🐣', lesson: 'Numbers have their own places', explanation: 'Use 1 and 2 once in each row (across) and each column (down). Look for what is missing.', objective: 'Each row and column needs 1 and 2.', rule: 'Across and down: no number twice!' },
  { id: 'meadow', name: 'Meadow Maze', subtitle: 'Meet the little boxes', size: 4, count: 8, icon: '🌼', lesson: 'Welcome to real mini Sudoku', explanation: 'Fill each row, column and little 2×2 box with 1, 2, 3 and 4. Look for a number that has only one home.', objective: 'Fill the grid with 1, 2, 3 and 4.', rule: 'Every little box needs every number once.' },
  { id: 'grove', name: 'Whispering Woods', subtitle: 'Think one step ahead', size: 4, count: 6, icon: '🌲', lesson: 'Become a number detective', explanation: 'Sometimes you need to check the row, column AND box. Use pencil notes to remember which numbers might fit.', objective: 'Solve a trickier 4×4 puzzle.', rule: 'Try notes when you are not sure.' },
  { id: 'ridge', name: 'Cloudtop Ridge', subtitle: 'Six-by-six explorer', size: 6, count: 8, icon: '⛰️', lesson: 'A bigger world to explore', explanation: 'Now use numbers 1 to 6. Your little boxes are 2 rows tall and 3 columns wide. Every row, column and box needs all six numbers.', objective: 'Explore the 6×6 number world.', rule: 'Little boxes are 2×3 this time.' },
  { id: 'castle', name: 'Starfall Castle', subtitle: 'Classic Sudoku!', size: 9, count: 9, icon: '🏰', lesson: 'You are ready for classic Sudoku', explanation: 'Use the numbers 1 to 9. Fill every row, every column and each 3×3 box without repeats. You can do it, one square at a time!', objective: 'Solve a full 9×9 Sudoku.', rule: 'Rows, columns and 3×3 boxes: 1 to 9.' },
];

const LEVELS = CHAPTERS.flatMap((chapter, chapterIndex) => Array.from({ length: chapter.count }, (_, i) => {
  const range = chapter.id === 'spark' ? [1, 1] : chapter.id === 'brook' ? [1, 3] : chapter.id === 'meadow' ? [4, 9] : chapter.id === 'grove' ? [8, 12] : chapter.id === 'ridge' ? [13, 25] : [28, 49];
  return {
    id: `${chapter.id}-${i + 1}`, chapterId: chapter.id, size: chapter.size,
    number: i + 1, order: i, chapterIndex,
    blanks: Math.round(range[0] + (range[1] - range[0]) * (chapter.count === 1 ? 0 : i / (chapter.count - 1))),
    name: chapter.id === 'spark' ? 'The very first number' : `${chapter.name} · ${i + 1}`,
    isFinal: i === chapter.count - 1,
  };
}));

const $ = selector => document.querySelector(selector);
const screen = $('#screen');
const dialogRoot = $('#dialog-root');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const id = () => `hero-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const makeProfile = (name = 'Explorer', avatar = '🦊') => ({ id: id(), name, avatar, completed: [], xp: 0, totalSeconds: 0, hints: 0, attempts: 0, replays: {}, runs: {}, run: null });

function initialData() {
  const profile = makeProfile();
  return { version: 1, activeProfileId: profile.id, profiles: [profile], pendingActivity: [], settings: { voice: false, guide: true, largeText: false } };
}
function validProfile(p) {
  return p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.completed) && typeof p.xp === 'number';
}
function load() {
  try {
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (loaded?.version !== 1 || !Array.isArray(loaded.profiles) || !loaded.profiles.length || !loaded.profiles.every(validProfile)) return initialData();
    loaded.settings = { voice: false, guide: true, largeText: false, ...loaded.settings };
    loaded.pendingActivity = Array.isArray(loaded.pendingActivity) ? loaded.pendingActivity.slice(-200) : [];
    for (const p of loaded.profiles) {
      p.name = p.name.slice(0, 25);
      if (!AVATARS.includes(p.avatar)) p.avatar = AVATARS[0];
      p.completed = p.completed.filter(v => LEVELS.some(l => l.id === v));
      p.replays ||= {};
      if (p.run && !isValidRun(p.run)) p.run = null;
      p.runs = Object.fromEntries(Object.entries(p.runs || {}).filter(([key, value]) => key === value?.levelId && isValidRun(value)));
      if (p.run) p.runs[p.run.levelId] = p.run;
    }
    if (!loaded.profiles.some(p => p.id === loaded.activeProfileId)) loaded.activeProfileId = loaded.profiles[0].id;
    return loaded;
  } catch { return initialData(); }
}
function isValidRun(run) {
  const level = LEVELS.find(l => l.id === run?.levelId);
  return !!level && run.size === level.size && Array.isArray(run.puzzle) && Array.isArray(run.solution) && Array.isArray(run.board) &&
    ['puzzle', 'solution', 'board'].every(k => run[k].length === level.size * level.size && run[k].every(v => Number.isInteger(v) && v >= 0 && v <= level.size)) &&
    run.puzzle.every((v, i) => !v || (v === run.solution[i] && v === run.board[i]));
}
let data = load();
let academy = null;
let view = 'home';
let selected = -1;
let notesMode = false;
let tip = '';
let hintIndex = -1;
let toastTimer;
let tickCount = 0;
let lastTick = Date.now();
const profile = () => data.profiles.find(p => p.id === data.activeProfileId) || data.profiles[0];
const levelById = levelId => LEVELS.find(l => l.id === levelId);
const chapterFor = level => CHAPTERS.find(c => c.id === level.chapterId);
const nextLevel = level => LEVELS[LEVELS.indexOf(level) + 1];
const completedCount = p => new Set(p.completed).size;
const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function save(sync = true) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { showToast('Your device could not save this time. You can export a backup in Settings.'); }
  if(sync)void academy?.flush();
}
function showToast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}
function say(text) {
  if (!('speechSynthesis' in window)) { showToast('Speech is not available in this browser.'); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.87;
  utterance.pitch = 1.08;
  const voices = speechSynthesis.getVoices();
  const british = voices.filter(v => /^en[-_]GB/i.test(v.lang));
  utterance.voice = british.find(v => /female|susan|serena|kate|libby|sonia|martha/i.test(v.name)) || british[0] || null;
  speechSynthesis.speak(utterance);
}
function prepareUi() {
  const p = profile();
  $('#profile-avatar').textContent = p.avatar;
  $('#profile-name').textContent = p.name;
  document.body.classList.toggle('large-text', !!data.settings.largeText);
}
function robot(extra = '') {
  return `<span class="pip ${extra}" role="img" aria-label="Pip the friendly robot"><span class="pip-antenna"></span><span class="pip-ear left"></span><span class="pip-ear right"></span><span class="pip-face"><span class="pip-eyes"><i></i><i></i></span><span class="pip-mouth"></span></span></span>`;
}
function heroArt() {
  const numbers = ['1', '', '3', '4', '3', '4', '', '2', '2', '1', '4', '', '', '3', '2', '1'];
  return `<div class="hero-visual" aria-hidden="true"><div class="orbit-text">From tiny beginnings… ✨</div><div class="show-grid">${numbers.map((n,i) => `<div class="${n ? '' : 'blank'}">${n || '✦'}</div>`).join('')}</div>${robot('hero-pip')}<div class="float-badge star">⭐ +20 Hero XP</div><div class="float-badge numbers">1 → 2 → 4 → 6 → 9</div></div>`;
}
function renderHome() {
  view = 'home';
  const p = profile();
  const progress = completedCount(p);
  const recommended = (p.run && levelById(p.run.levelId)) || LEVELS.find(l => !p.completed.includes(l.id)) || LEVELS[LEVELS.length - 1];
  screen.innerHTML = `<div class="page home-page">
    <section class="home-hero" aria-labelledby="hero-title"><div>
      <div class="eyebrow">✦ A little puzzle. A big adventure.</div>
      <h1 id="hero-title" class="hero-heading">Big thinking starts <span>small.</span></h1>
      <p class="hero-copy">Hi, ${esc(p.name)}! I'm Pip. Let's learn Sudoku together, one square at a time. Explore magical places, spot patterns, and grow into a number puzzle champion.</p>
      <div class="hero-cta"><button class="btn btn-primary" data-action="start" data-level="${recommended.id}">✦ ${progress ? 'Continue my adventure' : 'Start my adventure'} <span aria-hidden="true">→</span></button><button class="btn btn-ghost" data-action="howto">▶ Learn how it works</button></div>
      <div class="hero-trust"><span>✓ No timers to beat</span><span>✓ Helpful hints</span><span>✓ Play at your own pace</span></div>
    </div>${heroArt()}</section>
    <section aria-labelledby="journey-title"><div class="section-heading"><div><div class="section-kicker">Your adventure map</div><h2 id="journey-title">Six wonderful worlds</h2></div><p>Every great hero starts with one small step.</p></div>
      <div class="journey-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${LEVELS.length}" aria-valuenow="${progress}" aria-label="Levels completed"><div style="width:${100 * progress / LEVELS.length}%"></div></div>
      <div class="progress-label"><span>✦ ${progress} of ${LEVELS.length} adventures completed</span><span>⭐ ${p.xp || 0} Hero XP</span></div>
      <div class="chapter-grid">${CHAPTERS.map((ch, index) => {
        const done = LEVELS.filter(l => l.chapterId === ch.id && p.completed.includes(l.id)).length;
        const first = LEVELS.find(l => l.chapterId === ch.id && !p.completed.includes(l.id)) || LEVELS.find(l => l.chapterId === ch.id);
        const current = recommended.chapterId === ch.id;
        const chip = done === ch.count ? '<span class="chip gold">★ Completed</span>' : current ? '<span class="chip">✦ Your next stop</span>' : `<span class="chip">${ch.size}×${ch.size} grid</span>`;
        return `<button class="chapter-card ${current ? 'selected' : ''}" data-action="chapter" data-chapter="${ch.id}" aria-label="${esc(ch.name)}, ${done} of ${ch.count} puzzles completed">
          <div class="chapter-card-top"><div class="chapter-icon" aria-hidden="true">${ch.icon}</div>${chip}</div><h3 class="chapter-title">${index + 1}. ${esc(ch.name)}</h3><p class="chapter-desc">${esc(ch.subtitle)} · ${ch.size}×${ch.size} puzzles</p><div class="chapter-footer"><span>${done}/${ch.count} challenges</span><span class="chapter-link">Explore →</span></div></button>`;
      }).join('')}</div>
    </section><aside class="more-strip"><div><strong>✦ Learning is the reward</strong><p>No ads, no rankings, and no losing points for asking for help. Sudoku is for everyone.</p></div><button class="btn btn-dark btn-sm" data-action="profiles">Choose hero →</button></aside>
  </div>`;
  prepareUi();
}
function renderChapter(chapterId) {
  const ch = CHAPTERS.find(c => c.id === chapterId);
  if (!ch) return renderHome();
  view = 'chapter';
  const p = profile();
  const levels = LEVELS.filter(l => l.chapterId === ch.id);
  screen.innerHTML = `<div class="page"><div class="crumbs"><button data-action="home">← Adventure map</button><span>/</span><span>${esc(ch.name)}</span></div><div class="game-header"><div><div class="eyebrow">${ch.icon} WORLD ${CHAPTERS.indexOf(ch) + 1} OF 6</div><h1>${esc(ch.name)}</h1><p>${esc(ch.explanation)}</p></div><div class="stat-pill">✦ ${ch.size}×${ch.size} grid</div></div>
    <div class="section-heading"><div><div class="section-kicker">Choose an adventure</div><h2>Little steps, big discoveries</h2></div></div>
    <div class="chapter-grid">${levels.map((l,i) => {
      const done = p.completed.includes(l.id);
      return `<button class="chapter-card" data-action="start" data-level="${l.id}"><div class="chapter-card-top"><div class="chapter-icon" aria-hidden="true">${done ? '⭐' : ['🔍','🧩','🌟','💡'][i % 4]}</div><span class="chip ${done ? 'gold' : ''}">${done ? 'Completed' : i === 0 ? 'Start here' : `Level ${i + 1}`}</span></div><h3 class="chapter-title">${esc(l.name)}</h3><p class="chapter-desc">${i === 0 ? esc(ch.lesson) : `Try a ${l.size}×${l.size} puzzle. Pip will help if you get stuck.`}</p><div class="chapter-footer"><span>${done ? '⭐ Solved' : `${l.blanks} empty squares to find`}</span><span class="chapter-link">${done ? 'Play again' : 'Let’s play'} →</span></div></button>`;
    }).join('')}</div><div class="more-strip"><div><strong>Already know this bit?</strong><p>You can explore any world and learn at your own pace.</p></div><button class="btn btn-dark btn-sm" data-action="home">Back to map</button></div></div>`;
  prepareUi();
}
function startLevel(levelId, forceNew = false) {
  academy?.recordAttempt();
  const level = levelById(levelId);
  if (!level) return;
  const p = profile();
  p.runs ||= {};
  if (p.run && isValidRun(p.run)) p.runs[p.run.levelId] = p.run;
  if (!forceNew && p.runs[levelId] && isValidRun(p.runs[levelId])) {
    p.run = p.runs[levelId];
    selected = p.run.board.findIndex(v => v === 0);
    if (selected < 0) selected = 0;
  } else {
    const counter = p.replays[levelId] || 0;
    const seed = hashSeed(`${p.id}|${level.id}|${counter}`);
    const generated = createPuzzle(level.size, level.blanks, seed);
    p.run = { levelId, size: level.size, seed, puzzle: generated.puzzle, solution: generated.solution, board: [...generated.puzzle], notes: {}, seconds: 0, attempts: 0, hints: 0 };
    p.runs[levelId] = p.run;
    p.replays[levelId] = counter + 1;
    selected = p.run.board.findIndex(v => v === 0);
  }
  notesMode = false;
  hintIndex = -1;
  tip = chapterFor(level).explanation;
  save();
  renderGame();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (data.settings.voice) say(chapterFor(level).explanation);
}
function cellText(run, index) {
  const n = run.board[index];
  if (n) return String(n);
  const notes = Array.isArray(run.notes?.[index]) ? run.notes[index] : [];
  return notes.length ? `<span class="notes" aria-hidden="true">${Array.from({length:9}, (_, n) => `<span>${notes.includes(n + 1) ? n + 1 : ''}</span>`).join('')}</span>` : '';
}
function renderBoard() {
  const run = profile().run;
  const size = run.size;
  const { boxRows, boxCols } = FORMATS[size];
  const selectedValue = run.board[selected];
  const peers = selected >= 0 ? new Set(getPeers(size, selected)) : new Set();
  const board = $('#game-board');
  if (!board) return;
  board.innerHTML = run.board.map((value, i) => {
    const row = Math.floor(i / size);
    const col = i % size;
    const fixed = !!run.puzzle[i];
    const isSelected = i === selected;
    const related = peers.has(i);
    const same = selectedValue && value === selectedValue && i !== selected;
    const classes = ['cell', fixed ? 'fixed' : '', related ? 'related' : '', same ? 'same-number' : '', isSelected ? 'selected' : '', size >= 4 && (col + 1) % boxCols === 0 && col < size - 1 ? 'box-right' : '', size >= 4 && (row + 1) % boxRows === 0 && row < size - 1 ? 'box-bottom' : ''].filter(Boolean).join(' ');
    const noteString = Array.isArray(run.notes?.[i]) && run.notes[i].length ? `, notes ${run.notes[i].join(', ')}` : '';
    return `<button type="button" class="${classes}" data-action="cell" data-index="${i}" role="gridcell" aria-selected="${isSelected}" aria-label="Row ${row+1}, column ${col+1}, ${fixed ? 'given ' : ''}${value || 'empty'}${noteString}" tabindex="${isSelected ? 0 : -1}">${cellText(run, i)}</button>`;
  }).join('');
  board.style.setProperty('--size', size);
  board.dataset.size = String(size);
  board.setAttribute('aria-label', `${size} by ${size} number puzzle`);
  renderPad();
}
function renderPad() {
  const run = profile().run;
  const pad = $('#number-pad');
  if (!pad || !run) return;
  const possible = selected >= 0 ? candidates(run.board, run.size, selected) : [];
  pad.style.setProperty('--pad-size', run.size === 9 ? 9 : run.size === 6 ? 6 : run.size === 1 ? 1 : run.size);
  pad.innerHTML = Array.from({ length: run.size }, (_, i) => {
    const n = i + 1;
    const right = data.settings.guide && possible.includes(n);
    return `<button class="number-button ${right ? 'possible' : ''} ${notesMode ? 'note-mode' : ''}" data-action="number" data-number="${n}" aria-label="${notesMode ? 'Pencil in' : 'Place'} ${n}">${n}</button>`;
  }).join('');
  const notesButton = $('[data-action="notes"]');
  if (notesButton) notesButton.setAttribute('aria-pressed', String(notesMode));
}
function renderGame() {
  const p = profile();
  const run = p.run;
  if (!run || !isValidRun(run)) return renderHome();
  view = 'game';
  const level = levelById(run.levelId);
  const ch = chapterFor(level);
  const solvedInChapter = LEVELS.filter(l => l.chapterId === ch.id && p.completed.includes(l.id)).length;
  screen.innerHTML = `<div class="page game-page">
    <div class="crumbs"><button data-action="home">← Adventure map</button><span>/</span><button data-action="chapter" data-chapter="${ch.id}">${esc(ch.name)}</button><span>/</span><span>Level ${level.number}</span></div>
    <div class="game-header"><div><div class="eyebrow">${ch.icon} ${esc(ch.name.toUpperCase())} · ADVENTURE ${level.number} OF ${ch.count}</div><h1>${esc(level.name)}</h1><p>${esc(ch.objective)}</p></div><div class="game-stats"><div class="stat-pill">⭐ ${p.xp} XP</div><div class="stat-pill">⌛ <span id="elapsed-time">${formatTime(run.seconds)}</span></div><div class="stat-pill">✦ <span id="filled-count">${run.board.filter(Boolean).length}</span>/${run.size * run.size} squares</div></div></div>
    <div class="game-layout"><section class="board-panel" aria-label="Play Sudoku">
      <div class="game-board-wrap"><div id="game-board" class="board" role="grid" data-size="${run.size}" aria-label="${run.size} by ${run.size} number puzzle"></div></div>
      <div class="board-instructions">Tap an empty square, then choose a number below. <span class="inline-star">✦</span></div>
      <div class="input-heading"><strong>Choose a number</strong><span>${notesMode ? '✎ Pencil mode' : '✦ Place mode'}</span></div>
      <div id="number-pad" class="number-pad"></div>
      <div class="board-tools"><button class="tool-button" data-action="erase">⌫ Erase</button><button class="tool-button" data-action="notes" aria-pressed="${notesMode}">✎ Pencil notes</button><button class="tool-button" data-action="hint">💡 Pip's clue</button><button class="tool-button" data-action="reset">↻ Restart</button></div>
      <div class="free-note">No penalties for mistakes. You are learning! ♥</div>
    </section><aside class="helper-panel"><section class="tip-card" aria-labelledby="pip-heading"><div class="tip-heading">${robot()}<div><small>YOUR PUZZLE PAL</small><h2 id="pip-heading">Pip's tip</h2></div></div><div id="tip-message" class="tip-message" role="status" aria-live="polite">${esc(tip)}</div><div class="tip-actions"><button class="btn btn-dark btn-sm" data-action="hint">💡 Give me a clue</button><button class="btn btn-ghost btn-sm" data-action="listen">🔊 Listen</button></div><div class="tip-actions"><button class="tool-button" data-action="reveal">✨ Show me one</button></div></section>
    <section class="lesson-card"><div class="section-kicker">THE LITTLE RULES</div><h3>How to win this puzzle</h3><div class="rule-list">${run.size === 1 ? '<div class="rule"><span class="rule-icon">1</span> Put 1 in the empty square.</div>' : `<div class="rule"><span class="rule-icon">↔</span> Every row has 1 to ${run.size}.</div><div class="rule"><span class="rule-icon col">↕</span> Every column has 1 to ${run.size}.</div>${run.size >= 4 ? `<div class="rule"><span class="rule-icon box">▦</span> Each little box has 1 to ${run.size}.</div>` : ''}`}</div><div class="step-dots" aria-hidden="true">${Array.from({length:ch.count}, (_, i) => `<i class="${i < solvedInChapter ? 'done' : i === level.order ? 'current' : ''}"></i>`).join('')}</div></section>
    <section class="mini-card"><h3>🌟 Little hero reminder</h3><p>It's okay to try, pause, and ask for a clue. Every puzzle you finish helps your brain grow!</p><button class="btn btn-light btn-sm" data-action="howto">? Learn the rules</button></section></aside></div>
    <div class="learning-trail"><span>🔍 Looking for a pattern? Look across a row, down a column, then inside the small box.</span><button class="btn btn-ghost btn-sm" data-action="chapter" data-chapter="${ch.id}">Choose another puzzle</button></div>
  </div>`;
  renderBoard();
  prepareUi();
}

function selectCell(index, focus = false) {
  const run = profile().run;
  if (!run || index < 0 || index >= run.board.length) return;
  selected = index;
  hintIndex = -1;
  renderBoard();
  if (focus) $(`[data-index="${index}"]`)?.focus();
}
function putNumber(value) {
  if (view !== 'game') return;
  const run = profile().run;
  if (selected < 0 || run.puzzle[selected]) { showToast('Pick an empty square first.'); return; }
  if (notesMode && value) {
    const previous = Array.isArray(run.notes[selected]) ? run.notes[selected] : [];
    run.notes[selected] = previous.includes(value) ? previous.filter(v => v !== value) : [...previous, value].sort((a,b) => a - b);
    save(); renderBoard(); return;
  }
  if (value && run.solution[selected] !== value) {
    run.attempts++;
    const row = Math.floor(selected / run.size) + 1;
    const col = selected % run.size + 1;
    const conflicting = getPeers(run.size, selected).some(i => run.board[i] === value);
    tip = conflicting ? `That ${value} already lives nearby. Check across row ${row} and down column ${col}${run.size >= 4 ? ', then inside the little box' : ''}.` : `Good try! ${value} isn't this square's number yet. Look at what is missing across and down.`;
    $('#tip-message').textContent = tip;
    showToast('Not quite — have another look. ♥');
    save();
    if (data.settings.voice) say(tip);
    return;
  }
  run.board[selected] = value;
  delete run.notes[selected];
  if (value) {
    for (const peerIndex of getPeers(run.size, selected)) {
      const notes = run.notes[peerIndex];
      if (!Array.isArray(notes)) continue;
      const i = notes.indexOf(value);
      if (i !== -1) notes.splice(i, 1);
    }
    tip = 'Lovely work! Now find another little square that needs a number.';
    const next = run.board.findIndex(v => v === 0);
    if (next >= 0) selected = next;
  }
  save();
  if (completed(run.board, run.solution)) return finishLevel();
  renderBoard();
  $('#filled-count').textContent = run.board.filter(Boolean).length;
  $('#tip-message').textContent = tip;
}
function giveHint(showAnswer = false) {
  if (view !== 'game') return;
  const run = profile().run;
  const helpful = getHelpfulCell(run.board, run.solution, run.size);
  if (!helpful) return;
  selected = helpful.index;
  hintIndex = helpful.index;
  run.hints++;
  const row = Math.floor(helpful.index / run.size) + 1;
  const col = helpful.index % run.size + 1;
  if (showAnswer) {
    const explanation = `Watch this square in row ${row}, column ${col}. The number ${helpful.answer} fits here. Let's try the next one together!`;
    notesMode = false;
    putNumber(helpful.answer);
    tip = explanation;
    if (view === 'game') $('#tip-message').textContent = tip;
  } else {
    const nums = helpful.allowed.join(', ');
    tip = helpful.allowed.length === 1 ? `I found a good square! In row ${row}, column ${col}, only ${nums} fits. What do you think?` : `Let's look at row ${row}, column ${col}. The possible numbers are ${nums}. Can you spot which belongs here?`;
    save();
    renderBoard();
    $('#tip-message').textContent = tip;
  }
  if (data.settings.voice) say(tip);
}
function finishLevel() {
  const p = profile();
  const run = p.run;
  const level = levelById(run.levelId);
  const firstTime = !p.completed.includes(level.id);
  const earned = firstTime ? 20 : 5;
  if (firstTime) p.completed.push(level.id);
  p.xp += earned;
  p.totalSeconds = (p.totalSeconds || 0) + run.seconds;
  p.hints = (p.hints || 0) + run.hints;
  p.attempts = (p.attempts || 0) + run.attempts;
  if (p.runs) delete p.runs[level.id];
  p.run = null;
  save();
  if (data.settings.voice) say(`Hooray, ${p.name}! You did it!`);
  const next = nextLevel(level);
  const message = firstTime ? `You have completed ${completedCount(p)} of ${LEVELS.length} adventures. Your number detective skills are growing!` : 'Another brilliant solve! Practising makes your number detective skills stronger.';
  showDialog(`<div class="success-scene"><div class="large-star" aria-hidden="true">🌟</div><div class="eyebrow">ADVENTURE COMPLETE</div><h2>Hooray, ${esc(p.name)}!</h2><div class="stars" aria-label="Three celebration stars">★ ★ ★</div><p>${esc(message)}</p><p><strong>+${earned} Hero XP</strong> · ${formatTime(run.seconds)} of thoughtful play</p><div class="dialog-actions" style="justify-content:center"><button class="btn btn-ghost" data-action="home">Adventure map</button>${next ? `<button class="btn btn-primary" data-action="start" data-level="${next.id}">Next adventure →</button>` : `<button class="btn btn-primary" data-action="home">See your journey ✦</button>`}</div></div>`, 'success');
  renderHome();
}
function resetRun() {
  const run = profile().run;
  if (!run) return;
  run.board = [...run.puzzle];
  run.notes = {};
  run.seconds = 0;
  run.attempts = 0;
  run.hints = 0;
  selected = run.board.findIndex(v => !v);
  tip = chapterFor(levelById(run.levelId)).explanation;
  save(); renderGame(); showToast('Fresh start! Your adventure is ready.');
}
function showDialog(content, kind = '') {
  dialogRoot.innerHTML = `<div class="overlay" data-overlay="true"><div class="dialog ${kind === 'wide' ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${kind === 'success' ? 'Puzzle completed' : 'Game menu'}">${kind !== 'success' ? '<div class="dialog-head"><span class="eyebrow">HERO ACADEMY</span><button class="close-button" data-action="close" aria-label="Close dialog">✕</button></div>' : ''}${content}</div></div>`;
  dialogRoot.querySelector('button')?.focus();
}
function closeDialog() { dialogRoot.innerHTML = ''; }
function showHowTo() {
  showDialog(`<h2>Sudoku, one step at a time</h2><p>Sudoku is a number puzzle, not a maths test. You never have to add or subtract!</p>
    <div class="guide-diagram" role="img" aria-label="A 4 by 4 example grid with one missing number"><div>1</div><div>2</div><div>3</div><div>4</div><div>3</div><div>4</div><div>1</div><div>2</div><div>2</div><div>1</div><div>4</div><div>3</div><div class="hi">?</div><div>3</div><div>2</div><div>1</div></div>
    <div class="guide-steps"><div class="guide-step"><span class="number">1</span><p><strong>Look across.</strong> Which number is missing from this row? It's 4!</p></div><div class="guide-step"><span class="number">2</span><p><strong>Look down.</strong> Check the column to make sure 4 is not already there.</p></div><div class="guide-step"><span class="number">3</span><p><strong>Look inside.</strong> In 4×4, 6×6, and 9×9 puzzles, each smaller box must also have each number once.</p></div><div class="guide-step"><span class="number">★</span><p><strong>Keep going!</strong> Pick an empty square and choose a number. Ask Pip for a clue whenever you need one.</p></div></div>
    <div class="dialog-actions"><button class="btn btn-primary" data-action="close">Got it! Let's play ✦</button><button class="btn btn-ghost" data-action="listen-guide">🔊 Hear the rules</button></div>`, 'wide');
}
function showSettings() {
  showDialog(`<h2>Make it yours ⚙</h2><p>Choose how your puzzles feel. Your settings are saved on this device.</p>
    <label class="toggle-line"><input type="checkbox" data-setting="voice" ${data.settings.voice ? 'checked' : ''}> <span>🔊 Speak instructions and helpful tips <small style="display:block;color:#738b82">Uses your device's available British English voice</small></span></label>
    <label class="toggle-line"><input type="checkbox" data-setting="guide" ${data.settings.guide ? 'checked' : ''}> <span>💡 Highlight possible numbers</span></label>
    <label class="toggle-line"><input type="checkbox" data-setting="largeText" ${data.settings.largeText ? 'checked' : ''}> <span>🔎 Larger numbers and text</span></label>
    <div class="dialog-actions"><button class="btn btn-dark btn-sm" data-action="export">↓ Export my progress</button><button class="btn btn-ghost btn-sm" data-action="import">↑ Import backup</button><input type="file" id="import-file" accept="application/json,.json" hidden></div>
    <p style="font-size:12px">Progress stays on this device. Connect through My Academy for parent-approved cloud saves, shared Hero XP and short play summaries. Local puzzle stars stay separate from shared XP.</p>
    <div class="dialog-actions"><button class="btn btn-primary" data-action="close">All done ✦</button></div>`);
}
function showProfiles() {
  const p = profile();
  showDialog(`<h2>Who's playing today?</h2><p>Choose your hero. Every learner keeps their own puzzles and stars on this device.</p><div class="profile-list">${data.profiles.map(item => `<div class="profile-item"><span class="avatar" aria-hidden="true">${item.avatar}</span><div style="flex:1"><strong>${esc(item.name)}</strong><small>${completedCount(item)} adventures · ${item.xp || 0} Hero XP</small></div>${item.id === p.id ? '<span class="chip">Playing</span>' : `<button class="btn btn-dark btn-sm" data-action="switch-profile" data-profile="${esc(item.id)}">Choose</button>`}</div>`).join('')}</div>
    ${data.profiles.length < 5 ? `<h3>Create another hero</h3><label class="dialog-label" for="new-name">Hero name</label><input id="new-name" type="text" maxlength="25" autocomplete="off" placeholder="e.g. Lily"><label class="dialog-label">Choose a character</label><div class="avatar-pick">${AVATARS.map((a,i) => `<button class="avatar-option" data-action="avatar" data-avatar="${a}" aria-pressed="${i === 0}">${a}</button>`).join('')}</div><div class="dialog-actions"><button class="btn btn-primary" data-action="add-profile">Create hero ✦</button></div>` : '<p>You have five hero spaces on this device.</p>'}
    <div class="dialog-actions"><button class="btn btn-ghost" data-action="close">Close</button></div>`);
}
function exportData() {
  const blob = new Blob([JSON.stringify({ type: 'hero-academy-sudoku-backup', exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hero-academy-sudoku-backup-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast('Backup downloaded! Keep it somewhere safe.');
}
async function importData(file) {
  if (!file || file.size > 500_000) { showToast('That backup is too large.'); return; }
  try {
    const parsed = JSON.parse(await file.text());
    const next = parsed?.type === 'hero-academy-sudoku-backup' ? parsed.data : null;
    if (!next || next.version !== 1 || !Array.isArray(next.profiles) || !next.profiles.length || next.profiles.length > 5 || !next.profiles.every(validProfile)) throw new Error('invalid');
    for (const p of next.profiles) {
      if (p.completed.length > LEVELS.length || p.completed.some(v => !LEVELS.some(l => l.id === v)) || !Number.isFinite(p.xp) || p.xp < 0) throw new Error('invalid');
      if (p.run && !isValidRun(p.run)) throw new Error('invalid');
    }
    if (!confirm('Replace the progress on this device with this backup? You can export your current progress first.')) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    data = load(); closeDialog(); renderHome(); showToast('Your heroes are back! ✦');
  } catch { showToast('That file is not a valid Sudoku Quest backup.'); }
}
function handleAction(button) {
  const action = button.dataset.action;
  if (!action) return;
  if (action === 'home') { closeDialog(); renderHome(); }
  else if (action === 'chapter') { closeDialog(); renderChapter(button.dataset.chapter); }
  else if (action === 'start') { closeDialog(); startLevel(button.dataset.level); }
  else if (action === 'howto') showHowTo();
  else if (action === 'close') closeDialog();
  else if (action === 'settings') showSettings();
  else if (action === 'profiles') showProfiles();
  else if (action === 'cell') selectCell(Number(button.dataset.index));
  else if (action === 'number') putNumber(Number(button.dataset.number));
  else if (action === 'erase') putNumber(0);
  else if (action === 'hint') giveHint();
  else if (action === 'reveal') giveHint(true);
  else if (action === 'listen') say(tip);
  else if (action === 'listen-guide') say('Sudoku is a number puzzle. Every row and every column must have all the numbers with no repeats. On bigger boards, each little box must too. Take your time and ask Pip for a clue.');
  else if (action === 'notes') { notesMode = !notesMode; renderPad(); $('.input-heading span').textContent = notesMode ? '✎ Pencil mode' : '✦ Place mode'; }
  else if (action === 'reset') { if (confirm('Restart this puzzle from the beginning?')) resetRun(); }
  else if (action === 'switch-profile') { data.activeProfileId = button.dataset.profile; save(); closeDialog(); renderHome(); }
  else if (action === 'avatar') { dialogRoot.querySelectorAll('.avatar-option').forEach(b => b.setAttribute('aria-pressed', String(b === button))); }
  else if (action === 'add-profile') {
    const name = $('#new-name')?.value.trim().slice(0, 25);
    if (!name) { showToast('Give your new hero a name first.'); return; }
    const avatar = dialogRoot.querySelector('.avatar-option[aria-pressed="true"]')?.dataset.avatar || AVATARS[0];
    const p = makeProfile(name, avatar);
    data.profiles.push(p); data.activeProfileId = p.id; save(); closeDialog(); renderHome(); showToast(`Welcome, ${name}!`);
  } else if (action === 'export') exportData();
  else if (action === 'import') $('#import-file')?.click();
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) handleAction(button);
  else if (event.target?.dataset?.overlay) closeDialog();
});
document.addEventListener('change', event => {
  if (event.target.dataset.setting) {
    data.settings[event.target.dataset.setting] = event.target.checked;
    save(); prepareUi();
    if (view === 'game') renderPad();
    if (event.target.dataset.setting === 'voice' && event.target.checked) say('Hello! I am Pip. Let us learn together!');
  }
  if (event.target.id === 'import-file') importData(event.target.files?.[0]);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && dialogRoot.innerHTML) { closeDialog(); return; }
  if (dialogRoot.innerHTML || view !== 'game' || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
  const run = profile().run;
  if (!run) return;
  const r = Math.floor(selected / run.size);
  const c = selected % run.size;
  if (event.key === 'ArrowUp') { event.preventDefault(); selectCell(((r - 1 + run.size) % run.size) * run.size + c, true); }
  else if (event.key === 'ArrowDown') { event.preventDefault(); selectCell(((r + 1) % run.size) * run.size + c, true); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); selectCell(r * run.size + (c - 1 + run.size) % run.size, true); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); selectCell(r * run.size + (c + 1) % run.size, true); }
  else if (/^[1-9]$/.test(event.key) && Number(event.key) <= run.size) { event.preventDefault(); putNumber(Number(event.key)); }
  else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') { event.preventDefault(); putNumber(0); }
  else if (event.key.toLowerCase() === 'n') { notesMode = !notesMode; renderPad(); $('.input-heading span').textContent = notesMode ? '✎ Pencil mode' : '✦ Place mode'; }
  else if (event.key.toLowerCase() === 'h') giveHint();
});

$('#home-brand').addEventListener('click', renderHome);
$('#nav-map').addEventListener('click', renderHome);
$('#nav-help').addEventListener('click', showHowTo);
$('#nav-settings').addEventListener('click', showSettings);
$('#nav-profile').addEventListener('click', showProfiles);
document.addEventListener('visibilitychange', () => { lastTick = Date.now(); });
setInterval(() => {
  const now = Date.now();
  const elapsed = Math.min(2, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  if (document.hidden || view !== 'game' || dialogRoot.innerHTML || !profile().run) return;
  profile().run.seconds += Math.floor(elapsed + .5);
  const display = $('#elapsed-time');
  if (display) display.textContent = formatTime(profile().run.seconds);
  if (++tickCount % 10 === 0) save();
}, 1000);
window.addEventListener('pagehide', save);
if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
});
renderHome();

try { academy = await bootAcademy(sudokuAdapter({getData:()=>data,levels:LEVELS,makeProfile,validProfile,validRun:isValidRun,persist:()=>save(false),refresh:()=>{closeDialog();selected=-1;renderHome();}})); } catch { showToast('Local play is ready. Connect through My Academy when online.'); }
