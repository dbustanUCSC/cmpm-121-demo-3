import leaflet from "leaflet";

export interface Cell {
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

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell)!;
    }

    return cell;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor(point.lat / this.tileWidth);
    const j = Math.floor(point.lng / this.tileWidth);
    return this.getCanonicalCell({ i, j })!;
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const lat = cell.i * this.tileWidth;
    const lng = cell.j * this.tileWidth;
    const corner1 = leaflet.latLng(lat, lng);
    const corner2 = leaflet.latLng(lat + this.tileWidth, lng + this.tileWidth);
    return leaflet.latLngBounds(corner1, corner2);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];

    const originCell = this.getCellForPoint(point)!;

    for (
      let i = -this.tileVisibilityRadius;
      i < this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j < this.tileVisibilityRadius;
        j++
      ) {
        const cellInRadius: Cell = { i: originCell.i + i, j: originCell.j + j };
        const canonicalCell: Cell = this.getCanonicalCell(cellInRadius);
        resultCells.push(canonicalCell);
      }
    }

    return resultCells;
  }
}
