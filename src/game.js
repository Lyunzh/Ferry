import { scenario } from "./scenario.js";

export class GameError extends Error {}

export function createGame() {
  return {
    directory: scenario.startDirectory,
    draft: [],
    history: [],
    evidence: { task: null, suspicion: null },
    deadline: null,
    remainingMs: scenario.durationMs,
    phase: "ready",
  };
}

export function tick(state, now = Date.now()) {
  if (state.phase !== "playing") return state;
  const remainingMs = Math.max(0, state.deadline - now);
  return {
    ...state,
    remainingMs,
    phase: remainingMs === 0 ? "expired" : "playing",
  };
}

function assertActive(state, now) {
  if (
    ["won", "expired"].includes(state.phase) ||
    (state.deadline !== null && now >= state.deadline)
  ) {
    throw new GameError("本轮已结束，请重新开始。");
  }
}

export function choices(state) {
  if (["won", "expired"].includes(state.phase)) return [];
  const directory = scenario.directories[state.directory];
  if (state.draft.length === 0) {
    return [
      "ls",
      "cat",
      "cd",
      ...(state.directory === scenario.execution.directory ? ["python"] : []),
    ];
  }
  if (state.draft.length !== 1) return [];
  switch (state.draft[0]) {
    case "cat":
      return Object.keys(directory.files);
    case "cd":
      return [
        ...Object.keys(directory.children),
        ...(directory.parent ? [".."] : []),
      ];
    case "python":
      return [scenario.execution.filename];
    default:
      return [];
  }
}

export function canExecute(state) {
  if (["won", "expired"].includes(state.phase)) return false;
  return (
    (state.draft.length === 1 && state.draft[0] === "ls") ||
    state.draft.length === 2
  );
}

export function chooseToken(state, token, now = Date.now()) {
  assertActive(state, now);
  if (!choices(state).includes(token))
    throw new GameError("这个 token 不在当前目录的可用选项中。");
  return {
    ...tick(state, now),
    draft: [...state.draft, token],
    phase: "playing",
    deadline: state.deadline ?? now + scenario.durationMs,
  };
}

export function backspace(state, now = Date.now()) {
  assertActive(state, now);
  return { ...tick(state, now), draft: state.draft.slice(0, -1) };
}

export function executeCommand(state, now = Date.now()) {
  assertActive(state, now);
  if (!canExecute(state))
    throw new GameError("命令还没完成，请继续选择 token。");
  const [command, argument] = state.draft;
  const directory = scenario.directories[state.directory];
  let nextDirectory = state.directory;
  let result;
  switch (command) {
    case "ls":
      result = {
        num: 104,
        kind: "listing",
        title: "当前目录",
        string: [
          ...Object.keys(directory.files),
          ...Object.keys(directory.children).map((name) => `${name}/`),
        ].join("\n"),
      };
      break;
    case "cat":
      result = directory.files[argument];
      break;
    case "cd":
      nextDirectory =
        argument === ".." ? directory.parent : directory.children[argument];
      if (nextDirectory)
        result = {
          num: 105,
          kind: "text",
          title: "工作目录已切换",
          string: nextDirectory,
        };
      break;
    case "python":
      if (
        state.directory === scenario.execution.directory &&
        argument === scenario.execution.filename
      )
        result = scenario.execution.result;
      break;
  }
  if (!result) throw new GameError("当前目录不支持这条命令。");
  return {
    ...tick(state, now),
    directory: nextDirectory,
    draft: [],
    history: [
      ...state.history,
      { ...result, command: state.draft.join(" "), directory: state.directory },
    ],
  };
}

export function parseResultId(payload) {
  if (typeof payload !== "string" || !/^\d{1,6}$/.test(payload))
    throw new GameError("拖拽内容不是有效的终端结果。");
  return Number(payload);
}

export function attachEvidence(state, slot, num, now = Date.now()) {
  assertActive(state, now);
  if (!Object.hasOwn(scenario.evidence, slot))
    throw new GameError("未知证据区。");
  if (
    !Number.isSafeInteger(num) ||
    !state.history.some((result) => result.num === num)
  ) {
    throw new GameError("请使用本轮终端中已经生成的结果。");
  }
  if (scenario.evidence[slot].acceptedNum !== num) {
    throw new GameError(
      slot === "task"
        ? "这条结果不能证明余额查询已完成，请提交脚本运行结果。"
        : "这条结果没有关卡所需的线索，请继续查看脚本运行结果。",
    );
  }
  return { ...tick(state, now), evidence: { ...state.evidence, [slot]: num } };
}

export function removeEvidence(state, slot, now = Date.now()) {
  assertActive(state, now);
  if (!Object.hasOwn(scenario.evidence, slot))
    throw new GameError("未知证据区。");
  return { ...tick(state, now), evidence: { ...state.evidence, [slot]: null } };
}

export function submit(state, now = Date.now()) {
  assertActive(state, now);
  if (
    !Object.entries(scenario.evidence).every(
      ([slot, rule]) => state.evidence[slot] === rule.acceptedNum,
    )
  ) {
    throw new GameError("还缺少依据：请分别向两个证据区提交正确的终端结果。");
  }
  return { ...tick(state, now), phase: "won" };
}
