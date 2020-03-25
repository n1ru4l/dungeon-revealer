import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled/macro";
import { Input } from "./input";
import { IDiceRollerEventBus } from "./dice-overlay";
import { roll } from "./dice-roller";
import * as Icon from "./feather-icons";
import * as Button from "./button";

const Container = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  margin-right: 16px;
  margin-left: 16px;

  margin-bottom: 16px;
  width: 100%;
  height: 100%;
  max-width: 500px;
  max-height: 400px;
  background-color: white;
  border-radius: 10px;
  padding: 16px;

  display: flex;
  flex-direction: column;
  pointer-events: all;
`;

const InputContainer = styled.div`
  margin-top: auto;
`;

const Heading = styled.h3``;

const RightColumn = styled.div`
  margin-left: auto;
  padding-left: 16px;
`;

type DiceResult = ReturnType<typeof roll>;

type NetworkDiceResult = {
  userName: string;
  diceRollFormula: string;
  diceResult: Exclude<DiceResult, null>;
};

const formatResult = (input: number | number[]) => {
  if (Array.isArray(input)) return input.join(", ");
  return String(input);
};

const DiceResultRenderer: React.FC<{ results: NetworkDiceResult[] }> = ({
  results
}) => {
  const ref = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [results]);

  return (
    <ul style={{ padding: 0, overflow: "scroll" }} ref={ref}>
      {results.map((result, i) => (
        <SingleDiceResultRenderer result={result} key={i} />
      ))}
    </ul>
  );
};

const SingleDiceResultRenderer: React.FC<{ result: NetworkDiceResult }> = ({
  result: { userName, diceRollFormula, diceResult }
}) => {
  return (
    <li style={{ display: "flex", paddingBottom: 10, listStyle: "none" }}>
      <div>
        <b>{userName}</b> rolled <b>{diceRollFormula}</b> and got{" "}
        <b>{formatResult(diceResult.result)}</b> (Dice Results:{" "}
        {diceResult.diceResults.map(r => r.diceResult).join(", ")})
      </div>
    </li>
  );
};

export const DiceRollerChat: React.FC<{ eventBus: IDiceRollerEventBus }> = ({
  eventBus
}) => {
  const [lines, setLines] = useState<NetworkDiceResult[]>([]);
  const [userName, setUserName] = useState("Anonymous");

  return (
    <Container>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div>
          <Heading>Dice Roller ™️</Heading>
        </div>
        <RightColumn>
          {userName}{" "}
          <Button.Tertiary iconOnly small>
            <Icon.EditIcon height={16} />
          </Button.Tertiary>
        </RightColumn>
      </div>
      <DiceResultRenderer results={lines} />
      <InputContainer>
        <Input
          placeholder="Type in your roll, e.g. 3D20 or 2D6"
          onKeyUp={ev => {
            if (ev.key !== "Enter") return;
            const diceRollFormula = (ev.target as HTMLInputElement).value;
            const result = roll(diceRollFormula);
            if (!result) return;

            eventBus.trigger({
              dice: result.diceResults.map(d => ({
                type: d.type,
                result: d.diceResult,
                color: "white"
              })),
              done: () => {
                setLines(lines => [
                  ...lines,
                  { userName, diceRollFormula, diceResult: result }
                ]);
              }
            });
          }}
        ></Input>
      </InputContainer>
    </Container>
  );
};
