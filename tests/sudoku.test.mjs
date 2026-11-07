import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATS, solvedBoard, createPuzzle, countSolutions, candidates, hasConflict, completed } from '../dist/sudoku.mjs';

for (const size of [1, 2, 4, 6, 9]) {
  test(`${size}x${size} generated solution obeys its rules`, () => {
    for (const seed of [1, 7, 157, 200310]) {
      const solution = solvedBoard(size, seed);
      assert.equal(solution.length, size * size);
      assert.equal(countSolutions(solution, size), 1);
      for (let i = 0; i < solution.length; i++) assert.equal(hasConflict(solution, size, i), false);
      const { boxRows, boxCols } = FORMATS[size];
      if (size >= 4) {
        for (let r = 0; r < size; r += boxRows) {
          for (let c = 0; c < size; c += boxCols) {
            const values = [];
            for (let br = 0; br < boxRows; br++) for (let bc = 0; bc < boxCols; bc++) values.push(solution[(r + br) * size + c + bc]);
            assert.equal(new Set(values).size, size);
          }
        }
      }
    }
  });
  test(`${size}x${size} generated puzzles have one solution`, () => {
    const target = ({ 1: 1, 2: 1, 4: 8, 6: 19, 9: 43 })[size];
    for (const seed of [1, 31, 1743]) {
      const { puzzle, solution, blanks } = createPuzzle(size, target, seed);
      assert.ok(blanks > 0);
      assert.equal(countSolutions(puzzle, size), 1);
      assert.ok(puzzle.every((v, i) => !v || v === solution[i]));
      assert.equal(completed(solution, solution), true);
      assert.equal(completed(puzzle, solution), false);
      for (const [i, val] of puzzle.entries()) if (!val) assert.ok(candidates(puzzle, size, i).includes(solution[i]));
    }
  });
}
