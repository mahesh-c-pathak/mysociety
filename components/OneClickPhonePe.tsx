import React from "react";
import { View, Button, StyleSheet } from "react-native";
import PhonePePaymentSDK from "react-native-phonepe-pg";
import base64 from "react-native-base64";
import SHA256 from "crypto-js/sha256";
import { useRouter } from "expo-router";
import { db } from "@/firebaseConfig";
import { collection, doc, setDoc } from "firebase/firestore";

type OneClickPhonePeProps = {
  mobile: string;
  amount: number; // in INR
  buttonTitle?: string;
  selectedIds?: string; // pass as stringified JSON
  selectedBills?: string; // pass as stringified JSON
  flatRef?: string;
  societyName?: string;
};

const OneClickPhonePe: React.FC<OneClickPhonePeProps> = ({
  mobile,
  amount,
  buttonTitle = "Pay with PhonePe",
  selectedIds,
  selectedBills,
  flatRef,
  societyName,
}) => {
  const router = useRouter();

  // Config
  const environment = "SANDBOX";
  const merchantId = "PGTESTPAYUAT86";
  const appId = "Mahesh";
  const enableLogging = true;
  const saltKey = "96434309-7796-489d-8924-ab56988a6076";
  const saltIndex = 1;
  const callbackUrl = "mysociety://payment-callback";

  const generateTransactionId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `T${timestamp}${random}`;
  };

  const checkOrderStatus = async (merchantTransactionId: string) => {
    try {
      const path = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
      const stringToHash = path + saltKey;
      const checksum = SHA256(stringToHash).toString() + `###${saltIndex}`;

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

      // ✅ Save entire JSON response to Firestore
      if (societyName) {
        const paymentRef = doc(
          collection(
            db,
            "Societies",
            societyName,
            `phonePePayments_${societyName}`
          ),
          merchantTransactionId
        );
        await setDoc(paymentRef, {
          ...json,
          selectedIds: selectedIds ? JSON.parse(selectedIds) : [], // ✅ array in Firestore
          flatRef,
          timestamp: new Date(),
        });
      }

      if (json.success && json.code === "PAYMENT_SUCCESS") {
        // Pass selectedIds and selectedBills to success page
        router.replace({
          pathname: "/admin/phonepe/success",
          params: {
            selectedIds,
            selectedBills,
            flatRef,
            societyName,
            merchantTransactionId: merchantTransactionId.toString(),
          },
        });
      } else if (json.code === "PAYMENT_PENDING") {
        router.replace("/admin/phonepe/pending");
      } else {
        router.replace("/admin/phonepe/failure");
      }
    } catch (err) {
      console.log("Order status error:", err);
      router.replace("/admin/phonepe/failure");
    }
  };

  const startPayment = () => {
    PhonePePaymentSDK.init(environment, merchantId, appId, enableLogging)
      .then(() => {
        const merchantTransactionId = generateTransactionId();
        console.log("amount entered", amount);

        const requestBody = {
          merchantId,
          merchantTransactionId,
          merchantUserId: "",
          amount: amount * 100, // PhonePe expects paise
          mobileNumber: mobile,
          callbackUrl,
          paymentInstrument: { type: "PAY_PAGE" },
        };

        const payload = base64.encode(JSON.stringify(requestBody));
        const checksum =
          SHA256(payload + "/pg/v1/pay" + saltKey).toString() +
          `###${saltIndex}`;

        PhonePePaymentSDK.startTransaction(payload, checksum, null, null)
          .then(() => {
            checkOrderStatus(merchantTransactionId);
          })
          .catch((err) => console.log("Transaction error:", err));
      })
      .catch((err) => console.log("SDK init error:", err));
  };

  return (
    <View style={styles.container}>
      <Button title={buttonTitle} onPress={startPayment} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});

export default OneClickPhonePe;
