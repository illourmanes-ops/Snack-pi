// hub.js — RetroPi Games Hub (Boutique / Missions / Talents / Classement)

// ---------- DONNÉES DE BASE ----------
function getCoins() { return parseInt(localStorage.getItem("retropi_coins") || "0"); }
function setCoins(v) { localStorage.setItem("retropi_coins", v); }
function getGems() { return parseInt(localStorage.getItem("retropi_gems") || "0"); }
function setGems(v) { localStorage.setItem("retropi_gems", v); }

function getStats() {
  return JSON.parse(localStorage.getItem("retropi_stats") || '{"foodEaten":0,"kills":0,"gamesPlayed":0,"bestLength":0}');
}
function setStats(s) { localStorage.setItem("retropi_stats", JSON.stringify(s)); }

function updateCurrencyDisplay() {
  document.getElementById("hubCoins").textContent = getCoins();
  document.getElementById("hubGems").textContent = getGems();
}

// ---------- SKINS ----------
const SKINS = [
  { id: "teal", name: "Teal classique", rarity: "commun", color: "#2dd4bf", priceCoins: 0 },
  { id: "rose", name: "Rose vif", rarity: "commun", color: "#ff2e63", priceCoins: 500 },
  { id: "or", name: "Doré", rarity: "commun", color: "#fbbf24", priceCoins: 800 },
  { id: "violet", name: "Violet", rarity: "rare", color: "#a78bfa", priceGems: 5 },
  { id: "vert", name: "Vert toxique", rarity: "rare", color: "#34d399", priceGems: 5 },
  { id: "bleu", name: "Bleu glacier", rarity: "rare", color: "#60a5fa", priceGems: 8 },
  { id: "arcenciel", name: "Arc-en-ciel", rarity: "epique", color: "gradient", priceGems: 20 },
  { id: "feu", name: "Flamme", rarity: "epique", color: "#f97316", priceGems: 25 },
  { id: "legende", name: "Légende dorée", rarity: "legende", color: "#fde047", priceGems: 50 }
];

function getOwnedSkins() {
  const owned = JSON.parse(localStorage.getItem("retropi_owned_skins") || '["teal"]');
  return owned;
}
function setOwnedSkins(arr) { localStorage.setItem("retropi_owned_skins", JSON.stringify(arr)); }
function getEquippedSkin() { return localStorage.getItem("retropi_skin") || "teal"; }
function setEquippedSkin(id) { localStorage.setItem("retropi_skin", id); }

let currentRarity = "commun";

function renderSkinGrid() {
  const grid = document.getElementById("skinGrid");
  grid.innerHTML = "";
  const owned = getOwnedSkins();
  const equipped = getEquippedSkin();

  SKINS.filter(s => s.rarity === currentRarity).forEach(skin => {
    const isOwned = owned.includes(skin.id);
    const isEquipped = equipped === skin.id;

    const card = document.createElement("div");
    card.className = "skin-card" + (isOwned ? " owned" : "") + (isEquipped ? " equipped" : "");

    const priceText = skin.priceCoins
      ? "🪙 " + skin.priceCoins
      : skin.priceGems
        ? "💎 " + skin.priceGems
        : "Gratuit";

    let btnHtml;
    if (isEquipped) {
      btnHtml = `<button class="btn-equipped" disabled>Équipé</button>`;
    } else if (isOwned) {
      btnHtml = `<button class="btn-equip" data-action="equip" data-id="${skin.id}">Équiper</button>`;
    } else {
      btnHtml = `<button class="btn-buy" data-action="buy" data-id="${skin.id}">Acheter</button>`;
    }

    card.innerHTML = `
      <div class="skin-preview"><div class="dot" style="background:${skin.color === 'gradient' ? 'linear-gradient(90deg,#ff2e63,#fbbf24,#2dd4bf)' : skin.color}"></div></div>
      <div class="skin-name">${skin.name}</div>
      <div class="skin-price">${isOwned ? "" : priceText}</div>
      ${btnHtml}
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const skin = SKINS.find(s => s.id === id);
      if (btn.dataset.action === "buy") {
        buySkin(skin);
      } else if (btn.dataset.action === "equip") {
        setEquippedSkin(id);
        renderSkinGrid();
      }
    });
  });
}

function buySkin(skin) {
  const owned = getOwnedSkins();
  if (skin.priceCoins !== undefined && skin.priceCoins > 0) {
    if (getCoins() < skin.priceCoins) { alert("Pas assez de pièces 🪙"); return; }
    setCoins(getCoins() - skin.priceCoins);
  } else if (skin.priceGems) {
    if (getGems() < skin.priceGems) { alert("Pas assez de gemmes 💎 — regarde une pub pour en gagner !"); return; }
    setGems(getGems() - skin.priceGems);
  }
  owned.push(skin.id);
  setOwnedSkins(owned);
  setEquippedSkin(skin.id);
  updateCurrencyDisplay();
  renderSkinGrid();
}

document.querySelectorAll(".rarity-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".rarity-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentRarity = btn.dataset.rarity;
    renderSkinGrid();
  });
});

// ---------- MISSIONS ----------
const MISSIONS = [
  { id: "eat50", label: "Mange 50 nourritures", target: 50, statKey: "foodEaten", reward: { coins: 300 } },
  { id: "eat200", label: "Mange 200 nourritures", target: 200, statKey: "foodEaten", reward: { coins: 800 } },
  { id: "kill5", label: "Mange 5 serpents plus petits", target: 5, statKey: "kills", reward: { coins: 500 } },
  { id: "kill20", label: "Mange 20 serpents plus petits", target: 20, statKey: "kills", reward: { gems: 5 } },
  { id: "games10", label: "Joue 10 parties", target: 10, statKey: "gamesPlayed", reward: { coins: 400 } }
];

function getClaimedMissions() {
  return JSON.parse(localStorage.getItem("retropi_claimed_missions") || "[]");
}
function setClaimedMissions(arr) { localStorage.setItem("retropi_claimed_missions", JSON.stringify(arr)); }

function renderMissions() {
  const list = document.getElementById("missionList");
  list.innerHTML = "";
  const stats = getStats();
  const claimed = getClaimedMissions();

  MISSIONS.forEach(m => {
    const progress = Math.min(stats[m.statKey] || 0, m.target);
    const done = progress >= m.target;
    const isClaimed = claimed.includes(m.id);
    const pct = Math.floor((progress / m.target) * 100);

    const rewardText = m.reward.coins ? "🪙 " + m.reward.coins : "💎 " + m.reward.gems;

    const card = document.createElement("div");
    card.className = "mission-card" + (done ? " done" : "");
    card.innerHTML = `
      <div class="mission-top">
        <span>${m.label}</span>
        <span>${progress}/${m.target}</span>
      </div>
      <div class="mission-bar-bg"><div class="mission-bar-fill" style="width:${pct}%"></div></div>
      <button data-id="${m.id}" ${(!done || isClaimed) ? "disabled" : ""}>
        ${isClaimed ? "Récupéré ✓" : "Réclamer " + rewardText}
      </button>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const m = MISSIONS.find(mi => mi.id === btn.dataset.id);
      const claimed = getClaimedMissions();
      if (claimed.includes(m.id)) return;
      if (m.reward.coins) setCoins(getCoins() + m.reward.coins);
      if (m.reward.gems) setGems(getGems() + m.reward.gems);
      claimed.push(m.id);
      setClaimedMissions(claimed);
      updateCurrencyDisplay();
      renderMissions();
    });
  });
}

// ---------- RÉCOMPENSE QUOTIDIENNE ----------
const DAILY_REWARDS = [200, 300, 400, 500, 600, 800, 1200]; // jour 1 à 7

function getDailyData() {
  return JSON.parse(localStorage.getItem("retropi_daily") || '{"day":0,"lastClaim":null}');
}
function setDailyData(d) { localStorage.setItem("retropi_daily", JSON.stringify(d)); }

function renderDaily() {
  const data = getDailyData();
  const today = new Date().toDateString();
  const canClaim = data.lastClaim !== today;

  document.getElementById("dailyDay").textContent = (data.day % 7) + 1;
  document.getElementById("dailyStatus").textContent = canClaim
    ? "Jour " + ((data.day % 7) + 1) + " — récompense disponible !"
    : "Déjà réclamé aujourd'hui, reviens demain !";

  const btn = document.getElementById("dailyClaimBtn");
  btn.disabled = !canClaim;
  btn.textContent = canClaim ? "Réclamer 🪙 " + DAILY_REWARDS[data.day % 7] : "Revenu demain";
}

document.getElementById("dailyClaimBtn").addEventListener("click", () => {
  const data = getDailyData();
  const today = new Date().toDateString();
  if (data.lastClaim === today) return;

  const reward = DAILY_REWARDS[data.day % 7];
  setCoins(getCoins() + reward);
  data.day += 1;
  data.lastClaim = today;
  setDailyData(data);
  updateCurrencyDisplay();
  renderDaily();
});

// ---------- TALENTS ----------
const TALENTS = [
  { id: "speed", name: "⚡ Vitesse", desc: "+5% de vitesse de déplacement", maxLevel: 5, baseCost: 600 },
  { id: "startsize", name: "📏 Taille de départ", desc: "+1 segment au départ", maxLevel: 5, baseCost: 500 },
  { id: "coinboost", name: "🪙 Bonus de pièces", desc: "+10% de pièces gagnées", maxLevel: 5, baseCost: 700 }
];

function getTalentLevels() {
  return JSON.parse(localStorage.getItem("retropi_talents") || "{}");
}
function setTalentLevels(t) { localStorage.setItem("retropi_talents", JSON.stringify(t)); }

function renderTalents() {
  const list = document.getElementById("talentList");
  list.innerHTML = "";
  const levels = getTalentLevels();

  TALENTS.forEach(t => {
    const lvl = levels[t.id] || 0;
    const maxed = lvl >= t.maxLevel;
    const cost = t.baseCost * (lvl + 1);

    const card = document.createElement("div");
    card.className = "talent-card";
    card.innerHTML = `
      <div class="talent-info">
        <div class="t-name">${t.name} — Niv. ${lvl}/${t.maxLevel}</div>
        <div class="t-level">${t.desc}</div>
      </div>
      <button data-id="${t.id}" ${maxed ? "disabled" : ""}>
        ${maxed ? "Max" : "🪙 " + cost}
      </button>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = TALENTS.find(ti => ti.id === btn.dataset.id);
      const levels = getTalentLevels();
      const lvl = levels[t.id] || 0;
      if (lvl >= t.maxLevel) return;
      const cost = t.baseCost * (lvl + 1);
      if (getCoins() < cost) { alert("Pas assez de pièces 🪙"); return; }
      setCoins(getCoins() - cost);
      levels[t.id] = lvl + 1;
      setTalentLevels(levels);
      updateCurrencyDisplay();
      renderTalents();
    });
  });
}

// ---------- CLASSEMENT (local) ----------
function renderLeaderboard() {
  const list = document.getElementById("leaderboardList");
  list.innerHTML = "";
  const stats = getStats();
  const name = localStorage.getItem("retropi_name") || "Toi";

  // classement simulé avec quelques scores fictifs autour du score du joueur
  const fakeNames = ["RedSkull", "Martiny", "ShadowFox", "NeonViper", "PixelKing"];
  const fakeScores = fakeNames.map(() => Math.floor(stats.bestLength * (0.7 + Math.random() * 0.6)) + 10);

  const rows = fakeNames.map((n, i) => ({ name: n, score: fakeScores[i] }));
  rows.push({ name: name, score: stats.bestLength, me: true });
  rows.sort((a, b) => b.score - a.score);

  rows.forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "lb-row" + (r.me ? " me" : "");
    row.innerHTML = `
      <span class="lb-rank">#${i + 1}</span>
      <span class="lb-name">${r.name}${r.me ? " (toi)" : ""}</span>
      <span class="lb-score">${r.score}</span>
    `;
    list.appendChild(row);
  });
}

// ---------- NAVIGATION ENTRE ONGLETS ----------
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ---------- INIT ----------
updateCurrencyDisplay();
renderSkinGrid();
renderMissions();
renderDaily();
renderTalents();
renderLeaderboard();
