
//  DEFAULT STATE
var DEFAULT_STATE = {
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
    var saved = localStorage.getItem("fishInvestState");
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

// STOCK PRICES
function saveStockPrices(stocks) {
    localStorage.setItem("fishInvestStocks", JSON.stringify(stocks));
}

function loadStockPrices() {
    var saved = localStorage.getItem("fishInvestStocks");
    return saved ? JSON.parse(saved) : null;
}

// FETCH STOCKS
async function getStocks() {
    var saved = loadStockPrices();
    if (saved) return saved;

    var response = await fetch("stocks.json");
    var stocks = await response.json();
    saveStockPrices(stocks);
    return stocks;
}

// SIMULATE ONE PRICE STEP
function simulatePrice(stock) {
    var volFraction = stock.volatility / 100; 
    var biasFraction = stock.growthBias * 0.005;
    var change = (Math.random() * 2 - 1) * volFraction + biasFraction;
    var newPrice = stock.price * (1 + change);
    newPrice = Math.max(0.01, parseFloat(newPrice.toFixed(2)));
    return { symbol: stock.symbol, name: stock.name, price: newPrice, volatility: stock.volatility, growthBias: stock.growthBias };
}

// SIMULATE MARKET
async function simulateMarket() {
    var stocks = await getStocks();
    var updated = stocks.map(simulatePrice);
    saveStockPrices(updated);
    return updated;
}

// PORTFOLIO VALUE 
function getPortfolioValue(state, stocks) {
    var total = 0;
    for (var symbol in state.portfolio) {
        var holding = state.portfolio[symbol];
        for (var i = 0; i < stocks.length; i++) {
            if (stocks[i].symbol === symbol) {
                total += holding.shares * stocks[i].price;
                break;
            }
        }
    }
    return total;
}

// CHALLENGE CHECK
var CHALLENGE_LIST = [
    { id: 1,  desc: "Invest 500 Fish",            reward: 2,  check: function(s, inv) { return inv >= 500; } },
    { id: 2,  desc: "Make 3 investments",          reward: 3,  check: function(s, inv) { return s.tradeCount >= 3; } },
    { id: 3,  desc: "Reach 11,000 total Fish",     reward: 4,  check: function(s, inv) { return s.fish + inv >= 11000; } },
    { id: 4,  desc: "Simulate market 5 times",     reward: 5,  check: function(s, inv) { return s.simulationCount >= 5; } },
    { id: 5,  desc: "Invest 2,000 Fish",           reward: 6,  check: function(s, inv) { return inv >= 2000; } },
    { id: 6,  desc: "Make a profit of 1,000 Fish", reward: 8,  check: function(s, inv) { return (s.fish + inv) - 5000 >= 1000; } },
    { id: 7,  desc: "Reach 15,000 total Fish",     reward: 10, check: function(s, inv) { return s.fish + inv >= 15000; } },
    { id: 8,  desc: "Own 10 different stocks",     reward: 12, check: function(s, inv) { return Object.keys(s.portfolio).length >= 10; } },
    { id: 9,  desc: "Make 5 profitable trades",    reward: 15, check: function(s, inv) { return s.profitableTrades >= 5; } },
    { id: 10, desc: "Reach 25,000 total Fish",     reward: 20, check: function(s, inv) { return s.fish + inv >= 25000; } }
];



// DASHBOARD
async function initDashboard() {
    var state = loadState();
    var stocks = await getStocks();
    var inv = getPortfolioValue(state, stocks);
    var total = state.fish + inv;
    var profit = total - 5000;
    var pct = ((profit / 5000) * 100).toFixed(1);

    document.getElementById("fish").textContent = state.fish.toFixed(2) + " Fish";
    document.getElementById("investments").textContent = inv.toFixed(2) + " Fish";
    document.getElementById("total").textContent = total.toFixed(2) + " Fish";
    document.getElementById("percent").textContent = (profit >= 0 ? "+" : "") + pct + "%";
    document.getElementById("profit").textContent = (profit >= 0 ? "+" : "") + profit.toFixed(2) + " Fish";
    document.getElementById("challegesCompleted").textContent = state.challengesCompleted.length + "/10";
}

//  MARKET
async function initMarket() {
    var container = document.getElementById("stockTable");
    if (!container) return;
 
    var stocks = await getStocks();
    refreshMarketTable(stocks, container);
 
    var simBtn = document.getElementById("simulateBtn");
    if (simBtn) {
        var initState = loadState();
        simBtn.textContent = "Simulate Market (" + initState.simulationCount + " times)";
 
        simBtn.addEventListener("click", async function() {
            var state = loadState();
            state.simulationCount++;
            saveState(state);
            stocks = await simulateMarket();
            refreshMarketTable(stocks, container);
            simBtn.textContent = "Simulate Market (" + state.simulationCount + " times)";
        });
    }
}

function refreshMarketTable(stocks, container) {
    var state = loadState();
    var rows = "";
    for (var i = 0; i < stocks.length; i++) {
        var s = stocks[i];
        var owned = state.portfolio[s.symbol] ? state.portfolio[s.symbol].shares : 0;
        var trend = "Neutral";
        if (s.growthBias >= 2)        trend = "Strong Up";
        else if (s.growthBias === 1)  trend = "Up";
        else if (s.growthBias === -1) trend = "Down";
        else if (s.growthBias <= -2)  trend = "Strong Down";
 
        var sellBtn = owned > 0
            ? "<button class='btn btn-sm btn-sell' onclick=\"sellStock('" + s.symbol + "')\">Sell</button>"
            : "";
 
        rows += "<tr>" +
            "<td><strong>" + s.symbol + "</strong></td>" +
            "<td>" + s.name + "</td>" +
            "<td>" + s.price.toFixed(2) + " Fish</td>" +
            "<td>" + s.volatility + "%</td>" +
            "<td>" + trend + "</td>" +
            "<td>" + owned + "</td>" +
            "<td><button class='btn btn-sm' onclick=\"buyStock('" + s.symbol + "')\">Buy</button> " + sellBtn + "</td>" +
            "</tr>";
    }
 
    container.innerHTML =
        "<table class='stock-table'>" +
        "<thead><tr>" +
        "<th>Symbol</th><th>Name</th><th>Price</th><th>Volatility</th><th>Trend</th><th>You Own</th><th>Actions</th>" +
        "</tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
        "</table>";
}

// BUY 
async function buyStock(symbol) {
    var state = loadState();
    var stocks = await getStocks();
    var stock = null;
    for (var i = 0; i < stocks.length; i++) {
        if (stocks[i].symbol === symbol) { stock = stocks[i]; break; }
    }
    if (!stock) return;
 
    var sharesStr = prompt(
        "Buy " + stock.name + " (" + symbol + ")\n" +
        "Price: " + stock.price.toFixed(2) + " Fish per share\n" +
        "You have: " + state.fish.toFixed(2) + " Fish\n\n" +
        "How many shares?"
    );
    if (!sharesStr) return;
    var shares = parseInt(sharesStr);
    if (isNaN(shares) || shares <= 0) { alert("Invalid number of shares."); return; }
 
    var cost = shares * stock.price;
    if (cost > state.fish) { alert("Not enough Fish! This costs " + cost.toFixed(2) + " Fish."); return; }
 
    state.fish -= cost;
    if (!state.portfolio[symbol]) {
        state.portfolio[symbol] = { shares: 0, avgCost: 0 };
    }
    var h = state.portfolio[symbol];
    h.avgCost = ((h.avgCost * h.shares) + (stock.price * shares)) / (h.shares + shares);
    h.shares += shares;
    state.tradeCount++;
 
    saveState(state);
    alert("Bought " + shares + " share(s) of " + symbol + " for " + cost.toFixed(2) + " Fish!");
 
    var container = document.getElementById("stockTable");
    if (container) refreshMarketTable(stocks, container);
}
// SELL
async function sellStock(symbol) {
    var state = loadState();
    var stocks = await getStocks();
    var stock = null;
    for (var i = 0; i < stocks.length; i++) {
        if (stocks[i].symbol === symbol) { stock = stocks[i]; break; }
    }
    if (!stock) return;
 
    var holding = state.portfolio[symbol];
    if (!holding || holding.shares <= 0) { alert("You don't own any shares of " + symbol + "."); return; }
 
    var sharesStr = prompt(
        "Sell " + stock.name + " (" + symbol + ")\n" +
        "Price: " + stock.price.toFixed(2) + " Fish per share\n" +
        "You own: " + holding.shares + " shares\n\n" +
        "How many shares to sell?"
    );
    if (!sharesStr) return;
    var shares = parseInt(sharesStr);
    if (isNaN(shares) || shares <= 0) { alert("Invalid number."); return; }
    if (shares > holding.shares) { alert("You only own " + holding.shares + " shares."); return; }
 
    var revenue = shares * stock.price;
    var costBasis = shares * holding.avgCost;
    var profit = revenue - costBasis;
 
    state.fish += revenue;
    holding.shares -= shares;
    if (holding.shares === 0) delete state.portfolio[symbol];
    if (profit > 0) state.profitableTrades++;
 
    saveState(state);
    alert(
        "Sold " + shares + " share(s) of " + symbol + " for " + revenue.toFixed(2) + " Fish!\n" +
        "Trade profit/loss: " + (profit >= 0 ? "+" : "") + profit.toFixed(2) + " Fish"
    );
 
    var container = document.getElementById("stockTable");
    if (container) refreshMarketTable(stocks, container);
}
 

// CHALLENGES
async function initChallenges() {
    var state = loadState();
    var stocks = await getStocks();
    var inv = getPortfolioValue(state, stocks);
 
    for (var i = 0; i < CHALLENGE_LIST.length; i++) {
        var ch = CHALLENGE_LIST[i];
        var card = document.getElementById("challenge-" + ch.id);
        if (!card) continue;
        var btn = card.querySelector(".btn");
        if (!btn) continue;
 
        if (state.challengesCompleted.indexOf(ch.id) !== -1) {
            btn.textContent = "Completed";
            btn.disabled = true;
            btn.style.opacity = "0.6";
            card.style.borderLeft = "4px solid #0f9b6e";
        } else {
            btn.textContent = "Claim";
            btn.disabled = false;
            btn.style.opacity = "1";
            card.style.borderLeft = "";
            (function(id) {
                btn.onclick = function() { claimChallenge(id); };
            })(ch.id);
        }
    }
}
 
async function claimChallenge(id) {
    var state = loadState();
    var stocks = await getStocks();
    var inv = getPortfolioValue(state, stocks);
 
    // already claimed
    if (state.challengesCompleted.indexOf(id) !== -1) {
        alert("You already completed this challenge!");
        return;
    }
 
    var ch = null;
    for (var i = 0; i < CHALLENGE_LIST.length; i++) {
        if (CHALLENGE_LIST[i].id === id) { ch = CHALLENGE_LIST[i]; break; }
    }
    if (!ch) return;
 
    // requirement not met
    if (!ch.check(state, inv)) {
        alert("Requirement not met yet:\n" + ch.desc);
        return;
    }
 
    // Apply reward
    var bonus = state.fish * (ch.reward / 100);
    state.fish += bonus;
    state.challengesCompleted.push(id);
    saveState(state);
 
    alert("Challenge " + id + " complete!\nYou earned " + bonus.toFixed(2) + " Fish (+" + ch.reward + "% buying power)!");
    initChallenges();
}
