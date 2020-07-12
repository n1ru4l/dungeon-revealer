import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { QueryRenderer, requestSubscription } from "react-relay";
import { useRelayEnvironment } from "relay-hooks";
import { ConnectionHandler } from "relay-runtime";
import { ChatUserList } from "./chat-user-list";
import { ChatMessages } from "./chat-messages";
import { ChatSettings } from "./chat-settings";
import { chatSubscription } from "./__generated__/chatSubscription.graphql";
import { chatQuery } from "./__generated__/chatQuery.graphql";
import * as Button from "../button";
import * as HorizontalNavigation from "../horizontal-navigation";

import * as Icon from "../feather-icons";
import useSound from "use-sound";
import diceRollSound from "./dice-roll.mp3";
import notificationSound from "./notification.mp3";

import styled from "@emotion/styled/macro";
import { ChatTextArea } from "./chat-textarea";
import { chatUserUpdateSubscription } from "./__generated__/chatUserUpdateSubscription.graphql";
import { ChatOnlineUserIndicator } from "./chat-online-user-indicator";
import { isAbstractGraphQLMemberType } from "../relay-utilities";
import { chatMessageSoundSubscription } from "./__generated__/chatMessageSoundSubscription.graphql";
import { useSoundSettings } from "../sound-settings";

const AppSubscription = graphql`
  subscription chatSubscription {
    chatMessagesAdded {
      messages {
        id
        ...chatMessage_message
      }
    }
  }
`;

const ChatMessageSoundSubscription = graphql`
  subscription chatMessageSoundSubscription {
    chatMessagesAdded {
      messages {
        __typename
        ... on TextChatMessage {
          containsDiceRoll
        }
        ... on SharedResourceChatMessage {
          authorId
        }
        ... on UserChatMessage {
          authorId
        }
      }
    }
  }
`;

const UserUpdateSubscription = graphql`
  subscription chatUserUpdateSubscription {
    userUpdate {
      ... on UserRemoveUpdate {
        __typename
        userId
        usersCount
      }
      ... on UserAddUpdate {
        __typename
        user {
          id
          name
        }
        usersCount
      }
      ... on UserChangeUpdate {
        __typename
        user {
          id
          name
        }
      }
    }
  }
`;

const ChatQuery = graphql`
  query chatQuery {
    ...chatMessages_chat
    # TODO: move this stuff to own pagination/fragment container.
    ...chatUserList_data
    ...chatOnlineUserIndicator_data
    me {
      id
      ...chatSettings_data
    }
  }
`;

const ChatWindow = styled.div`
  padding: 12px;
  background-color: #fff;
  font-size: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const useChatSoundsAndUnreadCount = (chatState: "hidden" | "show") => {
  const [hasUnreadMessages, setHasUnreadMessages] = React.useState(false);
  const environment = useRelayEnvironment();
  const [playDiceRollSound] = useSound(diceRollSound, {
    volume: 0.5,
  });
  const [playNotificationSound] = useSound(notificationSound, {
    volume: 0.5,
  });
  const soundSettings = useSoundSettings();

  const refs = React.useRef({
    playDiceRollSound,
    playNotificationSound,
    chatState,
    soundSettings,
  });

  refs.current = {
    playDiceRollSound,
    playNotificationSound,
    chatState,
    soundSettings,
  };

  React.useEffect(() => {
    const subscription = requestSubscription<chatMessageSoundSubscription>(
      environment,
      {
        subscription: ChatMessageSoundSubscription,
        variables: {},
        onNext: (data) => {
          if (data) {
            let mode: "dice-roll-message" | "text-message" = "text-message";

            if (
              data.chatMessagesAdded.messages.some(
                (message) => message.containsDiceRoll === true
              )
            ) {
              mode = "dice-roll-message";
            }

            if (
              mode === "text-message" &&
              refs.current.soundSettings.value === "all"
            ) {
              refs.current.playNotificationSound();
            } else if (
              mode === "dice-roll-message" &&
              refs.current.soundSettings.value !== "none"
            ) {
              refs.current.playDiceRollSound();
            }

            if (refs.current.chatState === "hidden") {
              setHasUnreadMessages(true);
            }
          }
        },
      }
    );

    return () => subscription.dispose();
  }, [environment]);

  return [hasUnreadMessages, () => setHasUnreadMessages(false)] as [
    boolean,
    () => void
  ];
};

export const Chat: React.FC<{
  toggleShowDiceRollNotes: () => void;
}> = React.memo(({ toggleShowDiceRollNotes }) => {
  const [mode, setMode] = React.useState<"chat" | "user" | "settings">("chat");

  const environment = useRelayEnvironment();
  React.useEffect(() => {
    const subscription = requestSubscription<chatSubscription>(environment, {
      subscription: AppSubscription,
      variables: {},
      updater: (store, data) => {
        const chat = ConnectionHandler.getConnection(
          store.getRoot(),
          "chatMessages_chat"
        );

        const records = store
          .getRootField("chatMessagesAdded")
          ?.getLinkedRecords("messages");
        if (!chat || !records) return;

        for (const chatMessage of records) {
          const edge = ConnectionHandler.createEdge(
            store,
            chat,
            chatMessage,
            "ChatMessage"
          );
          ConnectionHandler.insertEdgeAfter(chat, edge);
        }
      },
    });
    return () => subscription.dispose();
  }, [environment]);

  React.useEffect(() => {
    const subscription = requestSubscription<chatUserUpdateSubscription>(
      environment,
      {
        subscription: UserUpdateSubscription,
        variables: {},
        updater: (store) => {
          const users = ConnectionHandler.getConnection(
            store.getRoot(),
            "chatUserList_users"
          );

          const updateRecord = store.getRootField("userUpdate");
          const root = store.getRoot();

          if (!users || !updateRecord) return;

          // see https://github.com/relay-tools/relay-compiler-language-typescript/issues/186
          if (isAbstractGraphQLMemberType(updateRecord, "UserAddUpdate")) {
            const edge = ConnectionHandler.createEdge(
              store,
              users,
              updateRecord.getLinkedRecord("user"),
              "User"
            );
            ConnectionHandler.insertEdgeAfter(users, edge);
            root.setValue(updateRecord.getValue("usersCount"), "usersCount");
          } else if (
            isAbstractGraphQLMemberType(updateRecord, "UserRemoveUpdate")
          ) {
            const userId = updateRecord.getValue("userId");
            ConnectionHandler.deleteNode(users, userId);
            root.setValue(updateRecord.getValue("usersCount"), "usersCount");
          }
        },
      }
    );
    return () => subscription.dispose();
  }, [environment]);

  const retryRef = React.useRef<null | (() => void)>(null);

  return (
    <>
      <QueryRenderer<chatQuery>
        query={ChatQuery}
        environment={environment}
        variables={{}}
        render={({ error, props, retry }) => {
          if (error) {
            return null;
          }
          if (!props) {
            return null;
          }
          retryRef.current = retry;

          return (
            <ChatWindow
              onContextMenu={(ev) => {
                ev.stopPropagation();
              }}
            >
              <HorizontalNavigation.Group>
                <HorizontalNavigation.Button
                  small
                  isActive={mode === "chat"}
                  fullWidth
                  onClick={() => setMode("chat")}
                >
                  <Icon.MessageCircleIcon height={12} width={12} />
                  <span>Chat</span>
                </HorizontalNavigation.Button>
                <HorizontalNavigation.Button
                  small
                  isActive={mode === "user"}
                  fullWidth
                  onClick={() => setMode("user")}
                >
                  <Icon.UsersIcon height={12} width={12} />
                  <span>
                    Users (<ChatOnlineUserIndicator data={props} />)
                  </span>
                </HorizontalNavigation.Button>
                <HorizontalNavigation.Button
                  small
                  isActive={mode === "settings"}
                  fullWidth
                  onClick={() => setMode("settings")}
                >
                  <Icon.SettingsIcon height={12} width={12} />
                  <span>Settings</span>
                </HorizontalNavigation.Button>
              </HorizontalNavigation.Group>
              <div style={{ height: 8 }} />
              {mode === "chat" ? (
                <>
                  <ChatMessages chat={props} />
                  <ChatTextArea />
                  <Button.Tertiary
                    small
                    onClick={toggleShowDiceRollNotes}
                    style={{ marginTop: 8 }}
                  >
                    <Icon.DiceIcon height={16} /> <span> Dice Roll Notes</span>
                  </Button.Tertiary>
                </>
              ) : mode === "user" ? (
                <div style={{ marginTop: 16 }}>
                  <ChatUserList data={props} />
                </div>
              ) : mode === "settings" ? (
                <div style={{ marginTop: 16 }}>
                  <ChatSettings data={props.me} />
                </div>
              ) : null}
            </ChatWindow>
          );
        }}
      />
    </>
  );
});
