import { drivers, teams, tracks } from "./data.js";
import { countInversions, maxInversions, orderToInversionArray } from "./inversions.js";

const state = {
  seed: 2026,
  trackId: tracks[0].id,
  rain: false,
  startOrder: [],
  finishOrder: [],
  inversionResult: null,
  effectiveChaos: 0,
  chaosChecks: 1,
  minimumExpectedInversions: 0,
};

const elements = {
  trackSelect: document.querySelector("#trackSelect"),
  seedInput: document.querySelector("#seedInput"),
  simulateButton: document.querySelector("#simulateButton"),
  qualifyingButton: document.querySelector("#qualifyingButton"),
  resetButton: document.querySelector("#resetButton"),
  startList: document.querySelector("#startList"),
  finishList: document.querySelector("#finishList"),
  inversionCount: document.querySelector("#inversionCount"),
  chaosIndex: document.querySelector("#chaosIndex"),
  weatherState: document.querySelector("#weatherState"),
  chaosBar: document.querySelector("#chaosBar"),
  mergeSteps: document.querySelector("#mergeSteps"),
  summaryText: document.querySelector("#summaryText"),
  influenceList: document.querySelector("#influenceList"),
  trackFlag: document.querySelector("#trackFlag"),
  trackName: document.querySelector("#trackName"),
  rainChance: document.querySelector("#rainChance"),
  favoredTeam: document.querySelector("#favoredTeam"),
  rainBoost: document.querySelector("#rainBoost"),
  eventList: document.querySelector("#eventList"),
  chaosCheckToggle: document.querySelector("#chaosCheckToggle"),
  chaosCheckDetails: document.querySelector("#chaosCheckDetails"),
  mergeToggle: document.querySelector("#mergeToggle"),
  mergeClose: document.querySelector("#mergeClose"),
  mergeDrawer: document.querySelector("#mergeDrawer"),
};

function init() {
  tracks.forEach((track) => {
    const option = document.createElement("option");
    option.value = track.id;
    option.textContent = track.name;
    elements.trackSelect.append(option);
  });

  elements.trackSelect.value = state.trackId;
  elements.trackSelect.addEventListener("change", () => {
    state.trackId = elements.trackSelect.value;
    resetRace(false);
  });

  elements.seedInput.addEventListener("input", () => {
    state.seed = Number(elements.seedInput.value || 1);
  });

  elements.simulateButton.addEventListener("click", simulateRace);
  elements.chaosCheckToggle.addEventListener("click", toggleChaosCheck);
  elements.mergeToggle.addEventListener("click", toggleMergeDrawer);
  elements.mergeClose.addEventListener("click", hideMergeDrawer);
  elements.qualifyingButton.addEventListener("click", () => {
    state.seed = Number(elements.seedInput.value || 1) + 17;
    elements.seedInput.value = state.seed;
    generateQualifying();
    simulateRace();
  });
  elements.resetButton.addEventListener("click", () => resetRace(true));

  resetRace(true);
}

function resetRace(resetSeed) {
  if (resetSeed) {
    state.seed = nextSeed();
    elements.seedInput.value = state.seed;
  }
  generateQualifying();
  state.finishOrder = [...state.startOrder];
  state.rain = false;
  state.effectiveChaos = getTrack().chaosBase;
  state.chaosChecks = 1;
  state.minimumExpectedInversions = 0;
  updateTrackPanel();
  analyzeRace();
  render();
}

function generateQualifying() {
  const track = getTrack();
  const rng = createRng(state.seed + hashString(track.id));

  state.startOrder = [...drivers]
    .map((driver) => ({
      driver,
      score: qualifyingScore(driver, track, rng),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.driver.id);
}

function simulateRace() {
  const track = getTrack();
  const baseSeed = state.seed * 7 + hashString(track.id);
  const weatherRng = createRng(baseSeed);
  state.rain = weatherRng() < track.rainChance;
  state.effectiveChaos = track.chaosBase + (state.rain ? 0.55 : 0);

  const guardedRace = simulateGuardedRace(track, baseSeed);
  state.finishOrder = guardedRace.finishOrder;
  state.inversionResult = guardedRace.inversionResult;
  state.chaosChecks = guardedRace.checks;
  state.minimumExpectedInversions = guardedRace.minimumExpectedInversions;
  render();
}

function simulateGuardedRace(track, baseSeed) {
  const minimumExpectedInversions = minimumInversionsForScenario(track, state.effectiveChaos);
  const attempts = minimumExpectedInversions > 0 ? 8 : 1;
  let bestRace = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const rng = createRng(baseSeed + 9973 * (attempt + 1));
    const finishOrder = buildFinishOrder(track, state.effectiveChaos, rng);
    const inversionArray = orderToInversionArray(state.startOrder, finishOrder);
    const inversionResult = countInversions(inversionArray);
    const candidate = {
      finishOrder,
      inversionResult,
      checks: attempt + 1,
      minimumExpectedInversions,
    };

    if (!bestRace || inversionResult.count > bestRace.inversionResult.count) {
      bestRace = candidate;
    }

    if (inversionResult.count >= minimumExpectedInversions) {
      return candidate;
    }
  }

  return bestRace;
}

function buildFinishOrder(track, chaos, rng) {
  return state.startOrder
    .map((driverId, index) => {
      const driver = getDriver(driverId);
      return {
        driver,
        score: raceScore(driver, track, index, chaos, rng),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.driver.id);
}

function qualifyingScore(driver, track, rng) {
  return driver.basePace + trackAdvantageBonus(driver, track, 230) + (rng() - 0.5) * 7;
}

function raceScore(driver, track, startIndex, chaos, rng) {
  const positionPenalty = startIndex * (state.rain ? 1.05 : 1.8);
  const teamScore = driver.basePace + trackAdvantageBonus(driver, track, 140);
  const rainScore = state.rain
    ? (driver.rainSkill - 80) * 0.75 + (driver.experience - 75) * 0.3
    : 0;
  const rainAttack = state.rain
    ? Math.max(0, startIndex - 2) * ((driver.rainSkill - 80) * 0.45 + (driver.experience - 75) * 0.18)
    : 0;
  const randomChaos = (rng() - 0.5) * 46 * chaos;
  const dryVariation = state.rain ? 0 : (rng() - 0.5) * 8;
  const incidentSwing = state.rain && chaos > 0.95 && rng() < 0.34 ? (rng() - 0.5) * 24 : 0;

  return teamScore + rainScore + rainAttack + randomChaos + dryVariation + incidentSwing - positionPenalty;
}

function trackAdvantageBonus(driver, track, weight) {
  const teamAdvantage = track.teamBias[driver.team] ?? 1;
  return (teamAdvantage - 1) * weight;
}

function analyzeRace() {
  const inversionArray = orderToInversionArray(state.startOrder, state.finishOrder);
  state.inversionResult = countInversions(inversionArray);
}

function render() {
  renderOrder(elements.startList, state.startOrder, false);
  renderOrder(elements.finishList, state.finishOrder, true);
  renderMetrics();
  renderInfluences();
  renderEvents();
  renderSteps();
  updateTrackPanel();
}

function renderOrder(list, order, compareWithStart) {
  list.innerHTML = "";
  const startPosition = new Map(state.startOrder.map((driverId, index) => [driverId, index]));

  order.forEach((driverId, index) => {
    const driver = getDriver(driverId);
    const team = teams[driver.team];
    const previousIndex = startPosition.get(driverId);
    const delta = previousIndex - index;
    const item = document.createElement("li");
    item.className = "driver-card";
    item.style.setProperty("--team-color", team.color);

    const movement = compareWithStart ? formatDelta(delta) : "P" + String(index + 1);
    const movementClass = compareWithStart
      ? delta > 0
        ? "gain"
        : delta < 0
          ? "loss"
          : "same"
      : "same";

    item.innerHTML = `
      <span class="position">${index + 1}</span>
      <span class="helmet">#${driver.number}</span>
      <span class="driver-main">
        <strong>${driver.short}</strong>
        <small>${driver.name}</small>
      </span>
      <span class="team-name">${team.name}</span>
      <span class="movement ${movementClass}">${movement}</span>
    `;
    list.append(item);
  });
}

function renderMetrics() {
  const inversions = state.inversionResult.count;
  const max = maxInversions(drivers.length);
  const chaos = Math.round((inversions / max) * 100);
  const weather = state.rain ? "Chuva" : "Seco";

  elements.inversionCount.textContent = String(inversions);
  elements.chaosIndex.textContent = `${chaos}%`;
  elements.weatherState.textContent = weather;
  elements.weatherState.className = state.rain ? "rain" : "";
  elements.chaosBar.style.width = `${chaos}%`;
  elements.summaryText.textContent =
    `${inversions} inversões em ${max} possíveis. ` +
    `A chegada trocou ${chaos}% dos pares relativos da largada.`;
}

function renderInfluences() {
  const track = getTrack();
  const bestTeam = Object.entries(track.teamBias).sort((a, b) => b[1] - a[1])[0];

  const items = [
    `Características: ${track.characteristics.join("; ")}.`,
    `Vantagem de pista: ${teams[bestTeam[0]].name} (${bestTeam[1].toFixed(2)}x).`,
    `Chuva neste GP: ${Math.round(track.rainChance * 100)}% de chance.`,
  ];

  elements.influenceList.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function renderEvents() {
  const track = getTrack();
  const rainSpecialists = getRainSpecialists();
  const biggestMovers = getBiggestMovers();
  const events = [
    state.rain
      ? `Chuva ativa: ${rainSpecialists.map((driver) => driver.short).join(", ")} receberam forte vantagem.`
      : "Sem chuva: vantagem ficou mais ligada ao carro, à largada e ao ritmo seco.",
    track.note,
    biggestMovers.length
      ? `Maiores mudanças: ${biggestMovers
          .map((entry) => `${entry.driver.short} ${formatDelta(entry.delta)}`)
          .join(", ")}.`
      : "Sem grandes mudanças de posição nesta simulação.",
    `Caos base da pista: ${Math.round(track.chaosBase * 100)}%.`,
  ];

  elements.eventList.innerHTML = events.map((event) => `<li>${event}</li>`).join("");
  renderChaosCheck();
}

function renderChaosCheck() {
  const checkText =
    state.minimumExpectedInversions > 0
      ? "Cenário de alto caos: o simulador reamostra corridas muito estáveis."
      : "Cenário dentro da faixa normal: apenas uma amostra é necessária.";

  elements.chaosCheckToggle.textContent = `Check interno (${state.chaosChecks})`;
  elements.chaosCheckDetails.innerHTML = `
    <p>${checkText}</p>
    <dl>
      <div><dt>Caos efetivo</dt><dd>${Math.round(state.effectiveChaos * 100)}%</dd></div>
      <div><dt>Amostras</dt><dd>${state.chaosChecks}</dd></div>
      <div><dt>Mínimo esperado</dt><dd>${state.minimumExpectedInversions} inversões</dd></div>
      <div><dt>Resultado aceito</dt><dd>${state.inversionResult.count} inversões</dd></div>
    </dl>
  `;
}

function minimumInversionsForScenario(track, effectiveChaos) {
  const max = maxInversions(drivers.length);

  if (!state.rain && effectiveChaos < 0.78) {
    return 0;
  }

  const ratio = state.rain
    ? Math.min(0.46, 0.24 + track.chaosBase * 0.18 + Math.max(0, effectiveChaos - 0.9) * 0.12)
    : Math.min(0.28, Math.max(0, effectiveChaos - 0.68) * 0.36);

  return Math.round(max * ratio);
}

function renderSteps() {
  const steps = state.inversionResult.steps;
  elements.mergeSteps.innerHTML = "";

  steps.forEach((step) => {
    const row = document.createElement("article");
    row.className = "merge-step";
    row.style.setProperty("--depth", step.depth);
    row.innerHTML = `
      <div>
        <span>esq.</span>
        <strong>${formatArray(step.left)}</strong>
      </div>
      <div>
        <span>dir.</span>
        <strong>${formatArray(step.right)}</strong>
      </div>
      <div>
        <span>merge</span>
        <strong>${formatArray(step.merged)}</strong>
      </div>
      <div class="step-count">+${step.splitInversions}</div>
    `;
    elements.mergeSteps.append(row);
  });
}

function updateTrackPanel() {
  const track = getTrack();
  const bestTeam = Object.entries(track.teamBias).sort((a, b) => b[1] - a[1])[0];
  elements.trackFlag.textContent = track.flag;
  elements.trackName.textContent = track.name;
  elements.rainChance.textContent = `Chuva: ${Math.round(track.rainChance * 100)}%`;
  elements.favoredTeam.textContent = `Vantagem: ${teams[bestTeam[0]].name}`;
  elements.rainBoost.textContent = state.rain
    ? "Chuva: experiência e talento no molhado pesam muito"
    : "Seco: carro e largada pesam mais";
}

function toggleMergeDrawer() {
  const shouldShow = elements.mergeDrawer.hidden;
  elements.mergeDrawer.hidden = !shouldShow;
  elements.mergeToggle.setAttribute("aria-expanded", String(shouldShow));
  elements.mergeToggle.textContent = shouldShow ? "Ocultar Merge" : "Merge Count";
}

function hideMergeDrawer() {
  elements.mergeDrawer.hidden = true;
  elements.mergeToggle.setAttribute("aria-expanded", "false");
  elements.mergeToggle.textContent = "Merge Count";
}

function toggleChaosCheck() {
  const shouldShow = elements.chaosCheckDetails.hidden;
  elements.chaosCheckDetails.hidden = !shouldShow;
  elements.chaosCheckToggle.setAttribute("aria-expanded", String(shouldShow));
}

function getRainSpecialists() {
  return [...drivers]
    .sort((a, b) => b.rainSkill + b.experience * 0.25 - (a.rainSkill + a.experience * 0.25))
    .slice(0, 3);
}

function getBiggestMovers() {
  const startPosition = new Map(state.startOrder.map((driverId, index) => [driverId, index]));
  return state.finishOrder
    .map((driverId, index) => {
      const driver = getDriver(driverId);
      return {
        driver,
        delta: startPosition.get(driverId) - index,
      };
    })
    .filter((entry) => entry.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
}

function getTrack() {
  return tracks.find((track) => track.id === state.trackId) ?? tracks[0];
}

function getDriver(driverId) {
  return drivers.find((driver) => driver.id === driverId);
}

function formatDelta(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return String(delta);
  return "0";
}

function formatArray(values) {
  return `[${values.map((value) => value + 1).join(", ")}]`;
}

function createRng(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function hashString(text) {
  return [...text].reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

function nextSeed() {
  const currentSeed = Number(elements.seedInput.value || state.seed || 2026);
  const timePart = Date.now() % 1000000;
  const randomPart = Math.floor(Math.random() * 1000000);
  return ((currentSeed * 31 + timePart + randomPart) % 999999) + 1;
}

init();
