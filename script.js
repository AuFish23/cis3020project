
//  DEFAULT STATE
const DEFAULT_STATE = {
    fish: 5000,
    portfolio: {},      
    tradeCount: 0,
    profitableTrades: 0,
    simulationCount: 0,
    challengesCompleted: [],
    stockPrices: {}     
};

//  LOAD / SAVE STATE
function loadState() {
    const saved = localStorage.getItem("fishInvestState");
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState(state) {
    localStorage.setItem("fishInvestState", JSON.stringify(state));
}

function resetState() {
    if (confirm("Are you sure you want to reset your game? This will wipe all your data.")) {
        localStorage.removeItem("fishInvestState");
        localStorage.removeItem("fishInvestStocks");
        alert("Game reset! Starting fresh with 5,000 Fish.");
        window.location.href = "index.html";
    }
}

// LOAD / SAVE STOCK PRICES
function saveStockPrices(stocks) {
    localStorage.setItem("fishInvestStocks", JSON.stringify(stocks));
}

function loadStockPrices() {
    const saved = localStorage.getItem("fishInvestStocks");
    return saved ? JSON.parse(saved) : null;
}

// FETCH STOCKS
async function getStocks() {
    let saved = loadStockPrices();
    if (saved) return saved;

    const response = await fetch("stocks.json");
    const stocks = await response.json();
    saveStockPrices(stocks);
    return stocks;
}

// SIMULATE ONE PRICE STEP
function simulatePrice(stock) {
    const volFraction = stock.volatility / 100; 
    const biasFraction = stock.growthBias * 0.005;
    const change = (Math.random() * 2 - 1) * volFraction + biasFraction;
    let newPrice = stock.price * (1 + change);
    newPrice = Math.max(0.01, parseFloat(newPrice.toFixed(2)));
    return { ...stock, price: newPrice };
}

// SIMULATE MARKET
async function simulateMarket() {
    let stocks = await getStocks();
    stocks = stocks.map(simulatePrice);
    saveStockPrices(stocks);
    return stocks;
}

// PORTFOLIO VALUE 
function getPortfolioValue(state, stocks) {
    let total = 0;
    for (const symbol in state.portfolio) {
        const holding = state.portfolio[symbol];
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) total += holding.shares * stock.price;
    }
    return total;
}

// CHALLENGE CHECK
const CHALLENGES = [
    { id: 1, desc: "Invest 500 Fish",           check: (s, inv) => inv >= 500 },
    { id: 2, desc: "Make 3 investments",         check: (s) => s.tradeCount >= 3 },
    { id: 3, desc: "Reach 11,000 total Fish",    check: (s, inv) => s.fish + inv >= 11000 },
    { id: 4, desc: "Simulate market 5 times",    check: (s) => s.simulationCount >= 5 },
    { id: 5, desc: "Invest 2,000 Fish",          check: (s, inv) => inv >= 2000 },
    { id: 6, desc: "Make a profit of 1,000 Fish",check: (s) => getProfit(s) >= 1000 },
    { id: 7, desc: "Reach 15,000 total Fish",    check: (s, inv) => s.fish + inv >= 15000 },
    { id: 8, desc: "Own 10 different stocks",    check: (s) => Object.keys(s.portfolio).length >= 10 },
    { id: 9, desc: "Make 5 profitable trades",   check: (s) => s.profitableTrades >= 5 },
    { id: 10,desc: "Reach 25,000 total Fish",    check: (s, inv) => s.fish + inv >= 25000 }
];

function getTotalInvested(state) {
    let total = 0;
    for (const symbol in state.portfolio) {
        const h = state.portfolio[symbol];
        total += h.shares * h.avgCost;
    }
    return total;
}

function getProfit(state) {
    return state.fish - 5000;
}

function checkChallenges(state, stocks) {
    const inv = getPortfolioValue(state, stocks);
    const newlyCompleted = [];
    for (const ch of CHALLENGES) {
        if (!state.challengesCompleted.includes(ch.id)) {
            if (ch.check(state, inv)) {
                state.challengesCompleted.push(ch.id);
                newlyCompleted.push(ch.id);
            }
        }
    }
    return newlyCompleted;
}

// CHALLENGE REWARDS buying power bonus %
const CHALLENGE_REWARDS = {1:2, 2:3, 3:4, 4:5, 5:6, 6:8, 7:10, 8:12, 9:15, 10:20};


// DASHBOARD
async function initDashboard() {
    const state = loadState();
    const stocks = await getStocks();
    const inv = getPortfolioValue(state, stocks);
    const total = state.fish + inv;
    const profit = total - 5000;
    const pct = ((profit / 5000) * 100).toFixed(1);

    document.getElementById("fish").textContent = state.fish.toFixed(2) + " Fish";
    document.getElementById("investments").textContent = inv.toFixed(2) + " Fish";
    document.getElementById("total").textContent = total.toFixed(2) + " Fish";
    document.getElementById("percent").textContent = (profit >= 0 ? "+" : "") + pct + "%";
    document.getElementById("profit").textContent = (profit >= 0 ? "+" : "") + profit.toFixed(2) + " Fish";
    document.getElementById("challegesCompleted").textContent = state.challengesCompleted.length + "/10";

    // Reset button
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) resetBtn.addEventListener("click", resetState);
}

//  MARKET
async function initMarket() {
    const state = loadState();
    let stocks = await getStocks();

    const container = document.getElementById("stockTable");
    if (!container) return;
    renderMarketTable(stocks, state, container);

    // Simulate button
    const simBtn = document.getElementById("simulateBtn");
    if (simBtn) {
        simBtn.addEventListener("click", async () => {
            state.simulationCount++;
            stocks = await simulateMarket();
            checkChallenges(state, stocks);
            saveState(state);
            renderMarketTable(stocks, state, container);
            simBtn.textContent = "Simulate Market (" + state.simulationCount + " times)";
        });
    }
}

function renderMarketTable(stocks, state, container) {
    container.innerHTML = `
        <table class="stock-table">
            <thead>
                <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Volatility</th>
                    <th>Trend</th>
                    <th>You Own</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${stocks.map(s => {
                    const owned = state.portfolio[s.symbol] ? state.portfolio[s.symbol].shares : 0;
                    const trend = s.growthBias >= 2 ? "📈📈" : s.growthBias === 1 ? "📈" : s.growthBias === -1 ? "📉" : s.growthBias <= -2 ? "📉📉" : "➡️";
                    return `<tr>
                        <td><strong>${s.symbol}</strong></td>
                        <td>${s.name}</td>
                        <td>${s.price.toFixed(2)} 🐟</td>
                        <td>${s.volatility}%</td>
                        <td>${trend}</td>
                        <td>${owned}</td>
                        <td>
                            <button class="btn btn-sm" onclick="buyStock('${s.symbol}')">Buy</button>
                            ${owned > 0 ? `<button class="btn btn-sm btn-sell" onclick="sellStock('${s.symbol}')">Sell</button>` : ""}
                        </td>
                    </tr>`;
                }).join("")}
            </tbody>
        </table>
    `;
}

// BUY 
async function buyStock(symbol) {
    const state = loadState();
    const stocks = await getStocks();
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const sharesStr = prompt(`Buy ${stock.name} (${symbol})\nCurrent price: ${stock.price.toFixed(2)} Fish\nYou have: ${state.fish.toFixed(2)} Fish\n\nHow many shares?`);
    if (!sharesStr) return;
    const shares = parseInt(sharesStr);
    if (isNaN(shares) || shares <= 0) { alert("Invalid number of shares."); return; }

    const cost = shares * stock.price;
    if (cost > state.fish) { alert("Not enough Fish! You need " + cost.toFixed(2) + " Fish."); return; }

    state.fish -= cost;
    if (!state.portfolio[symbol]) {
        state.portfolio[symbol] = { shares: 0, avgCost: 0 };
    }
    const h = state.portfolio[symbol];
    // weighted average cost
    h.avgCost = ((h.avgCost * h.shares) + (stock.price * shares)) / (h.shares + shares);
    h.shares += shares;
    state.tradeCount++;

    const newly = checkChallenges(state, stocks);
    saveState(state);

    alert(`Bought ${shares} share(s) of ${symbol} for ${cost.toFixed(2)} Fish!`);
    if (newly.length > 0) alert("🏆 Challenge(s) completed: " + newly.map(id => "Challenge " + id).join(", "));

    // Re-render
    const container = document.getElementById("stockTable");
    if (container) renderMarketTable(stocks, state, container);
}

//  SELL
async function sellStock(symbol) {
    const state = loadState();
    const stocks = await getStocks();
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;
    const holding = state.portfolio[symbol];
    if (!holding || holding.shares <= 0) { alert("You don't own any shares of " + symbol); return; }

    const sharesStr = prompt(`Sell ${stock.name} (${symbol})\nCurrent price: ${stock.price.toFixed(2)} Fish\nYou own: ${holding.shares} shares\n\nHow many shares to sell?`);
    if (!sharesStr) return;
    const shares = parseInt(sharesStr);
    if (isNaN(shares) || shares <= 0) { alert("Invalid number."); return; }
    if (shares > holding.shares) { alert("You only own " + holding.shares + " shares."); return; }

    const revenue = shares * stock.price;
    const costBasis = shares * holding.avgCost;
    const profit = revenue - costBasis;

    state.fish += revenue;
    holding.shares -= shares;
    if (holding.shares === 0) delete state.portfolio[symbol];

    if (profit > 0) state.profitableTrades++;

    const newly = checkChallenges(state, stocks);
    saveState(state);

    alert(`Sold ${shares} share(s) of ${symbol} for ${revenue.toFixed(2)} Fish!\nProfit/Loss on this trade: ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} Fish`);
    if (newly.length > 0) alert("🏆 Challenge(s) completed: " + newly.map(id => "Challenge " + id).join(", "));

    const container = document.getElementById("stockTable");
    if (container) renderMarketTable(stocks, state, container);
}

//  CHALLENGES
async function initChallenges() {
    const state = loadState();
    const stocks = await getStocks();
    const inv = getPortfolioValue(state, stocks);

    // Update each challenge card status
    CHALLENGES.forEach(ch => {
        const card = document.getElementById("challenge-" + ch.id);
        if (!card) return;
        const btn = card.querySelector(".btn");
        if (!btn) return;

        if (state.challengesCompleted.includes(ch.id)) {
            btn.textContent = "✅ Completed";
            btn.disabled = true;
            btn.style.opacity = "0.6";
            card.style.borderLeft = "4px solid #0f9b6e";
        } else {
            btn.textContent = "Claim";
            btn.onclick = () => claimChallenge(ch.id);
        }
    });
}

async function claimChallenge(id) {
    const state = loadState();
    const stocks = await getStocks();
    const inv = getPortfolioValue(state, stocks);
    const ch = CHALLENGES.find(c => c.id === id);

    if (state.challengesCompleted.includes(id)) {
        alert("Already completed!"); return;
    }
    if (!ch.check(state, inv)) {
        alert("Challenge not yet met!\n" + ch.desc); return;
    }

    const rewardPct = CHALLENGE_REWARDS[id];
    const bonus = state.fish * (rewardPct / 100);
    state.fish += bonus;
    state.challengesCompleted.push(id);
    saveState(state);

    alert(`🏆 Challenge ${id} complete!\nYou earned ${bonus.toFixed(2)} Fish (${rewardPct}% of your buying power)!`);
    initChallenges(); // re-render
}

// AUTO-INIT
document.addEventListener("DOMContentLoaded", () => {
    const title = document.tile.toLowerCase();
  
    if (path.includes("dashboard"))  initDashboard();
    if (path.includes("market"))     initMarket();
    if (path.includes("challenges")) initChallenges();
    // Reset button on dashboard 
});
