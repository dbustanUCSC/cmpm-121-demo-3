import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board.ts";

interface Geocoin {
  mintingLocation: Cell;
  serialNumber: number;
}

interface Cell {
  readonly i: number;
  readonly j: number;
}

const mapOfMementos = new Map<string, string>();

function storeMementosForCell(cell: Cell, mementos: string) {
  const key = `${cell.i}_${cell.j}`;
  mapOfMementos.set(key, mementos);
}

class Geocache {
  coins: Geocoin[];
  location: Cell;
  container: leaflet.Layer | null;
  constructor(cell: Cell, newContainer: leaflet.Layer) {
    this.location = cell;
    this.coins = [];
    const numInitialCoins = Number(
      (luck(`${cell.i}, ${cell.j}`) * 10).toFixed(0)
    );
    for (let i = 0; i < numInitialCoins; i++) {
      this.coins.push({ mintingLocation: cell, serialNumber: i });
    }
    this.container = newContainer;
  }
  toMemento() {
    const jsoncoin:string = JSON.stringify(this.coins);
    return jsoncoin;
  }
  fromMemento(jsoncoin: string) {
    const parsedArray = JSON.parse(jsoncoin) as Geocoin[];
    //console.log(parsedArray);
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

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const buttonNames = ["north", "south", "west", "east", "sensor"];
//const allButtons: HTMLButtonElement[] = [];

buttonNames.forEach((buttonName) => {
  const selector = `#${buttonName}`;
  const button: HTMLButtonElement = document.querySelector(selector)!;
  button.addEventListener("click", () => {
    handleButton(buttonName);
  });
});

function handleButton(name: string) {
  const playerLatLng = playerMarker.getLatLng();
  switch (name) {
    case "north":
      playerLatLng.lat += TILE_DEGREES;
      break;
    case "south":
      playerLatLng.lat -= TILE_DEGREES;
      playerMarker.setLatLng(playerLatLng);
      break;
    case "east":
      playerLatLng.lng += TILE_DEGREES;
      playerMarker.setLatLng(playerLatLng);
      break;
    case "west":
      playerLatLng.lng -= TILE_DEGREES;
      playerMarker.setLatLng(playerLatLng);
      break;
    case "sensor":
      navigator.geolocation.watchPosition((position) => {
        playerMarker.setLatLng(
          leaflet.latLng(position.coords.latitude, position.coords.longitude)
        );
        map.setView(playerMarker.getLatLng());
      });
      break;
  }
  playerMarker.setLatLng(playerLatLng);
  map.setView(playerMarker.getLatLng());
  geocacheList.forEach((geocache, cell) => {
    const cellString = [cell.i, cell.j].toString();
    mapOfMementos.set(cellString, geocache.toMemento());
    geocache.container?.remove();
  });
  //geocacheList.clear();
  geocacheCreator();
}

function setInitialPlayerPos() {
  const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
  playerMarker.bindTooltip("That's you!");
  playerMarker.addTo(map);
  return playerMarker;
}

//we need this to in order to store instances of our geocaches with cells.
const geocacheList = new Map<Cell, Geocache>();

function checkDuplicate(geocacheInQuestion: Geocache) {
  geocacheList.forEach((geocache, cell) => {
    if (cell.i == geocacheInQuestion.location.i && cell.j == geocacheInQuestion.location.j) {
      const cellString = [cell.i, cell.j].toString();
      console.log("cell i:", cell.i, "cell j:", cell.j);
      geocacheInQuestion.fromMemento(mapOfMementos.get(cellString)!);
    }
  });
}



function makeGeocache(i: number, j: number) {
  const currentCell: Cell = { i: i, j: j };
  let coinDiv = document.createElement("div");
  const bounds = board.getCellBounds(currentCell);
  const geocacheContainer = leaflet.rectangle(bounds) as leaflet.Layer;
  const newGeocache = new Geocache(currentCell, geocacheContainer);
 checkDuplicate(newGeocache);
 const cellString = [currentCell.i, currentCell.j].toString();
  
  geocacheContainer.bindPopup(() => {
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
        mapOfMementos.set(cellString, newGeocache.toMemento());
        console.log("hi");
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
  geocacheList.set(currentCell, newGeocache);
  geocacheContainer.addTo(map);
}

function geocacheCreator() {
  const currentPosition = playerMarker.getLatLng();
  for (const { i, j } of board.getCellsNearPoint(currentPosition)) {
    if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
      makeGeocache(i, j);
    }
  }
}

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";
const playerMarker = setInitialPlayerPos();

geocacheCreator();
