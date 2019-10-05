export type Map = {
  id: string;
  title: string;
};

export type StateTree = {
  maps: Array<Map>;
};

export const state: StateTree = {
  maps: []
};
