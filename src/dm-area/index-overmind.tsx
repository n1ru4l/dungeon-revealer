import { Action, createOvermind, IConfig } from "overmind";
import { createHook } from "overmind-react";

export type Map = {
  id: string;
  title: string;
};

type StateTree = {
  maps: Array<Map>;
};

const state: StateTree = {
  maps: []
};

const changeNewTodoTitle: Action<string> = ({ state }, title) => {
  state;
};

const app = createOvermind({
  state,
  actions: {}
});

const config = {
  state
};

declare module "overmind" {
  interface Config extends IConfig<typeof config> {}
}

export const useApp = createHook<typeof config>();
