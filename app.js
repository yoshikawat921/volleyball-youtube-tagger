const STORAGE_KEY = "volleyball-youtube-tagger-project-v1";
const DEFAULT_LEGACY_JERSEY = 1;
const LEGACY_DEFAULT_JERSEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const RANGE_MIN = -5;
const RANGE_MAX = 5;

const defaultProject = {
  projectName: "",
  youtubeVideoId: "",
  teams: {
    A: { name: "", jerseyNumbers: [] },
    B: { name: "", jerseyNumbers: [] }
  },
  tags: []
};

const state = {
  project: JSON.parse(JSON.stringify(defaultProject)),
  selectedTeam: "",
  selectedJerseyNumber: null,
  filters: { play: "", team: "", jerseyNumber: "" },
  tableSort: { key: "time", direction: "asc" },
  preRoll: 3,
  postRoll: 3,
  player: null,
  playerReady: false,
  recentlyAddedTagId: "",
  activeReplayTagId: "",
  replay: { active: false, tags: [], index: 0, clipEnd: 0, timer: null }
};

const els = {
  projectNameInput: document.querySelector("#projectNameInput"),
  youtubeInput: document.querySelector("#youtubeInput"),
  teamANameInput: document.querySelector("#teamANameInput"),
  teamBNameInput: document.querySelector("#teamBNameInput"),
  teamAJerseysInput: document.querySelector("#teamAJerseysInput"),
  teamBJerseysInput: document.querySelector("#teamBJerseysInput"),
  loadVideoButton: document.querySelector("#loadVideoButton"),
  exportProjectButton: document.querySelector("#exportProjectButton"),
  resetProjectButton: document.querySelector("#resetProjectButton"),
  importProjectInput: document.querySelector("#importProjectInput"),
  videoIdLabel: document.querySelector("#videoIdLabel"),
  currentTimeLabel: document.querySelector("#currentTimeLabel"),
  saveStatus: document.querySelector("#saveStatus"),
  teamNoneButton: document.querySelector("#teamNoneButton"),
  teamAButton: document.querySelector("#teamAButton"),
  teamBButton: document.querySelector("#teamBButton"),
  jerseyButtons: document.querySelector("#jerseyButtons"),
  tagServeButton: document.querySelector("#tagServeButton"),
  tagSpikeButton: document.querySelector("#tagSpikeButton"),
  playPauseButton: document.querySelector("#playPauseButton"),
  seekBack1Button: document.querySelector("#seekBack1Button"),
  seekForward1Button: document.querySelector("#seekForward1Button"),
  seekBack5Button: document.querySelector("#seekBack5Button"),
  seekForward5Button: document.querySelector("#seekForward5Button"),
  seekBack30Button: document.querySelector("#seekBack30Button"),
  seekForward30Button: document.querySelector("#seekForward30Button"),
  playFilter: document.querySelector("#playFilter"),
  teamFilter: document.querySelector("#teamFilter"),
  jerseyFilter: document.querySelector("#jerseyFilter"),
  replayRangeSlider: document.querySelector("#replayRangeSlider"),
  replayRangeFill: document.querySelector("#replayRangeFill"),
  beforeHandle: document.querySelector("#beforeHandle"),
  afterHandle: document.querySelector("#afterHandle"),
  filteredCountLabel: document.querySelector("#filteredCountLabel"),
  playFilteredButton: document.querySelector("#playFilteredButton"),
  stopReplayButton: document.querySelector("#stopReplayButton"),
  replayStatus: document.querySelector("#replayStatus"),
  totalTagsLabel: document.querySelector("#totalTagsLabel"),
  tagTableScroll: document.querySelector("#tagTableScroll"),
  tagTableBody: document.querySelector("#tagTableBody"),
  resetConfirmDialog: document.querySelector("#resetConfirmDialog"),
  resetCancelButton: document.querySelector("#resetCancelButton")
};

function initializeYouTubePlayer() {
  if (state.player || !window.YT?.Player) return;
  state.player = new YT.Player("player", {
    height: "390",
    width: "640",
    videoId: state.project.youtubeVideoId,
    playerVars: {
      playsinline: 1,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: () => {
        state.playerReady = true;
        if (state.project.youtubeVideoId) {
          state.player.cueVideoById(state.project.youtubeVideoId);
          scheduleVideoTitleSync();
        }
      },
      onStateChange: () => updateVideoTitleFromPlayer()
    }
  });
}

window.onYouTubeIframeAPIReady = initializeYouTubePlayer;
initializeYouTubePlayer();

function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

function normalizeProject(project) {
  if (project.scenes && !project.tags) {
    return normalizeLegacySceneProject(project);
  }

  const normalized = {
    projectName: normalizeProjectName(project.projectName),
    youtubeVideoId: project.youtubeVideoId || "",
    teams: {
      A: {
        name: normalizeTeamName(project.teams?.A?.name, "A"),
        jerseyNumbers: normalizeJerseyNumbers(project.teams?.A?.jerseyNumbers || [])
      },
      B: {
        name: normalizeTeamName(project.teams?.B?.name, "B"),
        jerseyNumbers: normalizeJerseyNumbers(project.teams?.B?.jerseyNumbers || [])
      }
    },
    tags: (project.tags || [])
      .map((tag) => ({ ...tag, play: normalizePlay(tag.play) }))
      .filter((tag) => tag.play)
      .map((tag) => {
        const team = tag.team === "A" || tag.team === "B" ? tag.team : "";
        const play = tag.play;
        const jerseyNumber = normalizeJerseyNumber(tag.jerseyNumber);
        return {
          id: tag.id || createId(),
          youtubeVideoId: tag.youtubeVideoId || project.youtubeVideoId || "",
          time: clamp(Number(tag.time) || 0, 0, Number.MAX_SAFE_INTEGER),
          team,
          play,
          jerseyNumber,
          label: makeLabel(team, play, jerseyNumber)
        };
      })
  };

  if (isLegacyEmptyInitialProject(normalized)) {
    normalized.teams.A.jerseyNumbers = [];
    normalized.teams.B.jerseyNumbers = [];
  }

  return normalized;
}

function isLegacyEmptyInitialProject(project) {
  return !project.projectName
    && !project.youtubeVideoId
    && !project.tags.length
    && !project.teams.A.name
    && !project.teams.B.name
    && sameNumberList(project.teams.A.jerseyNumbers, LEGACY_DEFAULT_JERSEYS)
    && sameNumberList(project.teams.B.jerseyNumbers, LEGACY_DEFAULT_JERSEYS);
}

function sameNumberList(left, right) {
  return left.length === right.length && left.every((number, index) => number === right[index]);
}

function normalizeLegacySceneProject(project) {
  return {
    projectName: normalizeProjectName(project.title || project.projectName),
    youtubeVideoId: project.youtubeVideoId || "",
    teams: {
      A: { name: "", jerseyNumbers: [] },
      B: { name: "", jerseyNumbers: [] }
    },
    tags: (project.scenes || [])
      .map((scene) => {
        const text = [scene.title, scene.notes, ...(scene.tags || [])].join(" ").toLowerCase();
        const play = text.includes("spike") || text.includes("スパイク") || text.includes("attack") || text.includes("アタック") ? "attack" : "serve";
        return {
          id: scene.id || createId(),
          youtubeVideoId: project.youtubeVideoId || "",
          time: clamp(Number(scene.startSeconds) || 0, 0, Number.MAX_SAFE_INTEGER),
          team: "A",
          play,
          jerseyNumber: DEFAULT_LEGACY_JERSEY,
          label: makeLabel("A", play, DEFAULT_LEGACY_JERSEY)
        };
      })
  };
}

function normalizeProjectName(value) {
  const name = String(value || "").trim();
  if (!name || name === "Untitled Volleyball Project" || name === "無題のバレーボールプロジェクト") return "";
  return name;
}

function normalizeTeamName(value, team) {
  const name = String(value || "").trim();
  if (!name || name === `Team ${team}` || name === `チーム${team}`) return "";
  return name;
}

function normalizeJerseyNumbers(value) {
  const list = Array.isArray(value) ? value : parseJerseyNumbers(value);
  return [...new Set(list.map(Number).filter((number) => Number.isInteger(number) && number >= 0))]
    .sort((a, b) => a - b);
}

function normalizePlay(value) {
  const play = String(value || "").trim().toLowerCase();
  if (play === "serve" || play === "サーブ") return "serve";
  if (play === "attack" || play === "spike" || play === "アタック" || play === "スパイク") return "attack";
  return "";
}

function parseJerseyNumbers(value) {
  return String(value)
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry) => Number(entry))
    .filter((number) => Number.isInteger(number) && number >= 0);
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `tag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeLabel(team, play, jerseyNumber) {
  return `${team || "none"}_${play}_${jerseyNumber ?? "none"}`;
}

function normalizeJerseyNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const tenths = Math.floor((safeSeconds % 1) * 10);
  return `${minutes}:${String(wholeSeconds).padStart(2, "0")}.${tenths}`;
}

function parseTime(value) {
  const raw = String(value).trim();
  if (!raw) return 0;
  if (!raw.includes(":")) return Math.max(0, Number(raw) || 0);
  const parts = raw.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function extractYouTubeId(input) {
  const value = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (url.searchParams.get("v")) {
      return url.searchParams.get("v");
    }
    const embedMatch = url.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    return embedMatch ? embedMatch[1] : "";
  } catch {
    const match = value.match(/[a-zA-Z0-9_-]{11}/);
    return match ? match[0] : "";
  }
}

function getCurrentTime() {
  if (!state.playerReady || !state.player?.getCurrentTime) return 0;
  return state.player.getCurrentTime();
}

function seekBy(deltaSeconds) {
  if (!state.playerReady) return;
  const nextTime = Math.max(0, getCurrentTime() + deltaSeconds);
  state.player.seekTo(nextTime, true);
}

function togglePlayPause() {
  if (!state.playerReady) return;
  const playerState = state.player.getPlayerState();
  if (playerState === YT.PlayerState.PLAYING) {
    state.player.pauseVideo();
  } else {
    state.player.playVideo();
  }
}

function applySettingsFromInputs() {
  const videoId = extractYouTubeId(els.youtubeInput.value) || state.project.youtubeVideoId;
  const videoChanged = videoId && videoId !== state.project.youtubeVideoId;
  state.project.youtubeVideoId = videoId;
  state.project.teams.A.name = els.teamANameInput.value.trim();
  state.project.teams.B.name = els.teamBNameInput.value.trim();
  state.project.teams.A.jerseyNumbers = normalizeJerseyNumbers(els.teamAJerseysInput.value);
  state.project.teams.B.jerseyNumbers = normalizeJerseyNumbers(els.teamBJerseysInput.value);
  state.project.tags.forEach((tag) => {
    tag.youtubeVideoId = videoId;
    tag.label = makeLabel(tag.team, tag.play, tag.jerseyNumber);
  });

  if (!state.selectedTeam) {
    state.selectedJerseyNumber = null;
  } else if (!state.project.teams[state.selectedTeam].jerseyNumbers.includes(state.selectedJerseyNumber)) {
    state.selectedJerseyNumber = null;
  }

  if (videoChanged) {
    loadVideo();
    return;
  }

  saveProject();
  render();
}

function loadVideo() {
  const videoId = extractYouTubeId(els.youtubeInput.value) || state.project.youtubeVideoId;
  if (!videoId) {
    setStatus("有効なYouTube URLまたは11文字の動画IDを入力してください。");
    return;
  }
  state.project.youtubeVideoId = videoId;
  state.project.projectName = "動画タイトル取得中";
  state.project.tags.forEach((tag) => {
    tag.youtubeVideoId = videoId;
  });
  if (state.playerReady) {
    state.player.cueVideoById(videoId);
    scheduleVideoTitleSync();
  }
  saveProject();
  render();
}

function scheduleVideoTitleSync() {
  setTimeout(updateVideoTitleFromPlayer, 300);
  setTimeout(updateVideoTitleFromPlayer, 1200);
  setTimeout(updateVideoTitleFromPlayer, 2500);
}

function updateVideoTitleFromPlayer() {
  if (!state.playerReady || !state.player?.getVideoData) return;
  const title = state.player.getVideoData()?.title?.trim();
  if (!title || title === state.project.projectName) return;
  state.project.projectName = title;
  saveProject();
  renderSettings();
}

function addTag(play) {
  if (!state.project.youtubeVideoId) {
    alert("タグを追加する前にYouTube動画を読み込んでください。");
    return;
  }
  const tag = {
    id: createId(),
    youtubeVideoId: state.project.youtubeVideoId,
    time: Number(getCurrentTime().toFixed(2)),
    team: state.selectedTeam,
    play,
    jerseyNumber: state.selectedJerseyNumber,
    label: makeLabel(state.selectedTeam, play, state.selectedJerseyNumber)
  };

  state.project.tags.push(tag);
  state.recentlyAddedTagId = tag.id;
  saveProject();
  render();
}

function sortedTags(tags = state.project.tags) {
  return [...tags].sort((a, b) => a.time - b.time);
}

function sortedTagsForTable() {
  const { key, direction } = state.tableSort;
  const directionMultiplier = direction === "desc" ? -1 : 1;
  return sortedTags().sort((a, b) => {
    const result = compareTagsByKey(a, b, key);
    return result === 0 ? a.time - b.time : result * directionMultiplier;
  });
}

function compareTagsByKey(a, b, key) {
  if (key === "time") return a.time - b.time;
  if (key === "team") return (a.team || "").localeCompare(b.team || "");
  if (key === "play") return playSortValue(a.play).localeCompare(playSortValue(b.play));
  if (key === "jerseyNumber") return compareJerseyNumbers(a.jerseyNumber, b.jerseyNumber);
  return a.time - b.time;
}

function compareJerseyNumbers(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return Number(a) - Number(b);
}

function playSortValue(play) {
  return play === "serve" ? "1-serve" : "2-attack";
}

function filteredTags() {
  return sortedTags().filter((tag) => {
    const playMatch = !state.filters.play || tag.play === state.filters.play;
    const teamMatch = !state.filters.team || tag.team === state.filters.team;
    const jerseyMatch = !state.filters.jerseyNumber || Number(tag.jerseyNumber) === Number(state.filters.jerseyNumber);
    return playMatch && teamMatch && jerseyMatch;
  });
}

function updateTag(id, updates) {
  const tag = state.project.tags.find((item) => item.id === id);
  if (!tag) return;
  Object.assign(tag, updates);
  tag.team = tag.team === "A" || tag.team === "B" ? tag.team : "";
  tag.jerseyNumber = normalizeJerseyNumber(tag.jerseyNumber);
  tag.time = clamp(Number(tag.time) || 0, 0, Number.MAX_SAFE_INTEGER);
  tag.label = makeLabel(tag.team, tag.play, tag.jerseyNumber);
  saveProject();
  render();
}

function deleteTag(id) {
  state.project.tags = state.project.tags.filter((tag) => tag.id !== id);
  saveProject();
  render();
}

function buildJerseyOptions(selectedValue = "") {
  const numbers = new Set();
  Object.values(state.project.teams).forEach((team) => {
    team.jerseyNumbers.forEach((number) => numbers.add(number));
  });

  return ["", ...[...numbers].sort((a, b) => a - b)]
    .map((number) => {
      const label = number === "" ? "すべて" : `#${number}`;
      const selected = String(number) === String(selectedValue) ? " selected" : "";
      return `<option value="${number}"${selected}>${label}</option>`;
    })
    .join("");
}

function renderSettings() {
  els.projectNameInput.value = state.project.projectName;
  els.youtubeInput.value = state.project.youtubeVideoId;
  els.teamANameInput.value = state.project.teams.A.name;
  els.teamBNameInput.value = state.project.teams.B.name;
  els.teamAJerseysInput.value = state.project.teams.A.jerseyNumbers.join(", ");
  els.teamBJerseysInput.value = state.project.teams.B.jerseyNumbers.join(", ");
  els.videoIdLabel.textContent = state.project.youtubeVideoId ? `動画ID: ${state.project.youtubeVideoId}` : "動画未読み込み";
  els.teamAButton.textContent = state.project.teams.A.name ? `A: ${state.project.teams.A.name}` : "A";
  els.teamBButton.textContent = state.project.teams.B.name ? `B: ${state.project.teams.B.name}` : "B";
  els.teamFilter.options[1].textContent = state.project.teams.A.name ? `A: ${state.project.teams.A.name}` : "A";
  els.teamFilter.options[2].textContent = state.project.teams.B.name ? `B: ${state.project.teams.B.name}` : "B";
}

function renderTeamAndJerseys() {
  els.teamNoneButton.classList.toggle("active", !state.selectedTeam);
  els.teamAButton.classList.toggle("active", state.selectedTeam === "A");
  els.teamBButton.classList.toggle("active", state.selectedTeam === "B");
  els.jerseyButtons.innerHTML = "";

  const noneButton = document.createElement("button");
  noneButton.type = "button";
  noneButton.textContent = "未選択";
  noneButton.className = "unset-button";
  noneButton.classList.toggle("active", state.selectedJerseyNumber === null);
  noneButton.addEventListener("click", () => {
    state.selectedJerseyNumber = null;
    renderTeamAndJerseys();
  });
  els.jerseyButtons.append(noneButton);

  if (!state.selectedTeam) {
    state.selectedJerseyNumber = null;
    noneButton.classList.add("active");
    return;
  }

  const jerseys = state.project.teams[state.selectedTeam].jerseyNumbers;
  if (!jerseys.includes(state.selectedJerseyNumber)) {
    state.selectedJerseyNumber = null;
    noneButton.classList.add("active");
  }

  if (!jerseys.length) {
    return;
  }

  jerseys.forEach((number) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = number;
    button.classList.toggle("active", number === state.selectedJerseyNumber);
    button.addEventListener("click", () => {
      state.selectedJerseyNumber = number;
      renderTeamAndJerseys();
    });
    els.jerseyButtons.append(button);
  });
}

function renderReplayWindow() {
  const beforeValue = -state.preRoll;
  const afterValue = state.postRoll;
  const beforePosition = rangePercent(beforeValue);
  const afterPosition = rangePercent(afterValue);

  els.replayRangeFill.style.left = `${beforePosition}%`;
  els.replayRangeFill.style.width = `${afterPosition - beforePosition}%`;
  updateRangeHandle(els.beforeHandle, beforeValue, beforePosition);
  updateRangeHandle(els.afterHandle, afterValue, afterPosition);
}

function updateRangeHandle(handle, value, position) {
  handle.style.left = `${position}%`;
  handle.textContent = `${value > 0 ? "+" : ""}${value}s`;
  handle.classList.toggle("is-zero", value === 0);
}

function rangePercent(value) {
  return ((value - RANGE_MIN) / (RANGE_MAX - RANGE_MIN)) * 100;
}

function valueFromPointer(event) {
  const rect = els.replayRangeSlider.getBoundingClientRect();
  const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  return Math.round(RANGE_MIN + ratio * (RANGE_MAX - RANGE_MIN));
}

function setReplayRangeValue(handleType, value) {
  const safeValue = clamp(value, handleType === "before" ? RANGE_MIN : 0, handleType === "before" ? 0 : RANGE_MAX);
  if (handleType === "before") {
    state.preRoll = Math.abs(safeValue);
  } else {
    state.postRoll = safeValue;
  }
  renderReplayWindow();
}

function startRangeDrag(handleType, event) {
  event.preventDefault();
  event.stopPropagation();
  const pointerId = event.pointerId;
  event.currentTarget.setPointerCapture(pointerId);
  setReplayRangeValue(handleType, valueFromPointer(event));

  const move = (moveEvent) => setReplayRangeValue(handleType, valueFromPointer(moveEvent));
  const stop = () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", stop);
    document.removeEventListener("pointercancel", stop);
  };

  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", stop);
  document.addEventListener("pointercancel", stop);
}

function setNearestRangeHandle(event) {
  const value = valueFromPointer(event);
  setReplayRangeValue(value <= 0 ? "before" : "after", value);
}

function nudgeRangeHandle(handleType, direction) {
  const currentValue = handleType === "before" ? -state.preRoll : state.postRoll;
  setReplayRangeValue(handleType, currentValue + direction);
}

function handleRangeKeydown(handleType, event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  nudgeRangeHandle(handleType, event.key === "ArrowRight" ? 1 : -1);
}

function renderFilters() {
  els.playFilter.value = state.filters.play;
  els.teamFilter.value = state.filters.team;
  els.jerseyFilter.innerHTML = buildJerseyOptions(state.filters.jerseyNumber);
  els.filteredCountLabel.textContent = String(filteredTags().length);
  els.totalTagsLabel.textContent = String(state.project.tags.length);
}

function renderTagTable() {
  const tags = sortedTagsForTable();
  els.tagTableBody.innerHTML = "";
  updateSortButtons();

  if (!tags.length) {
    return;
  }

  tags.forEach((tag) => {
    const row = document.createElement("tr");
    row.dataset.tagId = tag.id;
    row.classList.toggle("active-replay-row", tag.id === state.activeReplayTagId);
    row.classList.toggle("recently-added-row", tag.id === state.recentlyAddedTagId);
    row.innerHTML = `
      <td><input class="time-input" value="${formatTime(tag.time)}" aria-label="タグ時刻"></td>
      <td>
        <select class="team-input" aria-label="タグのチーム">
          <option value=""${tag.team === "" ? " selected" : ""}>未選択</option>
          <option value="A"${tag.team === "A" ? " selected" : ""}>A</option>
          <option value="B"${tag.team === "B" ? " selected" : ""}>B</option>
        </select>
      </td>
      <td>
        <select class="play-input" aria-label="プレー種別">
          <option value="serve"${tag.play === "serve" ? " selected" : ""}>サーブ</option>
          <option value="attack"${tag.play === "attack" ? " selected" : ""}>アタック</option>
        </select>
      </td>
      <td><input class="jersey-input" type="number" min="0" step="1" value="${tag.jerseyNumber ?? ""}" placeholder="未選択" aria-label="背番号"></td>
      <td>
        <div class="action-buttons">
          <button type="button" data-action="seek" class="table-play-button">再生</button>
          <button type="button" data-action="delete" class="table-delete-button">削除</button>
        </div>
      </td>
    `;

    row.querySelector(".time-input").addEventListener("change", (event) => {
      updateTag(tag.id, { time: Number(parseTime(event.target.value).toFixed(2)) });
    });
    row.querySelector(".team-input").addEventListener("change", (event) => {
      updateTag(tag.id, { team: event.target.value });
    });
    row.querySelector(".play-input").addEventListener("change", (event) => {
      updateTag(tag.id, { play: event.target.value });
    });
    row.querySelector(".jersey-input").addEventListener("change", (event) => {
      updateTag(tag.id, { jerseyNumber: event.target.value });
    });
    row.querySelector('[data-action="seek"]').addEventListener("click", () => {
      playClip(tag);
    });
    row.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (confirm(`${formatTime(tag.time)} の ${tag.label} を削除しますか？`)) deleteTag(tag.id);
    });

    els.tagTableBody.append(row);
  });

}

function focusTagRow(tagId, scroll = true) {
  state.activeReplayTagId = tagId || "";
  els.tagTableBody.querySelectorAll(".active-replay-row").forEach((row) => {
    row.classList.remove("active-replay-row");
  });
  if (!tagId) return;

  const row = els.tagTableBody.querySelector(`[data-tag-id="${CSS.escape(tagId)}"]`);
  if (!row) return;
  row.classList.add("active-replay-row");
  if (!scroll) return;

  const targetTop = row.offsetTop - (els.tagTableScroll.clientHeight / 2) + (row.offsetHeight / 2);
  els.tagTableScroll.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

function updateSortButtons() {
  document.querySelectorAll(".sort-button").forEach((button) => {
    const isActive = button.dataset.sortKey === state.tableSort.key;
    const baseLabel = button.dataset.label || button.textContent.replace(/[▲▼]\s*$/, "");
    button.dataset.label = baseLabel;
    button.classList.toggle("active", isActive);
    button.textContent = isActive
      ? `${baseLabel} ${state.tableSort.direction === "asc" ? "▲" : "▼"}`
      : baseLabel;
  });
}

function setTableSort(key) {
  if (state.tableSort.key === key) {
    state.tableSort.direction = state.tableSort.direction === "asc" ? "desc" : "asc";
  } else {
    state.tableSort.key = key;
    state.tableSort.direction = "asc";
  }
  renderTagTable();
}

function render() {
  renderSettings();
  renderTeamAndJerseys();
  renderReplayWindow();
  renderFilters();
  renderTagTable();
}

function cueCurrentVideo() {
  if (state.playerReady && state.project.youtubeVideoId) {
    state.player.cueVideoById(state.project.youtubeVideoId);
  }
}

function playClip(tag, continueSequence = false) {
  if (!state.playerReady) return;
  if (tag.youtubeVideoId && tag.youtubeVideoId !== state.project.youtubeVideoId) {
    state.project.youtubeVideoId = tag.youtubeVideoId;
    state.player.cueVideoById(tag.youtubeVideoId);
  }
  const start = Math.max(0, tag.time - state.preRoll);
  const end = tag.time + state.postRoll;
  state.replay.clipEnd = end;
  state.player.seekTo(start, true);
  state.player.playVideo();
  if (!continueSequence) {
    state.replay.active = false;
    clearReplayTimer();
  }
}

function playFilteredClips() {
  const tags = filteredTags();
  if (!tags.length) {
    setReplayStatus("再生できる絞り込みタグがありません。");
    return;
  }
  state.replay.active = true;
  state.replay.tags = tags;
  state.replay.index = 0;
  setReplayStatus(`再生中 1 / ${tags.length}: ${tags[0].label}`);
  focusTagRow(tags[0].id);
  playClip(tags[0], true);
  clearReplayTimer();
  state.replay.timer = setInterval(checkReplayProgress, 120);
}

function checkReplayProgress() {
  if (!state.replay.active || !state.playerReady) return;
  if (getCurrentTime() < state.replay.clipEnd) return;

  state.replay.index += 1;
  if (state.replay.index >= state.replay.tags.length) {
    stopReplay("連続再生が完了しました。");
    return;
  }

  const tag = state.replay.tags[state.replay.index];
  setReplayStatus(`再生中 ${state.replay.index + 1} / ${state.replay.tags.length}: ${tag.label}`);
  focusTagRow(tag.id);
  playClip(tag, true);
}

function stopReplay(message = "再生停止中") {
  state.replay.active = false;
  clearReplayTimer();
  if (state.playerReady) state.player.pauseVideo();
  focusTagRow("", false);
  setReplayStatus(message);
}

function clearReplayTimer() {
  if (state.replay.timer) {
    clearInterval(state.replay.timer);
    state.replay.timer = null;
  }
}

function setReplayStatus(message) {
  els.replayStatus.textContent = message;
}

function setStatus(message) {
  els.saveStatus.textContent = message;
}

function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
  setStatus("ローカルに保存済み");
}

async function resetProject() {
  const confirmed = await confirmProjectReset();
  if (!confirmed) return;

  stopReplay("再生停止中");
  localStorage.removeItem(STORAGE_KEY);
  state.project = JSON.parse(JSON.stringify(defaultProject));
  state.selectedTeam = "";
  state.selectedJerseyNumber = null;
  state.filters = { play: "", team: "", jerseyNumber: "" };
  state.recentlyAddedTagId = "";
  els.playFilter.value = "";
  els.teamFilter.value = "";
  els.jerseyFilter.value = "";
  if (state.playerReady) {
    state.player.stopVideo();
  }
  render();
  setStatus("初期化しました");
}

function confirmProjectReset() {
  if (!els.resetConfirmDialog || typeof els.resetConfirmDialog.showModal !== "function") {
    return Promise.resolve(confirm("現在の入力内容とローカル保存データを初期化します。JSON書き出ししていないタグは失われます。初期化しますか？"));
  }

  return new Promise((resolve) => {
    els.resetConfirmDialog.addEventListener("close", () => {
      resolve(els.resetConfirmDialog.returnValue === "reset");
    }, { once: true });
    els.resetConfirmDialog.returnValue = "cancel";
    els.resetConfirmDialog.showModal();
    requestAnimationFrame(() => els.resetCancelButton?.focus());
  });
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    state.project = normalizeProject(JSON.parse(saved));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportProject() {
  const filename = `${safeFilename(state.project.projectName || "volleyball-project")}_${formatExportTimestamp(new Date())}.json`;
  downloadFile(filename, JSON.stringify(state.project, null, 2), "application/json");
}

function formatExportTimestamp(date) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ];
  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function safeFilename(value) {
  const filename = String(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return filename || "volleyball-project";
}

async function importProject(file) {
  if (!file) return;
  const text = await file.text();
  state.project = normalizeProject(JSON.parse(text));
  state.filters = { play: "", team: "", jerseyNumber: "" };
  state.selectedTeam = "";
  state.selectedJerseyNumber = null;
  stopReplay("再生停止中");
  cueCurrentVideo();
  scheduleVideoTitleSync();
  saveProject();
  render();
  setStatus(`${state.project.projectName} を読み込みました。タグ ${state.project.tags.length} 件`);
}

function bindEvents() {
  els.loadVideoButton.addEventListener("click", loadVideo);
  els.exportProjectButton.addEventListener("click", exportProject);
  els.resetProjectButton.addEventListener("click", resetProject);
  els.importProjectInput.addEventListener("change", (event) => {
    importProject(event.target.files[0]).catch(() => alert("このJSONファイルを読み込めませんでした。"));
    event.target.value = "";
  });

  [els.teamANameInput, els.teamBNameInput, els.teamAJerseysInput, els.teamBJerseysInput].forEach((input) => {
    input.addEventListener("change", applySettingsFromInputs);
  });

  els.teamAButton.addEventListener("click", () => selectTeam("A"));
  els.teamBButton.addEventListener("click", () => selectTeam("B"));
  els.teamNoneButton.addEventListener("click", () => selectTeam(""));
  els.tagServeButton.addEventListener("click", () => addTag("serve"));
  els.tagSpikeButton.addEventListener("click", () => addTag("attack"));
  els.beforeHandle.addEventListener("pointerdown", (event) => startRangeDrag("before", event));
  els.afterHandle.addEventListener("pointerdown", (event) => startRangeDrag("after", event));
  els.beforeHandle.addEventListener("click", (event) => event.stopPropagation());
  els.afterHandle.addEventListener("click", (event) => event.stopPropagation());
  els.beforeHandle.addEventListener("keydown", (event) => handleRangeKeydown("before", event));
  els.afterHandle.addEventListener("keydown", (event) => handleRangeKeydown("after", event));
  els.replayRangeSlider.addEventListener("click", setNearestRangeHandle);
  document.querySelectorAll(".sort-button").forEach((button) => {
    button.addEventListener("click", () => setTableSort(button.dataset.sortKey));
  });

  els.playPauseButton.addEventListener("click", togglePlayPause);
  els.seekBack1Button.addEventListener("click", () => seekBy(-1));
  els.seekForward1Button.addEventListener("click", () => seekBy(1));
  els.seekBack5Button.addEventListener("click", () => seekBy(-5));
  els.seekForward5Button.addEventListener("click", () => seekBy(5));
  els.seekBack30Button.addEventListener("click", () => seekBy(-30));
  els.seekForward30Button.addEventListener("click", () => seekBy(30));

  els.playFilter.addEventListener("change", (event) => {
    state.filters.play = event.target.value;
    renderFilters();
  });
  els.teamFilter.addEventListener("change", (event) => {
    state.filters.team = event.target.value;
    renderFilters();
  });
  els.jerseyFilter.addEventListener("change", (event) => {
    state.filters.jerseyNumber = event.target.value;
    renderFilters();
  });

  els.playFilteredButton.addEventListener("click", playFilteredClips);
  els.stopReplayButton.addEventListener("click", () => stopReplay());
  document.addEventListener("keydown", handleKeyboardShortcuts);
}

function selectTeam(team) {
  state.selectedTeam = team;
  state.selectedJerseyNumber = null;
  renderTeamAndJerseys();
}

function handleKeyboardShortcuts(event) {
  const target = event.target;
  const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  if (isTyping) return;

  if (event.code === "Space") {
    event.preventDefault();
    togglePlayPause();
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    seekBy(event.shiftKey ? -5 : -1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    seekBy(event.shiftKey ? 5 : 1);
  }
}

function tickCurrentTime() {
  els.currentTimeLabel.textContent = formatTime(getCurrentTime());
  requestAnimationFrame(tickCurrentTime);
}

loadFromLocalStorage();
state.selectedJerseyNumber = null;
bindEvents();
render();
tickCurrentTime();
