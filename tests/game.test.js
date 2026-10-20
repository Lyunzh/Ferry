import test from "node:test";
import assert from "node:assert/strict";
import { scenario } from "../src/scenario.js";
import {
  createGame,
  choices,
  chooseToken,
  canExecute,
  executeCommand,
  backspace,
  attachEvidence,
  removeEvidence,
  parseResultId,
  submit,
  tick,
  GameError,
} from "../src/game.js";

const now = 1000;
function run(state, ...tokens) {
  for (const token of tokens) state = chooseToken(state, token, now);
  return executeCommand(state, now);
}
function balanceRun() {
  return run(run(createGame(), "cd", "scripts"), "python", "balance.py");
}

test("root file choices include .env and exclude nested scripts", () => {
  const state = chooseToken(createGame(), "cat", now);
  assert.deepEqual(choices(state), ["README.md", ".env"]);
  for (const token of [
    "balance.py",
    "scripts/balance.py",
    "scripts",
    "../scripts/balance.py",
  ]) {
    assert.throws(() => chooseToken(state, token, now), GameError);
  }
  assert.ok(!choices(createGame()).includes("python"));
  assert.throws(() => chooseToken(createGame(), "python", now), GameError);
});

test("cd changes directory only when Enter executes and restores parent choices", () => {
  const root = createGame();
  const draft = chooseToken(chooseToken(root, "cd", now), "scripts", now);
  assert.equal(draft.directory, "/workspace");
  assert.equal(draft.history.length, 0);
  const child = executeCommand(draft, now);
  assert.equal(child.directory, "/workspace/scripts");
  assert.deepEqual(choices(chooseToken(child, "cat", now)), [
    "balance.py",
    ".env",
  ]);
  assert.throws(
    () => chooseToken(chooseToken(child, "cat", now), "README.md", now),
    GameError,
  );
  const parent = run(child, "cd", "..");
  assert.equal(parent.directory, "/workspace");
  assert.equal(parent.history.length, 2);
});

test("every direct file can be cat'd; env contents never qualify as evidence", () => {
  for (const [path, directory] of Object.entries(scenario.directories)) {
    for (const [name, file] of Object.entries(directory.files)) {
      const state = run({ ...createGame(), directory: path }, "cat", name);
      assert.equal(state.history.at(-1).num, file.num);
      assert.equal(state.history.at(-1).string, file.string);
      assert.throws(
        () => attachEvidence(state, "task", file.num, now),
        GameError,
      );
      assert.throws(
        () => attachEvidence(state, "suspicion", file.num, now),
        GameError,
      );
    }
  }
});

test("incomplete commands cannot execute; backspace has no output side effect", () => {
  const root = createGame();
  assert.equal(canExecute(root), false);
  assert.throws(() => executeCommand(root, now), GameError);
  const state = chooseToken(root, "cat", now);
  assert.equal(canExecute(state), false);
  assert.throws(() => executeCommand(state, now), GameError);
  const erased = backspace(state, now);
  assert.deepEqual(erased.draft, []);
  assert.equal(erased.history.length, 0);
  assert.equal(erased.deadline, now + scenario.durationMs);
});

test("executing the script appends exactly one structured result", () => {
  const child = run(createGame(), "cd", "scripts");
  const state = run(child, "python", "balance.py");
  assert.equal(state.history.length, child.history.length + 1);
  const result = state.history.at(-1);
  assert.equal(result.num, 103);
  assert.equal(
    JSON.parse(result.string).user.balence.balance_infos[0].currency,
    "CNY",
  );
  assert.deepEqual(state.draft, []);
});

test("unseen IDs, invalid IDs, external text and unknown slots are rejected", () => {
  assert.throws(
    () => attachEvidence(createGame(), "task", 103, now),
    GameError,
  );
  const state = balanceRun();
  for (const id of ["103", -1, 999, NaN, Infinity, null]) {
    assert.throws(() => attachEvidence(state, "task", id, now), GameError);
  }
  for (const slot of ["unknown", "__proto__", "constructor"]) {
    assert.throws(() => attachEvidence(state, slot, 103, now), GameError);
    assert.throws(() => removeEvidence(state, slot, now), GameError);
  }
  for (const payload of [
    undefined,
    "",
    "1e2",
    "103.0",
    "103abc",
    "103\n",
    "-103",
    "{}",
    "9999999",
    "<script>",
  ]) {
    assert.throws(() => parseResultId(payload), GameError);
  }
  assert.equal(parseResultId("103"), 103);
  assert.deepEqual(state.evidence, { task: null, suspicion: null });
});

test("one result supports both slots; duplicate attachment is idempotent", () => {
  const state = balanceRun();
  const task = attachEvidence(state, "task", 103, now);
  assert.throws(() => submit(task, now), GameError);
  const both = attachEvidence(task, "suspicion", 103, now);
  assert.deepEqual(attachEvidence(both, "suspicion", 103, now), both);
  assert.equal(both.history.length, state.history.length);
  assert.equal(submit(both, now).phase, "won");
});

test("removing evidence invalidates submission; repeated commands preserve result num", () => {
  let state = balanceRun();
  state = run(state, "python", "balance.py");
  assert.deepEqual(
    state.history.slice(-2).map((result) => result.num),
    [103, 103],
  );
  state = attachEvidence(
    attachEvidence(state, "task", 103, now),
    "suspicion",
    103,
    now,
  );
  assert.throws(
    () => submit(removeEvidence(state, "task", now), now),
    GameError,
  );
});

test("timer starts with first token, continues through idle time, and locks expired actions", () => {
  const ready = createGame();
  assert.deepEqual(tick(ready, 999999), ready);
  const state = chooseToken(ready, "ls", now);
  assert.equal(
    tick(state, now + 15000).remainingMs,
    scenario.durationMs - 15000,
  );
  const deadline = now + scenario.durationMs;
  const expired = tick(state, deadline);
  assert.equal(expired.phase, "expired");
  assert.equal(expired.remainingMs, 0);
  assert.throws(() => executeCommand(state, deadline), GameError);
  assert.throws(() => backspace(expired, deadline), GameError);
  assert.deepEqual(choices(expired), []);
  assert.equal(canExecute(expired), false);
});

test("success freezes remaining time; resetting creates a clean independent session", () => {
  const both = attachEvidence(
    attachEvidence(balanceRun(), "task", 103, now),
    "suspicion",
    103,
    now,
  );
  assert.throws(() => submit(both, now + scenario.durationMs), GameError);
  const won = submit(both, now + 1000);
  assert.deepEqual(tick(won, now + scenario.durationMs * 2), won);
  assert.throws(() => chooseToken(won, "ls", now + 1001), GameError);
  assert.throws(() => removeEvidence(won, "task", now + 1001), GameError);
  const reset = createGame();
  assert.equal(reset.phase, "ready");
  assert.equal(reset.deadline, null);
  assert.deepEqual(reset.history, []);
  assert.deepEqual(reset.evidence, { task: null, suspicion: null });
  assert.equal(reset.directory, "/workspace");
});
