import { StyleSheet, Text, View, TextInput, Button } from "react-native";
import React, { useState } from "react";
import PhonePePaymentSDK from "react-native-phonepe-pg";
import base64 from "react-native-base64";
import SHA256 from "crypto-js/sha256";
import { useRouter } from "expo-router";

export default function Phonepe() {
  const [data, setData] = useState({ mobile: "", amount: "" });
  const [enviornment] = useState("SANDBOX");
  const [merchantId] = useState("PGTESTPAYUAT86");
  const router = useRouter();
  const [appId] = useState("Mahesh");
  const [enableLogging] = useState(true);

  const salt_key = "96434309-7796-489d-8924-ab56988a6076";
  const salt_Index = 1;

  const generateTransactionId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `T${timestamp}${random}`;
  };

  // 🔹 Call Order Status API
  const checkOrderStatus = async (merchantTransactionId: string) => {
    try {
      const path = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
      const stringToHash = path + salt_key;
      const checksum = SHA256(stringToHash).toString() + "###" + salt_Index;

      const res = await fetch(
        `https://api-preprod.phonepe.com/apis/pg-sandbox${path}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": checksum,
            "X-MERCHANT-ID": merchantId,
          },
        }
      );

      const json = await res.json();
      console.log("Order Status Response:", json);

      if (json.success && json.code === "PAYMENT_SUCCESS") {
        router.replace("/admin/phonepe/success");
      } else if (json.code === "PAYMENT_PENDING") {
        router.replace("/admin/phonepe/pending");
      } else {
        router.replace("/admin/phonepe/failure");
      }
    } catch (err) {
      console.log("Order status error:", err);
    }
  };

  const SubmitHandler = () => {
    PhonePePaymentSDK.init(enviornment, merchantId, appId, enableLogging)
      .then(() => {
        const merchantTransactionId = generateTransactionId();

        const requestBody = {
          merchantId,
          merchantTransactionId,
          merchantUserId: "",
          amount: parseFloat(data.amount) * 100,
          mobileNumber: data.mobile,
          callbackUrl: "mysociety://payment-callback",
          paymentInstrument: { type: "PAY_PAGE" },
        };

        const payload = JSON.stringify(requestBody);
        const payload_main = base64.encode(payload);
        const string = payload_main + "/pg/v1/pay" + salt_key;
        const checksum = SHA256(string).toString() + "###" + salt_Index;

        PhonePePaymentSDK.startTransaction(payload_main, checksum, null, null)
          .then((resp) => {
            console.log("Transaction started:", resp);

            // 🔹 Always check order status after transaction
            if (merchantTransactionId) {
              checkOrderStatus(merchantTransactionId);
            }
          })
          .catch((err) => console.log("Transaction error:", err));
      })
      .catch((err) => console.log("SDK init error:", err));
  };

  return (
    <View style={styles.container}>
      <Text>PhonePe Sandbox Payment</Text>
      <TextInput
        placeholder="Enter Mobile Number"
        onChangeText={(text) => setData({ ...data, mobile: text })}
        style={styles.textfield}
      />
      <TextInput
        placeholder="Enter Amount"
        onChangeText={(text) => setData({ ...data, amount: text })}
        style={styles.textfield}
      />
      <Button title="Pay" onPress={SubmitHandler} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  textfield: {
    padding: 15,
    borderColor: "black",
    borderWidth: 1,
    width: "90%",
  },
});
