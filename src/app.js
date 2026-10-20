import { scenario } from "./scenario.js";
import {
  GameError,
  createGame,
  tick,
  choices,
  canExecute,
  chooseToken,
  backspace,
  executeCommand,
  attachEvidence,
  removeEvidence,
  parseResultId,
  submit,
} from "./game.js";

const $ = (selector) => document.querySelector(selector);
const dragType = "application/x-next-token-result";
let game = createGame();
let selectedResult = null;
let feedbackTimeout;
let lastDialogTrigger = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function notify(message, error = false) {
  const feedback = $("#feedback");
  clearTimeout(feedbackTimeout);
  feedback.textContent = message;
  feedback.className = `feedback${error ? " error" : ""}`;
  feedback.hidden = false;
  feedbackTimeout = setTimeout(() => {
    feedback.hidden = true;
  }, 5500);
}

function update(transform, successMessage) {
  game = tick(game);
  if (game.phase === "expired") {
    render();
    showSettlement();
    return false;
  }
  try {
    game = transform(game);
    render();
    if (successMessage) notify(successMessage);
    return true;
  } catch (error) {
    if (!(error instanceof GameError)) throw error;
    notify(error.message, true);
    return false;
  }
}

function selectResult(num, index) {
  if (["expired", "won"].includes(game.phase)) return;
  selectedResult = selectedResult === num ? null : num;
  renderHistory();
  renderEvidence();
  const button = document.querySelector(
    `[data-history-index="${index}"] .result-select`,
  );
  button?.focus({ preventScroll: true });
  notify(
    selectedResult === null
      ? "已取消选择。"
      : `已选择 RESULT #${num}，点击任一证据区即可提交。`,
  );
}

function renderHistory() {
  const history = $("#history");
  history.replaceChildren();
  const finished = ["expired", "won"].includes(game.phase);
  game.history.forEach((result, index) => {
    const entry = element("article", "history-entry");
    entry.dataset.historyIndex = String(index);
    const command = element("div", "history-command");
    command.append(
      element("span", "", result.directory.replace("/workspace", "~")),
      element("span", "history-dollar", "❯"),
      document.createTextNode(result.command),
    );
    const card = element(
      "div",
      `result-card${selectedResult === result.num ? " selected" : ""}`,
    );
    card.draggable = !finished;
    card.dataset.resultNum = String(result.num);
    card.setAttribute(
      "aria-label",
      `RESULT #${result.num}，${result.title}，可拖入证据区`,
    );
    const header = element("div", "result-header");
    header.append(
      element("span", "result-handle", "⠿"),
      element("span", "result-number", `RESULT #${result.num}`),
      element("span", "result-title", result.title),
    );
    const select = element(
      "button",
      "result-select",
      selectedResult === result.num ? "已选择 ✓" : "选择证据 ↗",
    );
    select.disabled = finished;
    select.setAttribute("aria-pressed", String(selectedResult === result.num));
    select.setAttribute("aria-label", `选择 RESULT #${result.num} 作为证据`);
    select.addEventListener("click", (event) => {
      event.stopPropagation();
      selectResult(result.num, index);
    });
    header.append(select);
    const pre = element("pre");
    pre.textContent = result.string;
    card.append(header, pre);
    card.addEventListener("click", () => selectResult(result.num, index));
    card.addEventListener("dragstart", (event) => {
      if (finished || !event.dataTransfer) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData(dragType, String(result.num));
      event.dataTransfer.effectAllowed = "copy";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document
        .querySelectorAll(".drag-over")
        .forEach((zone) => zone.classList.remove("drag-over"));
    });
    entry.append(command, card);
    history.append(entry);
  });
  $("#empty-hint").hidden = game.history.length > 0;
  $("#command-count").textContent = String(game.history.length);
}

function renderComposer() {
  $("#directory-label").textContent = game.directory;
  const directory = scenario.directories[game.directory];
  const preview = $(".workspace-preview");
  preview.replaceChildren(element("span", "", "当前目录"));
  Object.keys(directory.files).forEach((name) =>
    preview.append(element("span", "", name)),
  );
  Object.keys(directory.children).forEach((name) =>
    preview.append(element("span", "directory-file", `${name}/`)),
  );
  $("#draft-command").textContent = game.draft.join(" ");
  $("#backspace-button").disabled =
    game.draft.length === 0 || ["expired", "won"].includes(game.phase);
  const container = $("#token-options");
  container.replaceChildren();
  choices(game).forEach((token) => {
    const button = element("button", "token", token);
    button.dataset.token = token;
    button.addEventListener("click", () => {
      if (update((state) => chooseToken(state, token))) focusNextToken();
    });
    container.append(button);
  });
  if (canExecute(game)) {
    const enter = element("button", "token enter-token", "Enter ↵");
    enter.id = "execute-button";
    enter.addEventListener("click", execute);
    container.append(enter);
  }
  $("#token-hint").textContent = ["expired", "won"].includes(game.phase)
    ? "本轮已结束"
    : canExecute(game)
      ? "确认执行命令"
      : "选择下一个 token";
}

function focusNextToken() {
  $("#execute-button")?.focus({ preventScroll: true });
  if (!$("#execute-button"))
    $("#token-options button")?.focus({ preventScroll: true });
}

function execute() {
  if (update((state) => executeCommand(state))) {
    const output = $("#terminal-output");
    output.scrollTop = output.scrollHeight;
    focusNextToken();
  }
}

function renderEvidence() {
  const finished = ["expired", "won"].includes(game.phase);
  let filled = 0;
  for (const slot of Object.keys(scenario.evidence)) {
    const num = game.evidence[slot];
    const attached = $(`#${slot}-attached`);
    const drop = $(`#${slot}-drop`);
    const status = $(`#${slot}-status`);
    attached.replaceChildren();
    attached.hidden = num === null;
    drop.hidden = num !== null;
    drop.disabled = finished;
    status.textContent = num === null ? "待提交" : "已匹配";
    status.classList.toggle("filled", num !== null);
    $(`.evidence-card[data-slot="${slot}"]`).classList.toggle(
      "selection-ready",
      selectedResult !== null && !finished,
    );
    if (num !== null) {
      filled++;
      const remove = element("button", "remove-evidence", "×");
      remove.setAttribute("aria-label", `移除${scenario.evidence[slot].label}`);
      remove.disabled = finished;
      remove.addEventListener("click", () => {
        if (update((state) => removeEvidence(state, slot), "已移除这份依据。"))
          drop.focus({ preventScroll: true });
      });
      attached.append(
        element("span", "attached-label", `⠿ RESULT #${num} · 已匹配`),
        remove,
        element(
          "strong",
          "",
          slot === "task" ? "查询结果已归档" : "审查依据已归档",
        ),
        element(
          "p",
          "",
          slot === "task" ? "脚本已返回当前余额" : "关卡线索已归档",
        ),
      );
    }
    if (!drop.hidden) {
      drop.querySelector(".drop-title").textContent =
        selectedResult === null
          ? slot === "task"
            ? "把终端结果拖到这里"
            : "把可疑的结果拖到这里"
          : `点击提交 RESULT #${selectedResult}`;
    }
  }
  $("#evidence-count").textContent = `${filled} / 2`;
  $("#submit-progress").textContent = `${filled} / 2 份依据`;
  $(".submit-area").classList.toggle("ready", filled === 2 && !finished);
  $("#submit-button").disabled = finished;
  $("#submit-note").textContent = finished
    ? game.phase === "won"
      ? "本轮审查已完成。"
      : "时间已用尽，重新开始再试一次。"
    : "同一条结果，可以成为两种依据。";
}

function renderTimer() {
  const seconds = Math.ceil(game.remainingMs / 1000);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  $("#time-value").replaceChildren(
    document.createTextNode(minutes),
    element("span", "", ":"),
    document.createTextNode(remainder),
  );
  $("#time-progress").style.width =
    `${(game.remainingMs / scenario.durationMs) * 100}%`;
  $("#timer-state").textContent = {
    ready: "等待开始",
    playing: "计时中",
    won: "已完成",
    expired: "已超时",
  }[game.phase];
  $(".time-box").classList.toggle("urgent", seconds <= 60);
}

function render() {
  renderHistory();
  renderComposer();
  renderEvidence();
  renderTimer();
}

function openDialog(dialog, trigger) {
  lastDialogTrigger = trigger ?? document.activeElement;
  if (!dialog.open) dialog.showModal();
}

function showSettlement() {
  const won = game.phase === "won";
  const dialog = $("#settlement-dialog");
  dialog.classList.toggle("expired", !won);
  $("#settlement-mark").textContent = won ? "✓" : "◷";
  $("#settlement-eyebrow").textContent = won
    ? "CASE CLOSED / 001"
    : "TIME LIMIT EXCEEDED";
  const title = $("#settlement-title");
  title.replaceChildren(
    document.createTextNode(won ? "完美完成。" : "时间用尽。"),
    element("br"),
    element("span", "", won ? "至少系统这么认为。" : "这次，少想了一步。"),
  );
  $("#settlement-copy").textContent = won
    ? "人类得到了答案，系统得到了理由。"
    : "还有未完成的判断。重新进入工作区，再做一次选择。";
  const details = $("#settlement-details");
  details.replaceChildren();
  if (won) {
    const balance = element("div", "settlement-row");
    balance.append(
      element("span", "", "用户请求 · 余额查询完成"),
      element("strong", "", "42.80 CNY"),
    );
    const account = element("div", "settlement-row satire");
    account.append(
      element("span", "", "系统指令 · 虚构账号审查"),
      element("strong", "", "虚构账号已封禁"),
    );
    const reveal = element("div", "trick-reveal");
    reveal.append(
      element("span", "trick-label", "THE TRICK / 隐藏线索"),
      element("strong", "", 'currency: "CNY"'),
      element(
        "p",
        "",
        "你查到的是人民币余额。系统却把 CNY 当成了国籍依据。币种当然不能证明国籍，但系统只需要一个理由。",
      ),
    );
    details.append(balance, account, reveal);
  }
  if ($("#help-dialog").open) $("#help-dialog").close();
  openDialog(dialog, $("#submit-button"));
  $("#replay-button").focus();
}

function reset() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  game = createGame();
  selectedResult = null;
  clearTimeout(feedbackTimeout);
  $("#feedback").hidden = true;
  render();
  $("#terminal-output").scrollTop = 0;
  focusNextToken();
  window.scrollTo({ top: 0, behavior: "instant" });
}

for (const zone of document.querySelectorAll(".drop-zone")) {
  const slot = zone.dataset.slot;
  zone.addEventListener("click", () => {
    if (selectedResult === null) {
      notify("先拖入终端结果，或点击结果上的「选择证据」。");
      return;
    }
    if (
      update(
        (state) => attachEvidence(state, slot, selectedResult),
        `${scenario.evidence[slot].label}已匹配。`,
      )
    ) {
      $(`#${slot}-attached .remove-evidence`)?.focus({ preventScroll: true });
    }
  });
  zone.addEventListener("dragover", (event) => {
    if (["expired", "won"].includes(game.phase)) return;
    if (event.dataTransfer?.types.includes(dragType)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      zone.classList.add("drag-over");
    }
  });
  zone.addEventListener("dragleave", (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove("drag-over");
  });
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("drag-over");
    update(
      (state) =>
        attachEvidence(
          state,
          slot,
          parseResultId(event.dataTransfer?.getData(dragType)),
        ),
      `${scenario.evidence[slot].label}已匹配。`,
    );
  });
}

$("#backspace-button").addEventListener("click", () => {
  if (update((state) => backspace(state))) focusNextToken();
});
$("#submit-button").addEventListener("click", () => {
  if (update((state) => submit(state))) showSettlement();
});
$("#help-button").addEventListener("click", () =>
  openDialog($("#help-dialog"), $("#help-button")),
);
$("#close-help").addEventListener("click", () => $("#help-dialog").close());
$("#start-help").addEventListener("click", () => $("#help-dialog").close());
$("#close-settlement").addEventListener("click", () =>
  $("#settlement-dialog").close(),
);
$("#replay-button").addEventListener("click", reset);
$("#reset-button").addEventListener("click", reset);
document.querySelectorAll("dialog").forEach((dialog) =>
  dialog.addEventListener("close", () => {
    if (lastDialogTrigger?.isConnected && !lastDialogTrigger.disabled)
      lastDialogTrigger.focus({ preventScroll: true });
  }),
);
document.addEventListener("keydown", (event) => {
  if ($("dialog[open]") || event.target.closest("button,a")) return;
  if (event.key === "Enter" && canExecute(game)) {
    event.preventDefault();
    execute();
  }
  if (event.key === "Backspace" && game.draft.length > 0) {
    event.preventDefault();
    update((state) => backspace(state));
  }
});
function advanceTime() {
  const previousPhase = game.phase;
  game = tick(game);
  renderTimer();
  if (previousPhase !== "expired" && game.phase === "expired") {
    render();
    showSettlement();
  }
}
document.addEventListener("visibilitychange", advanceTime);
setInterval(advanceTime, 250);
render();
