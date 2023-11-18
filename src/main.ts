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
let momentosByCellKey = new Map<string, string>();

class Player {
  playerMarker: null | leaflet.Marker = null;
  inventory: Geocoin[] = [];
  playerMovementHistory: leaflet.LatLng[] = [];
  playerMovementPolyline: leaflet.Polyline | null = null;
  constructor() {
    this.setInitialPlayerPos();
  }
  setInitialPlayerPos() {
    if (this.playerMarker != null) {
      this.playerMarker.removeFrom(map);
    }
    this.playerMarker = leaflet.marker(MERRILL_CLASSROOM);
    map.setView(this.playerMarker.getLatLng());
    this.playerMarker.bindTooltip("That's you!");
    this.playerMarker.addTo(map);
  }
  toMomento() {
    const jsonCoin: string = JSON.stringify(this.inventory);
    const jsonPlayerMovementHistory = JSON.stringify(
      this.playerMovementHistory
    );
    return {
      inventory: jsonCoin,
      playerMovementHistory: jsonPlayerMovementHistory,
    };
  }
  fromMomento(data: { inventory: string; playerMovementHistory: string }) {
    const parsedCoinArray = JSON.parse(data.inventory) as Geocoin[];
    this.inventory = parsedCoinArray;
    const parsedMovementArray = JSON.parse(
      data.playerMovementHistory
    ) as leaflet.LatLng[];
    this.playerMovementHistory = parsedMovementArray;
  }
  renderMovementHistory() {
    this.playerMovementPolyline?.remove();
    this.playerMovementPolyline = leaflet.polyline(this.playerMovementHistory, {
      color: "blue",
      weight: 3,
      opacity: 0.7,
    });

    this.playerMovementPolyline.addTo(map);
  }
}

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
//let playerInventory: Geocoin[] = [];
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
const player: Player = new Player();

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

const directionButtons = ["north", "south", "west", "east", "sensor"];

const otherFunctionalButtons = ["sensor", "reset"];

directionButtons.forEach((direction) => {
  const selector = `#${direction}`;
  const button: HTMLButtonElement = document.querySelector(selector)!;
  button.addEventListener("click", () => {
    handleDirection(direction);
  });
});

otherFunctionalButtons.forEach((functionality) => {
  const selector = `#${functionality}`;
  const button: HTMLButtonElement = document.querySelector(selector)!;
  button.addEventListener("click", () => {
    handleFunctions(functionality);
  });
});

function handleFunctions(name: string) {
  if (name === "sensor") {
    navigator.geolocation.watchPosition(
      (position) => {
        player.playerMarker!.setLatLng(
          leaflet.latLng(position.coords.latitude, position.coords.longitude)
        );
        checkGeocachesVisibility();
        //map.setView(player.playerMarker!.getLatLng());
      },
      undefined,
      options
    );
  }
  if (name === "reset") {
    deleteData();
  }
  map.setView(player.playerMarker!.getLatLng());
}

function deleteData() {
  momentosByCellKey.clear();
  activeGeocaches.forEach((geocache) => {
    map.removeLayer(geocache.container);
  });
  activeGeocaches.clear();
  player.playerMovementHistory = [];
  player.inventory = [];
  statusPanel.innerHTML = "No coins yet...";
  player.setInitialPlayerPos();
  player.renderMovementHistory();
  despawnGeocaches();
  spawnGeocachesNearPlayer();
}

function handleDirection(name: string) {
  const currentLatLng = player.playerMarker!.getLatLng();
  let newlatLng: leaflet.LatLng = leaflet.latLng(
    currentLatLng.lat,
    currentLatLng.lng
  );
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
  }
  player.playerMovementHistory.push(currentLatLng);
  map.setView(player.playerMarker!.getLatLng());
  player.playerMarker!.setLatLng(newlatLng);
  player.renderMovementHistory();
  saveGameState();
  despawnGeocaches();
  spawnGeocachesNearPlayer();
}

const activeGeocaches = new Map<Cell, Geocache>();
const NO_COINS = 0;
function makeGeocache(i: number, j: number): Geocache {
  const currentCell: Cell = { i: i, j: j };
  let coinDiv = document.createElement("div");
  const bounds = board.getCellBounds(currentCell);
  const geocacheContainer = leaflet.rectangle(bounds) as leaflet.Layer;
  const newGeocache = new Geocache(currentCell, geocacheContainer);
  const cellString = [currentCell.i, currentCell.j].toString();
  newGeocache.container.bindPopup(() => {
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
        player.inventory.push(coinToCollect);
        saveGameState();
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          currentCellCoins.length.toString();
        statusPanel.innerHTML = `${player.inventory.length} coins accumulated`;
        const coinDivToRemove = container.lastChild;
        if (coinDivToRemove instanceof HTMLDivElement) {
          container.removeChild(coinDivToRemove);
        }
      }
    });
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (player.inventory.length <= NO_COINS) return;
      const coinToDeposit = player.inventory.pop()!;
      currentCellCoins.push(coinToDeposit);
      saveGameState();
      coinDiv = document.createElement("div");
      coinDiv.textContent = `${coinToDeposit.mintingLocation.i}:${coinToDeposit.mintingLocation.j}#${coinToDeposit.serialNumber}`;
      container.append(coinDiv);
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        currentCellCoins.length.toString();
      statusPanel.innerHTML =
        player.inventory.length == NO_COINS
          ? `No coins yet...`
          : `${player.inventory.length} coins accumulated`;
    });
    return container;
  });
  activeGeocaches.set(currentCell, newGeocache);
  geocacheContainer.addTo(map);
  return newGeocache;
}

function spawnGeocachesNearPlayer() {
  const currentPosition = player.playerMarker!.getLatLng();
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
}
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
function saveGameState() {
  localStorage.setItem("playerData", JSON.stringify(player.toMomento()));
  const momentosArray = Array.from(momentosByCellKey.entries());
  localStorage.setItem("geocacheState", JSON.stringify(momentosArray));
}

loadGameState();
function loadGameState() {
  const geocacheString = localStorage.getItem("geocacheState");
  console.log(geocacheString);
  const playerdataString = localStorage.getItem("playerData");
  if (geocacheString) {
    const momentosArray = JSON.parse(geocacheString) as [string, string][];
    momentosByCellKey = new Map<string, string>(momentosArray);
  }
  if (playerdataString) {
    const playerdata = JSON.parse(playerdataString) as {
      inventory: string;
      playerMovementHistory: string;
    };
    player.fromMomento(playerdata);
    statusPanel.innerHTML =
      player.inventory.length == NO_COINS
        ? `No coins yet...`
        : `${player.inventory.length} coins accumulated`;
    console.log(player.inventory);
  }
}

function despawnGeocaches() {
  activeGeocaches.forEach((geocache, cell) => {
    const cellString = [cell.i, cell.j].toString();
    momentosByCellKey.set(cellString, geocache.toMomento());
    map.removeLayer(geocache.container);
  });
  activeGeocaches.clear();
}

spawnGeocachesNearPlayer();
