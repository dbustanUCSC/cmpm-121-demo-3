import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board.ts";

interface Coin {
  location: Cell;
  index: number;
}

interface Cell {
  readonly i: number;
  readonly j: number;
}
export const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const board = new Board(0.0001, 8);

const GAMEPLAY_ZOOM_LEVEL = 19;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;
const playerInventory: Coin[] = [];
const mapContainer = document.querySelector<HTMLElement>("#map")!;

//const pitMap: Map<string, leaflet.Layer> = new Map<string, leaflet.Layer>();
const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    map.setView(playerMarker.getLatLng());
  });
});

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";

const allPitData = new Map<Cell, Coin[]>();
function makePit(i: number, j: number) {
  const currentCell: Cell = { i: i, j: j };
    let coinDiv = document.createElement("div");
  const bounds = board.getCellBounds(currentCell); 
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  const coins: Coin[] = [];
    const numOfCoins = Number(
      (luck(`${currentCell.i}, ${currentCell.j}`) * 10).toFixed(0)
    );
  console.log(currentCell.i, currentCell.j);
    for (let k = 0; k < numOfCoins; k++) {
      const newCoin: Coin = { location: currentCell, index: k };
      coins.push(newCoin);
    }
    pit.bindPopup(() => {
      const NO_COINS = 0;
      const currentCellCoins = allPitData.get(currentCell)!;
      const container = document.createElement("div");
      container.innerHTML = `
                  <div>There is a pit here at "${currentCell.i},${currentCell.j}". It has <span id="value">${coins.length}</span> coins.</div>
                  <button id="poke">take</button> </div>
                  <button id="deposit">deposit</button>`;
      currentCellCoins.forEach((coin) => {
        const coinData = `${coin.location.i}:${coin.location.j}#${coin.index}`;
        coinDiv = document.createElement("div");
        coinDiv.textContent = coinData;
        container.appendChild(coinDiv);
      });
      const poke = container.querySelector<HTMLButtonElement>("#poke")!;
      poke.addEventListener("click", () => {
        if (currentCellCoins.length > NO_COINS) {
          const coinToCollect: Coin = currentCellCoins.pop()!;
          playerInventory.push(coinToCollect);
          container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            currentCellCoins.length.toString();
          statusPanel.innerHTML = `${playerInventory.length} coins accumulated`;

          const coinDivToRemove = container.lastChild;
          if (coinDivToRemove instanceof HTMLDivElement) {
            container.removeChild(coinDivToRemove);
          }
        }
      });
      const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
      deposit.addEventListener("click", () => {
        if (playerInventory.length <= NO_COINS) return;
        const coinToDeposit = playerInventory.pop()!;
        currentCellCoins.push(coinToDeposit);
        coinDiv = document.createElement("div");
        coinDiv.textContent = `${coinToDeposit.location.i}:${coinToDeposit.location.j}#${coinToDeposit.index}`;
        container.append(coinDiv);
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          currentCellCoins.length.toString();
        statusPanel.innerHTML =
          playerInventory.length == NO_COINS
            ? `No coins yet...`
            : `${playerInventory.length} coins accumulated`;
      });

      return container;
    });
  allPitData.set(currentCell, coins);
  pit.addTo(map);
}

const currentPosition = playerMarker.getLatLng();
for (const { i, j } of board.getCellsNearPoint(currentPosition)) {
  if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
    makePit(i, j);
  }
}


