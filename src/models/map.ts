import { types, onSnapshot, flow, applySnapshot } from "mobx-state-tree";
import throttle from "lodash/throttle";
import { MapGrid } from "./map-grid";

export const Map = types
  .model({
    id: types.string,
    title: "",
    grid: types.maybeNull(MapGrid),
    fogProgressPath: types.maybeNull(types.string),
    fogLivePath: types.maybeNull(types.string),
    mapPath: types.maybeNull(types.string),
    showGrid: types.boolean,
    showGridToPlayers: types.boolean,
    gridColor: types.string
  })
  .actions(self => {
    const save = flow(function*(snapshot: typeof self) {
      const result: any = yield fetch(`/map/${self.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(snapshot)
      }).then(res => res.json());
      applySnapshot(self, result);
    });
    return {
      save,
      afterCreate() {
        onSnapshot(
          self,
          throttle(snapshot => {
            save(snapshot);
          }, 500)
        );
      },
      setTitle: (newTitle: string) => {
        self.title = newTitle;
      },
      setGridColor: (gridColor: string) => {
        self.gridColor = gridColor;
      },
      setShowGrid: (showGrid: boolean) => {
        self.showGrid = showGrid;
      },
      setShowGridToPlayers: (showGridToPlayers: boolean) => {
        self.showGridToPlayers = showGridToPlayers;
      },
      setGrid: (grid: typeof MapGrid.Type) => {
        self.grid = grid;
      }
    };
  });
