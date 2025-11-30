import {
  STANDARD_FLEX,
  INFO_FONT_SIZE,
  HEADING_FONT_SIZE,
  BUTTON_HEIGHT,
  BUTTON_LABEL_SIZE,
} from "@/constants/constants";
import { StyleSheet } from "react-native";
import { scale } from "react-native-size-matters";

// Creating styles
const phoneAuthStyles = StyleSheet.create({
  mainWrapper: {
    flex: STANDARD_FLEX,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  contentWrapper: {
    width: "95%",
    padding: scale(15),
    elevation: scale(2),
    alignItems: "center",
    borderRadius: scale(5),
    justifyContent: "center",
    backgroundColor: "#C9DEFE",
  },
  actionHeading: {
    color: "#5B6576",
    fontWeight: "bold",
    fontSize: HEADING_FONT_SIZE,
  },
  actionInfo: {
    color: "#5B6576",
    fontWeight: "500",
    fontSize: INFO_FONT_SIZE,
    marginVertical: scale(10),
  },
  button: {
    elevation: scale(3),
    flexDirection: "row",
    alignItems: "center",
    height: BUTTON_HEIGHT,
    borderRadius: scale(5),
    justifyContent: "center",
    backgroundColor: "#45B04E",
    paddingHorizontal: scale(15),
  },
  buttonLabel: {
    color: "#fff",
    fontWeight: "700",
    marginStart: scale(5),
    letterSpacing: scale(1),
    textTransform: "uppercase",
    fontSize: BUTTON_LABEL_SIZE,
  },
  webView: {
    flex: STANDARD_FLEX,
  },
});

// Exporting styles
export default phoneAuthStyles;
