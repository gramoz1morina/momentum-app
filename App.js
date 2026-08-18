import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hej Momentum</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06151C",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FCFCFC",
    fontSize: 24,
    fontWeight: "700",
  },
});