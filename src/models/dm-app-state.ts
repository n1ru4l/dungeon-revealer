import { types, flow, destroy, onSnapshot } from "mobx-state-tree";
import { Map } from "./map";

const getDefaultValueFromLocalStorage = (key: string) => {
  const value: string | null = localStorage.getItem(key);
  if (!value) return null;
  const parsedValue = JSON.parse(value);
  if (typeof parsedValue !== "string") return null;
  return parsedValue;
};

export const DmAppStateInitializing = types.model({
  stage: types.optional(types.literal("INITIALIZING"), "INITIALIZING")
});

const ShowModalMode = types.model({
  name: types.optional(types.literal("SHOW_MODAL"), "SHOW_MODAL")
});

export const DmAppStateInitialized = types
  .model({
    stage: types.optional(types.literal("INITIALIZED"), "INITIALIZED"),
    mode: types.optional(types.union(ShowModalMode, types.null), () =>
      ShowModalMode.create()
    ),
    maps: types.array(Map),
    loadedMapId: types.optional(types.union(types.null, types.string), () =>
      getDefaultValueFromLocalStorage("loadedMapId")
    ),
    liveMapId: types.optional(types.union(types.null, types.string), null)
  })
  .views(self => {
    return {
      get loadedMap() {
        let loadedMap = null;
        if (self.loadedMapId !== null) {
          loadedMap =
            self.maps.find(map => map.id === self.loadedMapId) || null;
        }
        if (!loadedMap && self.liveMapId) {
          loadedMap = loadedMap =
            self.maps.find(map => map.id === self.liveMapId) || null;
        }

        return loadedMap;
      },
      get liveMap() {
        let liveMap = null;
        if (self.liveMapId) {
          liveMap = self.maps.find(map => map.id === self.liveMapId) || null;
        }
        return liveMap;
      }
    };
  })
  .views(self => {
    return {
      get showMapLibrary() {
        return self.loadedMap === null;
      }
    };
  })
  .actions(self => {
    return {
      setLoadedMapId: (loadedMapId: string) => {
        self.loadedMapId = loadedMapId;
      },
      tryCloseMapModal() {
        if (!self.loadedMap) return;
        if (self.mode && self.mode.name === "SHOW_MODAL") self.mode = null;
      },
      deleteMap: flow(function*(mapId: string) {
        const map = self.maps.find(map => map.id === mapId) || null;
        if (!map) return;
        self.maps.remove(map);
        yield fetch(`/map/${mapId}`, {
          method: "DELETE"
        });
      })
    };
  });

// mode: types.optional(
//   types.enumeration([
//     "SHOW_MAP_LIBRARY",
//     "SET_MAP_GRID",
//     "EDIT_MAP"
//   ]),
// )

export const AppRoot = types
  .model({
    state: types.optional(
      types.union(DmAppStateInitializing, DmAppStateInitialized),
      () => DmAppStateInitializing.create()
    )
  })
  .actions(self => {
    return {
      afterCreate: flow(function*() {
        const result: any = yield fetch("/map").then(res => res.json());
        const state = DmAppStateInitialized.create({
          maps: result.data.maps,
          liveMapId: result.data.liveMapId
        });
        const previousState = self.state;
        self.state = state;
        destroy(previousState);

        onSnapshot(self.state, snapshot => {
          if (
            snapshot.stage !== "INITIALIZED" ||
            snapshot.loadedMapId ===
              getDefaultValueFromLocalStorage("loadedMapId")
          )
            return;

          localStorage.setItem(
            "loadedMapId",
            JSON.stringify(snapshot.loadedMapId)
          );
        });
      })
    };
  });
