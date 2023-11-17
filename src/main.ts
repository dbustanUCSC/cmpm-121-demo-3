import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Cell, Board } from "./board.ts";

interface Geocoin {
  mintingLocation: Cell;
  serialNumber: number;
}

const options = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: Infinity,
};
const momentosByCellKey = new Map<string, string>();

class Geocache {
  coins: Geocoin[];
  constructor(readonly cell: Cell, readonly container: leaflet.Layer) {
    this.coins = [];
    const numInitialCoins = Number(
      (luck(`${cell.i}, ${cell.j}`) * 10).toFixed(0)
    );
    for (let i = 0; i < numInitialCoins; i++) {
      this.coins.push({ mintingLocation: cell, serialNumber: i });
    }
  }
  toMomento() {
    const jsonCoin: string = JSON.stringify(this.coins);
    return jsonCoin;
  }
  fromMomento(jsoncoin: string) {
    const parsedArray = JSON.parse(jsoncoin) as Geocoin[];
    this.coins = parsedArray;
  }
}

export const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const TILE_DEGREES = 0.0001;
const GAMEPLAY_ZOOM_LEVEL = 19;
const PIT_SPAWN_PROBABILITY = 0.1;
const playerInventory: Geocoin[] = [];
const mapContainer = document.querySelector<HTMLElement>("#map")!;
const board = new Board(TILE_DEGREES, 8);
const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

map.on("zoomend", () => {
  checkGeocachesVisibility();
});

function checkGeocachesVisibility() {
  const mapBounds = map.getBounds();
  activeGeocaches.forEach((_geocache, cell) => {
    const geocacheLatLng = board.getCellBounds(cell);
    if (!mapBounds.contains(geocacheLatLng)) {
      despawnGeocaches();
      spawnGeocachesNearPlayer();
    }
  });
}

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      // eslint-disable-next-line @typescript-eslint/quotes
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const buttonNames = ["north", "south", "west", "east", "sensor"];

buttonNames.forEach((buttonName) => {
  const selector = `#${buttonName}`;
  const button: HTMLButtonElement = document.querySelector(selector)!;
  button.addEventListener("click", () => {
    handleButton(buttonName);
  });
});

function handleButton(name: string) {
  const currentLatLng = playerMarker.getLatLng();
  let newlatLng: leaflet.LatLng;
  switch (name) {
    case "north":
      newlatLng = leaflet.latLng(
        currentLatLng.lat + TILE_DEGREES,
        currentLatLng.lng
      );
      break;
    case "south":
      newlatLng = leaflet.latLng(
        currentLatLng.lat - TILE_DEGREES,
        currentLatLng.lng
      );
      break;
    case "east":
      newlatLng = leaflet.latLng(
        currentLatLng.lat,
        currentLatLng.lng + TILE_DEGREES
      );
      break;
    case "west":
      newlatLng = leaflet.latLng(
        currentLatLng.lat,
        currentLatLng.lng - TILE_DEGREES
      );
      break;
    case "sensor":
      navigator.geolocation.watchPosition(
        (position) => {
          playerMarker.setLatLng(
            leaflet.latLng(position.coords.latitude, position.coords.longitude)
          );

          map.setView(playerMarker.getLatLng());
        },
        undefined,
        options
      );
      break;
  }
  playerMovementHistory.push(currentLatLng);
  map.setView(playerMarker.getLatLng());
  playerMarker.setLatLng(newlatLng!);
  renderMovementHistory();
  despawnGeocaches();
  spawnGeocachesNearPlayer();
}

function setInitialPlayerPos() {
  const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
  playerMarker.bindTooltip("That's you!");
  playerMarker.addTo(map);
  return playerMarker;
}

const activeGeocaches = new Map<Cell, Geocache>();

function makeGeocache(i: number, j: number): Geocache {
  const currentCell: Cell = { i: i, j: j };
  let coinDiv = document.createElement("div");
  const bounds = board.getCellBounds(currentCell);
  const geocacheContainer = leaflet.rectangle(bounds) as leaflet.Layer;
  const newGeocache = new Geocache(currentCell, geocacheContainer);
  const cellString = [currentCell.i, currentCell.j].toString();
  newGeocache.container.bindPopup(() => {
    const NO_COINS = 0;
    const currentCellCoins = newGeocache.coins;
    const container = document.createElement("div");
    container.innerHTML = `
                  <div>There is a pit here at "${currentCell.i},${currentCell.j}". It has <span id="value">${currentCellCoins.length}</span> coins.</div>
                  <button id="poke">take</button> </div>
                  <button id="deposit">deposit</button>`;
    currentCellCoins.forEach((coin) => {
      const coinData = `${coin.mintingLocation.i}:${coin.mintingLocation.j}#${coin.serialNumber}`;
      coinDiv = document.createElement("div");
      coinDiv.textContent = coinData;
      container.appendChild(coinDiv);
    });
    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      if (currentCellCoins.length > NO_COINS) {
        const coinToCollect: Geocoin = currentCellCoins.pop()!;
        momentosByCellKey.set(cellString, newGeocache.toMomento());
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
      coinDiv.textContent = `${coinToDeposit.mintingLocation.i}:${coinToDeposit.mintingLocation.j}#${coinToDeposit.serialNumber}`;
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
  activeGeocaches.set(currentCell, newGeocache);
  geocacheContainer.addTo(map);
  return newGeocache;
}

function spawnGeocachesNearPlayer() {
  const currentPosition = playerMarker.getLatLng();
  for (const { i, j } of board.getCellsNearPoint(currentPosition)) {
    if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
      const geocache = makeGeocache(i, j);
      const cellString = [geocache.cell.i, geocache.cell.j].toString();
      const momento = momentosByCellKey.get(cellString);
      if (momento !== undefined) {
        geocache.fromMomento(momento);
      }
    }
  }
  //console.log(geocacheList);
}

function despawnGeocaches() {
  activeGeocaches.forEach((geocache, cell) => {
    const cellString = [cell.i, cell.j].toString();
    momentosByCellKey.set(cellString, geocache.toMomento());
    map.removeLayer(geocache.container);
  });
  activeGeocaches.clear();
}

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";
const playerMarker = setInitialPlayerPos();
const playerMovementHistory: leaflet.LatLng[] = [];
let playerMovementPolyline: leaflet.Polyline | null = null;

spawnGeocachesNearPlayer();

function renderMovementHistory() {
  playerMovementPolyline?.remove();
  playerMovementPolyline = leaflet.polyline(playerMovementHistory, {
    color: "blue",
    weight: 3,
    opacity: 0.7,
  });

  playerMovementPolyline.addTo(map);
}
