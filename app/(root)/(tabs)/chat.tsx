import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef(null);

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: inputText,
        sender: "user",
      };
      setMessages((prev) => [...prev, newMessage]);
      setInputText("");

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: "Got it!",
            sender: "collector",
          },
        ]);
      }, 1000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrapper}
        keyboardVerticalOffset={90}
      >
        <Text style={styles.header}>Chats</Text>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          ref={scrollRef}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === "user"
                  ? styles.userBubble
                  : styles.collectorBubble,
              ]}
            >
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.centeredInputWrapper}>
          <View style={styles.inputRow}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message"
              style={styles.input}
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 24,
    fontFamily: "JakartaBold",
    marginVertical: 16,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    marginVertical: 6,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
  },
  collectorBubble: {
    backgroundColor: "#e5e5ea",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
    color: "#000",
  },
  centeredInputWrapper: {
    justifyContent: "center",
    alignItems: "center",
    height: 120,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    width: "100%",
  },
  input: {
    flex: 1,
    height: 44,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#25D366",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default Chat;

