import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board.ts";

interface Coin {
    i: number,
    j: number,
    index: number,
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
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const mapContainer = document.querySelector<HTMLElement>("#map")!;

//const pitMap: Map<string, leaflet.Layer> = new Map<string, leaflet.Layer>();
const map = leaflet.map(mapContainer, {
    center: MERRILL_CLASSROOM,
    zoom: GAMEPLAY_ZOOM_LEVEL,
    minZoom: GAMEPLAY_ZOOM_LEVEL,
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    zoomControl: false,
    scrollWheelZoom: false
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
}).addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

let points = 0;
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


function makePit(i: number, j: number) {
  const currentCell: Cell | undefined = board.createCanonicalCell(i, j);
  if (currentCell != undefined) {
    const coins: Coin[] = [];
    const bounds = board.getCellBounds(currentCell);
    const pit = leaflet.rectangle(bounds) as leaflet.Layer;
   
    pit.bindPopup(() => {
      //we want each pit to have a random amount of coins 
      const numOfCoins = Number((luck(`${currentCell.i}, ${currentCell.j}`) * 10).toFixed(0));
      for (let k = 0; k < numOfCoins; k++){
        const newCoin: Coin = { i: currentCell.i, j: currentCell.j, index: k };
        coins.push(newCoin);
      }
      let value = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
      const container = document.createElement("div");
      container.innerHTML = `
                  <div>There is a pit here at "${currentCell.i},${currentCell.j}". It has value <span id="value">${coins.length}</span>.</div>
                  <button id="poke">poke</button> </div>
                  <button id="deposit">deposit</button>`;
      const poke = container.querySelector<HTMLButtonElement>("#poke")!;
      poke.addEventListener("click", () => {
        coins.pop();
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          coins.length.toString();
        points++;
        statusPanel.innerHTML = `${points} points accumulated`;
      });
      const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
      deposit.addEventListener("click", () => {
        const NO_POINTS = 0;
        if (points <= NO_POINTS) return;
        points--;
        value++;
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          value.toString();
        statusPanel.innerHTML =
          points == NO_POINTS
            ? `No points yet...`
            : `${points} points accumulated`;
      });
      return container;
    });
    pit.addTo(map);
  }
  
  // const bounds = leaflet.latLngBounds([
  //   [
  //     MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
  //     MERRILL_CLASSROOM.lng + j * TILE_DEGREES,
  //   ],
  //   [
  //     MERRILL_CLASSROOM.lat + (i + 1) * TILE_DEGREES,
  //     MERRILL_CLASSROOM.lng + (j + 1) * TILE_DEGREES,
  //   ],
  // ]);

  

  
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = - NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
        if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
            makePit(i, j);
        }
    }
}