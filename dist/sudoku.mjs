/** Pure Sudoku and mini-grid helpers. All puzzles are generated offline in-browser. */
export const FORMATS = {
  1: { boxRows: 1, boxCols: 1 },
  2: { boxRows: 1, boxCols: 2 }, // Latin square introduction: rows and columns only
  4: { boxRows: 2, boxCols: 2 },
  6: { boxRows: 2, boxCols: 3 },
  9: { boxRows: 3, boxCols: 3 },
};

export function hashSeed(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randomFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getPeers(size, index) {
  const { boxRows, boxCols } = FORMATS[size];
  const row = Math.floor(index / size);
  const col = index % size;
  const peers = new Set();
  for (let c = 0; c < size; c++) peers.add(row * size + c);
  for (let r = 0; r < size; r++) peers.add(r * size + col);
  if (size >= 4) {
    const top = Math.floor(row / boxRows) * boxRows;
    const left = Math.floor(col / boxCols) * boxCols;
    for (let r = top; r < top + boxRows; r++) {
      for (let c = left; c < left + boxCols; c++) peers.add(r * size + c);
    }
  }
  peers.delete(index);
  return [...peers];
}

export function candidates(board, size, index) {
  if (board[index]) return [];
  const used = new Set(getPeers(size, index).map(i => board[i]).filter(Boolean));
  return Array.from({ length: size }, (_, i) => i + 1).filter(n => !used.has(n));
}

export function hasConflict(board, size, index) {
  return !!board[index] && getPeers(size, index).some(i => board[i] === board[index]);
}

export function solvedBoard(size, seed) {
  if (!FORMATS[size]) throw new Error('Unsupported board size');
  if (size === 1) return [1];
  const { boxRows, boxCols } = FORMATS[size];
  const random = randomFrom(seed);
  const groups = (count, width) => {
    const bands = shuffled(Array.from({ length: count / width }, (_, i) => i), random);
    return bands.flatMap(b => shuffled(Array.from({ length: width }, (_, j) => b * width + j), random));
  };
  const rows = groups(size, boxRows);
  const cols = groups(size, boxCols);
  const symbols = shuffled(Array.from({ length: size }, (_, i) => i + 1), random);
  return rows.flatMap(r => cols.map(c => symbols[(r * boxCols + Math.floor(r / boxRows) + c) % size]));
}

/** Count solutions, stopping at maxCount. Used to guarantee a fair puzzle. */
export function countSolutions(board, size, maxCount = 2) {
  const working = [...board];
  let count = 0;
  function search() {
    if (count >= maxCount) return;
    let best = -1;
    let options = null;
    for (let i = 0; i < working.length; i++) {
      if (working[i]) {
        if (hasConflict(working, size, i)) return;
        continue;
      }
      const available = candidates(working, size, i);
      if (!available.length) return;
      if (!options || available.length < options.length) {
        best = i;
        options = available;
        if (available.length === 1) break;
      }
    }
    if (best === -1) { count++; return; }
    for (const value of options) {
      working[best] = value;
      search();
      working[best] = 0;
      if (count >= maxCount) return;
    }
  }
  search();
  return count;
}

export function createPuzzle(size, blanks, seed) {
  const solution = solvedBoard(size, seed);
  const puzzle = [...solution];
  const random = randomFrom((seed ^ 0x9e3779b9) >>> 0);
  const indices = shuffled(Array.from({ length: size * size }, (_, i) => i), random);
  let removed = 0;
  for (const i of indices) {
    if (removed >= blanks) break;
    const value = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, size) === 1) removed++;
    else puzzle[i] = value;
  }
  return { puzzle, solution, blanks: removed, size, seed };
}

export function getHelpfulCell(board, solution, size) {
  const empty = [];
  for (let index = 0; index < board.length; index++) {
    if (board[index]) continue;
    const allowed = candidates(board, size, index);
    empty.push({ index, allowed, answer: solution[index] });
  }
  empty.sort((a, b) => a.allowed.length - b.allowed.length);
  return empty[0] || null;
}

export function completed(board, solution) {
  return board.length === solution.length && board.every((value, i) => value === solution[i]);
}
