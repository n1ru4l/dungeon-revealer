import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as CANNON from "cannon";
import * as DICE from "@n1ru4l/threejs-dice";

import styled from "@emotion/styled/macro";
import { IEventBus } from "./event-bus";

const AbsoluteFullscreenContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

export type IDice = {
  type: "D4" | "D6" | "D8" | "D10" | "D12" | "D20";
  result: number;
  color: string;
};

export type IDiceRoller = {
  rollDice: (input: IDice[]) => Promise<unknown>;
};

export type IDiceRollerEventBus = IEventBus<{
  dice: IDice[];
  done?: () => any;
}>;

export const DiceOverlay: React.FC<{
  eventBus: IDiceRollerEventBus;
}> = ({ eventBus }) => {
  const rendererReference = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!rendererReference.current) return;

    const world = new CANNON.World();
    world.gravity.set(0, -9.82 * 20, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 16;

    const diceManager = new DICE.DiceManager(world);

    var SCREEN_WIDTH = window.innerWidth,
      SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 50,
      ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
      NEAR = 0.01,
      FAR = 2000;
    const camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

    camera.position.set(0, 50, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 10, 0);

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererReference.current.appendChild(renderer.domElement);

    let directionalLight = new THREE.DirectionalLight("#ffffff", 0.0001);
    directionalLight.position.x = window.innerWidth / 2;
    directionalLight.position.y = window.innerHeight / 2;
    directionalLight.position.z = 500;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xefdfd5, 0.6);
    ambientLight.position.y = 100;
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xefdfd5, 0.4);
    spotLight.position.y = 100;
    spotLight.target.position.set(0, 0, 0);
    spotLight.castShadow = true;
    spotLight.shadow.camera.near = 50;
    spotLight.shadow.camera.far = 110;
    spotLight.shadow.mapSize.width = window.innerWidth / 2;
    spotLight.shadow.mapSize.height = window.innerHeight / 2;
    scene.add(spotLight);

    let floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: diceManager.floorBodyMaterial
    });

    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );

    world.addBody(floorBody);

    const createDice = (dice: IDice) => {
      console.log(dice);
      switch (dice.type) {
        case "D4":
          return diceManager.createDice(DICE.DiceD4, {
            size: 1.5,
            backColor: dice.color
          });
        case "D6":
          return diceManager.createDice(DICE.DiceD6, {
            size: 1.5,
            backColor: dice.color
          });
        case "D8":
          return diceManager.createDice(DICE.DiceD8, {
            size: 1.5,
            backColor: dice.color
          });
        case "D10":
          return diceManager.createDice(DICE.DiceD10, {
            size: 1.5,
            backColor: dice.color
          });
        case "D12":
          return diceManager.createDice(DICE.DiceD12, {
            size: 1.5,
            backColor: dice.color
          });
        case "D20":
          return diceManager.createDice(DICE.DiceD20, {
            size: 1.5,
            backColor: dice.color
          });
        default:
          throw new Error("ayay");
      }
    };

    const setDiceStartPosition = (
      diceInstance: DICE.DiceObject<number[]>,
      i: number
    ) => {
      let yRand = () => Math.random() * 20;
      let pos = () => (Math.random() - 0.5) * 3;
      const diceObject = diceInstance.getObject();
      diceObject.position.x = -20 - (i % 3) * (1.5 + pos());
      diceObject.position.y = 2 + Math.floor(i / 3) * (1.5 + pos());
      diceObject.position.z = -20 + (i % 3) * (1.5 + pos());
      diceObject.quaternion.x = ((Math.random() * 90 - 45) * Math.PI) / 180;
      diceObject.quaternion.z = ((Math.random() * 90 - 45) * Math.PI) / 180;
      diceInstance.updateBodyFromMesh();
      let rand = () => Math.random() * 5;
      diceInstance.objectBody.velocity.set(
        25 + rand(),
        40 + yRand(),
        15 + rand()
      );
      diceInstance.objectBody.angularVelocity.set(
        20 * Math.random() - 10,
        20 * Math.random() - 10,
        20 * Math.random() - 10
      );
    };

    let animatedDice: {
      dice: DICE.DiceObject<number[]>;
      value: number;
    }[] = [];

    eventBus.on(({ dice, done }) => {
      animatedDice.forEach(({ dice }) => {
        scene.remove(dice.getObject() as any);
        dice.destroy();
      });

      const diceValues = dice.map((dice, index) => {
        const diceInstance = createDice(dice);
        setDiceStartPosition(diceInstance, index);
        const diceObject = diceInstance.getObject();
        // @ts-ignore
        scene.add(diceObject);

        return {
          dice: diceInstance,
          value: dice.result
        };
      });
      animatedDice = diceValues;
      diceManager.prepareValues(diceValues, done, done);
    });

    requestAnimationFrame(animate);

    function animate() {
      updatePhysics();
      render();
      requestAnimationFrame(animate);
    }

    function updatePhysics() {
      world.step(1.0 / 60.0);

      for (let { dice } of animatedDice) {
        dice.updateMeshFromBody();
      }
    }

    function render() {
      renderer.render(scene, camera);
    }
  }, []);

  return (
    <AbsoluteFullscreenContainer
      // @ts-ignore
      ref={rendererReference}
    ></AbsoluteFullscreenContainer>
  );
};
