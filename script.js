//Acess database
let stocks = [];

async function loadStocks() {
    try {
        let response = await fetch("stocks.json");
        stocks = await response.json();

        console.log("Stocks loaded:", stocks);

        displayStocks();
    } catch (error) {
        console.error("Error loading stocks:", error);
    }
}


//show stocks on dashboard
function displayStocks() {
  let container = document.getElementByID("stock-list")

  if (!container) return;

  container.innerHTML = "";

  stocks.forEach((stock, index) => {
      let div = document.createElement("div");
