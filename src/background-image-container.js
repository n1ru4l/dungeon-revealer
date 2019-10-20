import React from "react";
import styled from "@emotion/styled/macro";

export const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;

  color: white;
  background-image: url("/images/DungeonEntranceMedium.jpg");
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
  background-size: cover;
`;

const Inner = styled.div`
  min-height: 40vh;
`;

export const BackgroundImageContainer = ({ children }) => {
  return (
    <Container>
      <Inner>{children}</Inner>
    </Container>
  );
};