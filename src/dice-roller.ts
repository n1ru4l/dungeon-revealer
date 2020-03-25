import times from "lodash/times";

const parseDice = /(\d*)(x)*[WD](4|6|8|10|12|20)([\+|\-][\d]*)?/;

export type TValidDie = "D4" | "D6" | "D8" | "D10" | "D12" | "D20";

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const parseModificator = (rawModificator?: string) => {
  if (!rawModificator) return 0;
  const modificator = parseInt(rawModificator, 10);
  if (Number.isNaN(modificator)) return 0;
  return modificator;
};

export const roll = (str: string) => {
  const result = parseDice.exec(str);
  if (!result) return null;
  const [, rawAmount, seperate, dieSides, rawModificator] = result;

  const useSeperateValues = Boolean(seperate);

  const amount = parseInt(rawAmount) || 1;
  const modificator = parseModificator(rawModificator);

  const diceResults = times(amount, () => {
    const diceResult = getRandomInt(1, parseInt(dieSides, 10));
    return {
      type: ("D" + dieSides) as TValidDie,
      diceResult,
      result: diceResult + (useSeperateValues ? modificator : 0)
    };
  });

  return {
    diceResults,
    result: useSeperateValues
      ? diceResults.map(d => d.result)
      : diceResults.reduce((sum, diceResult) => sum + diceResult.result, 0)
  };
};
