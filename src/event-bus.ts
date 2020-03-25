export interface IEventBus<TEventPayload extends any> {
  on: (listener: (payload: TEventPayload) => any) => () => void;
  trigger: (payload: TEventPayload) => void;
}

export const createEventBus = <
  TEventPayload extends any
>(): IEventBus<TEventPayload> => {
  const listeners = new Set<(i: TEventPayload) => void>();
  return {
    on: (listener: (input: TEventPayload) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    trigger: (payload: TEventPayload) => {
      listeners.forEach(item => item(payload));
    }
  };
};
