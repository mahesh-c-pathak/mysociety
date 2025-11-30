import React, { useEffect, useState } from "react";
import { Text, Button, ScrollView, Alert, View } from "react-native";
import { getFunctions, httpsCallable } from "firebase/functions";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

const TestEmail = () => {
  const [base64Logo, setBase64Logo] = useState<string | null>(null);
  const functions = getFunctions();
  const sendEmail = httpsCallable(functions, "sendEmail");

  const run = async (payload: any) => {
    try {
      const res: any = await sendEmail(payload);
      Alert.alert("Success", res.data?.message || "Sent!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // ❤️ SIMPLE REUSABLE FUNCTION
  const toBase64 = async (imagePath: any) => {
    // Load asset first
    const asset = Asset.fromModule(imagePath);
    await asset.downloadAsync(); // ensures local file available

    // Now read actual file from device
    return await FileSystem.readAsStringAsync(asset.localUri!, {
      encoding: FileSystem.EncodingType.Base64,
    });
  };

  // Convert zebra logo to Base64 on load
  useEffect(() => {
    const load = async () => {
      try {
        const b64 = await toBase64(
          require("../../assets/images/extracted_header.png")
        );
        setBase64Logo(b64);
      } catch (err) {
        console.log("Base64 load error:", err);
      }
    };

    load();
  }, []);

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Test Emails</Text>

      {/* 1. SIMPLE EMAIL */}
      <View style={{ marginBottom: 12 }}>
        <Button
          title="Send Simple Email"
          onPress={() =>
            run({
              societyName: "Happy Home",
              to: "mahesh.c.pathak@gmail.com",
              subject: "Simple Email Test",
              text: "This is a plain text email.",
              attachments: [
                {
                  filename: "test.txt",
                  content: "Hello from attachment!",
                },
              ],
            })
          }
        />
      </View>

      {/* 2. HTML EMAIL */}
      <View style={{ marginBottom: 12 }}>
        <Button
          title="Send HTML Email"
          onPress={() =>
            run({
              societyName: "Happy Home",
              to: "mahesh.c.pathak@gmail.com",
              subject: "HTML Email Test",
              html: "<h1>Hello!</h1><p>This is a <b>HTML</b> email.</p>",
            })
          }
        />
      </View>

      {/* 3. HANDLEBARS TEMPLATE EMAIL */}
      <View style={{ marginBottom: 12 }}>
        <Button
          title="Send Template Email"
          onPress={() =>
            run({
              societyName: "Happy Home",
              to: "mahesh.c.pathak@gmail.com",
              subject: "Template Email Test",
              templateName: "welcome.hbs",
              templateData: {
                name: "John",
                date: "15 Nov 2025",
              },
            })
          }
        />
      </View>

      {/* 4. PDF ATTACHED EMAIL */}
      <View style={{ marginBottom: 12 }}>
        <Button
          title="Send PDF Email"
          onPress={() =>
            run({
              societyName: "Happy Home",
              to: "mahesh.c.pathak@gmail.com",
              subject: "PDF Email Test",
              text: "See PDF attached.",
              generatePdf: {
                filename: "report.pdf",
                content: "This is the PDF content from the app.",
              },
            })
          }
        />
      </View>

      {/* 5. INLINE IMAGE EMAIL */}
      <View style={{ marginBottom: 12 }}>
        <Button
          title="Send Inline Image Email"
          onPress={() => {
            if (!base64Logo) {
              Alert.alert("Wait", "Logo not loaded yet!");
              return;
            }

            run({
              societyName: "Happy Home",
              to: "mahesh.c.pathak@gmail.com",
              subject: "Inline Image Test",
              html: `<h1>Hello</h1><img src="cid:myimage" />`,
              inlineImages: [
                {
                  filename: "logo.png",
                  cid: "myimage",
                  base64: base64Logo,
                  contentType: "image/png",
                },
              ],
            });
          }}
        />
      </View>

      {/* 6. MANUAL ATTACHMENT EMAIL */}
      <View style={{ marginBottom: 12 }}>
        <Button
          title="Send Attachment Email"
          onPress={() =>
            run({
              societyName: "Happy Home",
              to: "mahesh.c.pathak@gmail.com",
              subject: "Attachment Email Test",
              text: "See attachment.",
              attachments: [
                {
                  filename: "hello.txt",
                  content: "Hello, world!",
                  contentType: "text/plain",
                },
              ],
            })
          }
        />
      </View>

      {/* 7. CC + BCC */}
      <View style={{ marginBottom: 12 }}>
        <Button
          title="Send CC + BCC Email"
          onPress={() =>
            run({
              societyName: "Happy Home",
              to: "mahesh.c.pathak@gmail.com",
              cc: "usha.mahesh.pathak@gmail.com",
              bcc: "myhousingsociety3112@gmail.com",
              subject: "CC + BCC Test",
              text: "This email has CC and BCC.",
            })
          }
        />
      </View>

      {/* 8. payment-success.hbs */}
      <View style={{ marginBottom: 12 }}>
        <Button
          title="Send Payment Success Email"
          onPress={async () => {
            try {
              await sendEmail({
                to: "mahesh.c.pathak@gmail.com",
                subject: "Payment Successful",
                templateName: "payment-success.hbs",

                templateData: {
                  name: "Mahesh",
                  amount: 1500,
                  chargeType: "Maintenance Fee",
                  paymentDate: "2025-11-21",
                  flat: "B-203",
                  societyName: "MyHousing Society",
                  supportPhone: "+91-9000000000",
                  supportEmail: "support@myhousing.com",
                },

                societyName: "MyHousing Society",

                inlineImages: [
                  {
                    filename: "header.png",
                    cid: "headerImage",
                    contentType: "image/png",
                  },
                  {
                    filename: "phone.png",
                    cid: "phoneIcon",
                    contentType: "image/png",
                  },
                  {
                    filename: "email.png",
                    cid: "emailIcon",
                    contentType: "image/png",
                  },
                ],
              });

              Alert.alert("Success", "Email has been sent.");
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          }}
        />
      </View>
    </ScrollView>
  );
};

export default TestEmail;
