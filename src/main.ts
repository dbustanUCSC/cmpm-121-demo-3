import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

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

interface Coin {
  xPos: number;
  yPos: number;
  index: number;
}

const inventory: Coin[] = [];
//This keeps track of our known tiles
const knownTiles: Map<string, Coin[]> = new Map<string, Coin[]>();

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
  if (knownTiles.get(`${i}, ${j}`)) {
    return knownTiles.get(`${i}, ${j}`);
  }
  const bounds = leaflet.latLngBounds([
    [
      MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
      MERRILL_CLASSROOM.lng + j * TILE_DEGREES,
    ],
    [
      MERRILL_CLASSROOM.lat + (i + 1) * TILE_DEGREES,
      MERRILL_CLASSROOM.lng + (j + 1) * TILE_DEGREES,
    ],
  ]);
  const coinsInPit: Coin[] = [];
  knownTiles.set(`${i},${j}`, coinsInPit);

  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  pit.bindPopup(() => {
    const numofCoins = Number((luck(`${i}, ${j}`) * 10).toFixed(0));
    for (let k = 0; k < numofCoins; k++) {
      coinsInPit.push({
        xPos: i,
        yPos: j,
        index: k,
      });
    }
    //let value = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has <span id="value">${coinsInPit.length} </span> coins.</div>
                <button id="poke">take</button> </div>
                <button id="deposit">deposit</button>`;
    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    const NO_COINS = 0;
    let coin: Coin;
    poke.addEventListener("click", () => {
      if (coinsInPit.length > NO_COINS) {
        coin = coinsInPit.pop()!;
        console.log(coin);
        inventory.push(coin);
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          coinsInPit.length.toString();
        statusPanel.innerHTML = `You have ${inventory.length} coins!`;
      }
    });
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (inventory.length <= NO_COINS) return;
      coin = inventory.pop()!;
      console.log(coin);
      coinsInPit.push(coin);
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        coinsInPit.length.toString();
      statusPanel.innerHTML =
        inventory.length == NO_COINS
          ? `No coins yet...`
          : `You have ${inventory.length} coins!`;
    });
    return container;
  });
  //pitMap.set(`${i}, ${j}`, pit);
  pit.addTo(map);
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
      makePit(i, j);
    }
  }
}
