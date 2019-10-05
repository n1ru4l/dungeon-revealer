import { types } from "mobx-state-tree";

export const MapGrid = types.model({
  x: types.number,
  y: types.number,
  sideLength: types.number
});
