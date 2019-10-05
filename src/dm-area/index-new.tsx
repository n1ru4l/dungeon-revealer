import React from "react";
import { observer } from "mobx-react";
import { AppRoot, DmAppStateInitialized } from "../models/dm-app-state";
import { SelectMapModal } from "./select-map-modal";
import { Modal } from "./modal";

const SelectMapModalRenderer: React.FC<{
  state: typeof DmAppStateInitialized.Type;
}> = observer(({ state }) => {
  return (
    <>
      {state.showMapLibrary ||
      (state.mode && state.mode.name === "SHOW_MODAL") ? (
        <SelectMapModal
          canClose={Boolean(state.loadedMap)}
          close={state.tryCloseMapModal}
          setLoadedMapId={state.setLoadedMapId}
          maps={state.maps}
          loadedMapId={state.loadedMapId}
          liveMapId={state.liveMapId}
          deleteMap={state.deleteMap}
        />
      ) : null}
    </>
  );
});

export const DmArea: React.FC<{ root: typeof AppRoot.Type }> = observer(
  ({ root: { state } }) => {
    if (state.stage === "INITIALIZING") return null;

    return (
      <Modal.Provider>
        <SelectMapModalRenderer state={state} />
      </Modal.Provider>
    );
  }
);
