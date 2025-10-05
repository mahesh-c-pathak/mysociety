import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import {
  Appbar,
  Button,
  Text,
  TextInput as PaperInput,
  Checkbox,
} from "react-native-paper";
import { useLocalSearchParams } from "expo-router";

const MemberDetails: React.FC = () => {
  const { wing, flatNumber, flatType } = useLocalSearchParams();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    mobileNumber: "",
    email: "",
    adultMembersCount: "0",
    childMembersCount: "0",
    address: "",
    billingDetails: {
      copyAsAbove: false,
      billingName: "",
      billingEmail: "",
      billingMobileNumber: "",
      billingAddress: "",
    },
    area: "",
    gstNumber: "",
    mobileNumber2: "",
    businessType: "",
    work: "",
  });

  const handleCheckboxChange = () => {
    setFormData((prev) => ({
      ...prev,
      billingDetails: {
        ...prev.billingDetails,
        copyAsAbove: !prev.billingDetails.copyAsAbove,
        ...(prev.billingDetails.copyAsAbove
          ? {}
          : {
              billingName: prev.firstName + " " + prev.lastName,
              billingEmail: prev.email,
              billingMobileNumber: prev.mobileNumber,
              billingAddress: prev.address,
            }),
      },
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBillingInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      billingDetails: {
        ...prev.billingDetails,
        [field]: value,
      },
    }));
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => {}} />
        <Appbar.Content title="Add Member" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.flatNumber}>Flat Number: {wing} {flatNumber} {flatType}</Text>

        {/* Personal Details */}
        <PaperInput
          label="First Name"
          value={formData.firstName}
          onChangeText={(value) => handleInputChange("firstName", value)}
          style={styles.input}
        />
        <PaperInput
          label="Last Name"
          value={formData.lastName}
          onChangeText={(value) => handleInputChange("lastName", value)}
          style={styles.input}
        />
        <View style={styles.row}>
          <TextInput
            editable={false}
            value="91"
            style={[styles.input, styles.countryCode]}
          />
          <PaperInput
            label="Mobile Number"
            value={formData.mobileNumber}
            onChangeText={(value) => handleInputChange("mobileNumber", value)}
            style={[styles.input, styles.mobileInput]}
          />
        </View>
        <PaperInput
          label="Email (optional)"
          value={formData.email}
          onChangeText={(value) => handleInputChange("email", value)}
          style={styles.input}
        />
        <PaperInput
          label="Adult Members Count"
          value={formData.adultMembersCount}
          onChangeText={(value) =>
            handleInputChange("adultMembersCount", value)
          }
          keyboardType="numeric"
          style={styles.input}
        />
        <PaperInput
          label="Child Members Count"
          value={formData.childMembersCount}
          onChangeText={(value) =>
            handleInputChange("childMembersCount", value)
          }
          keyboardType="numeric"
          style={styles.input}
        />
        <PaperInput
          label="Address (optional)"
          value={formData.address}
          onChangeText={(value) => handleInputChange("address", value)}
          style={styles.input}
          multiline
        />

        {/* Billing Details */}
        <Text style={styles.sectionHeader}>Billing Details</Text>
        <View style={styles.checkboxContainer}>
          <Checkbox
            status={
              formData.billingDetails.copyAsAbove ? "checked" : "unchecked"
            }
            onPress={handleCheckboxChange}
          />
          <Text style={styles.checkboxLabel}>Copy as Above</Text>
        </View>
        <PaperInput
          label="Billing Name"
          value={formData.billingDetails.billingName}
          onChangeText={(value) =>
            handleBillingInputChange("billingName", value)
          }
          style={styles.input}
        />
        <PaperInput
          label="Billing Email"
          value={formData.billingDetails.billingEmail}
          onChangeText={(value) =>
            handleBillingInputChange("billingEmail", value)
          }
          style={styles.input}
        />
        <View style={styles.row}>
          <TextInput
            editable={false}
            value="91"
            style={[styles.input, styles.countryCode]}
          />
          <PaperInput
            label="Billing Mobile Number"
            value={formData.billingDetails.billingMobileNumber}
            onChangeText={(value) =>
              handleBillingInputChange("billingMobileNumber", value)
            }
            style={[styles.input, styles.mobileInput]}
          />
        </View>
        <PaperInput
          label="Billing Address (optional)"
          value={formData.billingDetails.billingAddress}
          onChangeText={(value) =>
            handleBillingInputChange("billingAddress", value)
          }
          style={styles.input}
          multiline
        />
        <PaperInput
          label="Area in Square Feet (optional)"
          value={formData.area}
          onChangeText={(value) => handleInputChange("area", value)}
          keyboardType="numeric"
          style={styles.input}
        />
        <PaperInput
          label="GST Number (optional)"
          value={formData.gstNumber}
          onChangeText={(value) => handleInputChange("gstNumber", value)}
          style={styles.input}
        />

        {/* Other Details */}
        <Text style={styles.sectionHeader}>Other Details (optional)</Text>
        <View style={styles.row}>
          <TextInput
            editable={false}
            value="91"
            style={[styles.input, styles.countryCode]}
          />
          <PaperInput
            label="Mobile Number 2"
            value={formData.mobileNumber2}
            onChangeText={(value) => handleInputChange("mobileNumber2", value)}
            style={[styles.input, styles.mobileInput]}
          />
        </View>
        <PaperInput
          label="Business Type"
          value={formData.businessType}
          onChangeText={(value) => handleInputChange("businessType", value)}
          style={styles.input}
        />
        <PaperInput
          label="Work"
          value={formData.work}
          onChangeText={(value) => handleInputChange("work", value)}
          style={styles.input}
        />

        {/* Save Button */}
        <Button
          mode="contained"
          style={styles.saveButton}
          onPress={() => console.log("Save", formData)}
        >
          Save
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 16,
  },
  flatNumber: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryCode: {
    width: 50,
    marginRight: 8,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
  },
  mobileInput: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  saveButton: {
    marginTop: 16,
  },
});

export default MemberDetails;


