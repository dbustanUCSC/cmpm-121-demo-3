import leaflet from "leaflet";
import { MERRILL_CLASSROOM } from "./main";

const TILE_DEGREES = 1e-4;


interface Cell {
    readonly i: number;
    readonly j: number;
}


export class Board {

    readonly tileWidth: number;
    readonly tileVisibilityRadius: number;

    private readonly knownCells: Map<string, Cell>;

    constructor(tileWidth: number, tileVisibilityRadius: number) {
        this.tileWidth = tileWidth;
        this.tileVisibilityRadius = tileVisibilityRadius;
        this.knownCells = new Map();
    }
   
    private getCanonicalCell(cell: Cell): Cell | undefined {
        const { i, j } = cell;
        const key = [i, j].toString();
        if (!this.knownCells.has(key)) {
            console.log("no cell exists");
            return undefined;
        }
        return this.knownCells.get(key)!;
    }
    createCanonicalCell(i: number, j: number): Cell | undefined {
        const cell: Cell = {i: i, j: j};
        const key = [i, j].toString();
        if (this.knownCells.has(key)) {
            console.log("there is already a cell located there.");
            return undefined;
        } else {
            this.knownCells.set(key, cell)!;
            return cell;
        }
    }
    getCellForPoint(point: leaflet.LatLng): Cell | undefined {
        const i = Math.floor(point.lat/ this.tileWidth);
        const j = Math.floor(point.lng / this.tileWidth);
        if (this.getCanonicalCell({ i, j }) != undefined) {
            return this.getCanonicalCell({i, j})!;
        }
    }

    getCellBounds(cell: Cell): leaflet.LatLngBounds {
        const bounds = leaflet.latLngBounds([
            [
              MERRILL_CLASSROOM.lat + cell.i * TILE_DEGREES,
              MERRILL_CLASSROOM.lng + cell.j * TILE_DEGREES,
            ],
            [
              MERRILL_CLASSROOM.lat + (cell.i + 1) * TILE_DEGREES,
              MERRILL_CLASSROOM.lng + (cell.j + 1) * TILE_DEGREES,
            ],
          ]);
          return bounds;
    }

    getCellsNearPoint(point: leaflet.LatLng): Cell[] {
        const resultCells: Cell[] = [];
        
        const originCell = this.getCellForPoint(point)!;

        for (let i = -this.tileVisibilityRadius; i < this.tileVisibilityRadius; i++) {
            for (let j = - this.tileVisibilityRadius; j < this.tileVisibilityRadius; j++) {
                const cellInRadius: Cell = { i: originCell.i + i, j: originCell.j + j };
                const canonicalCell: Cell | undefined = this.getCanonicalCell(cellInRadius);
                if (canonicalCell != undefined) {
                    resultCells.push(canonicalCell);
                }
                
            }
        }
        
        return resultCells;
    }
}
