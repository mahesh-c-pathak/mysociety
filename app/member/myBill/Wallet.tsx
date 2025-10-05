import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Appbar, Card, Text, Divider, Avatar } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSociety } from "@/utils/SocietyContext";

import { db } from "@/firebaseConfig";
import { collection, getDocs, doc,  query, where,  orderBy, limit } from "firebase/firestore";

const Wallet = () => {
  const router = useRouter();
    const { source } = useLocalSearchParams();
    const localParams = useLocalSearchParams();
    const societyContext = useSociety();
    const [totalDue, setTotalDue] = useState(0);
    
    
    // Determine params based on source
    const societyName =
      source === "Admin" ? localParams.societyName : societyContext.societyName;
    const wing =
      source === "Admin" ? localParams.wing : societyContext.wing;
    const flatNumber =
      source === "Admin" ? localParams.flatNumber : societyContext.flatNumber;
    const floorName =
      source === "Admin" ? localParams.floorName : societyContext.floorName;
  
    const [myStatementData, setMyStatementData] = useState<any>([]);
    const [currentBalance, setCurrentBalance] = useState<number>(0);
    const [unclearedBalance, setUnclearedBalance] = useState<number>(0); // NEW STATE

    const customWingsSubcollectionName = `${societyName} wings`;
    const customFloorsSubcollectionName = `${societyName} floors`;
    const customFlatsSubcollectionName = `${societyName} flats`;
    const customFlatsBillsSubcollectionName = `${societyName} bills`;
    const unclearedBalanceSubcollectionName = `unclearedBalances_${societyName}`

    useEffect(() => {
        fetchBills();
      }, []);

      const fetchBills = async () => {
        try {
          // Construct Firestore references
          const flatRef = `Societies/${societyName}/${customWingsSubcollectionName}/${wing}/${customFloorsSubcollectionName}/${floorName}/${customFlatsSubcollectionName}/${flatNumber}`;
          const flatDocRef = doc(db, flatRef);
          const dateString = new Date().toISOString().split('T')[0];
          
          const billsCollectionRef = collection(flatDocRef, customFlatsBillsSubcollectionName);
          const unclearedBalanceRef = collection(flatDocRef, unclearedBalanceSubcollectionName);
          const currentBalanceSubcollectionName = `currentBalance_${flatNumber}`
          const currentBalanceSubcollection = collection(flatDocRef, currentBalanceSubcollectionName);
          const currentBalancequery = query(currentBalanceSubcollection, where("date", "<=", dateString), orderBy("date", "desc"), limit(1));
      
          // Fetch both collections in parallel
          const [unclearedSnapshot, billsSnapshot, currentBalancesnapshot] = await Promise.all([
            getDocs(unclearedBalanceRef),
            getDocs(billsCollectionRef),
            getDocs(currentBalancequery)
          ]);

          // set current balance
          if (!currentBalancesnapshot.empty) {
            const data = currentBalancesnapshot.docs[0].data();
            setCurrentBalance(data.cumulativeBalance);  // Use cumulativeBalance or default to 0
          }
      
          let totalUnclearedBalance = 0;
          let totalUnpaidDue = 0;
          const balanceData: any[] = [];
          const billsData: any[] = [];
      
          // Process Uncleared Balance Data
          unclearedSnapshot.forEach((doc) => {
            const docData = doc.data();
            const { status, type, voucherNumber, paymentReceivedDate, amount, amountPaid } = docData;
      
            if (status === "Cleared") {
              balanceData.push({
                id: `${voucherNumber}- ${type}` || `${Math.random()}`, // Ensure ID is unique,
                title: type === "Refund" ? "Refund Money" : "Add Money",
                dueDate: paymentReceivedDate,
                amount,
                type,
              });
            } else if (status === "Uncleared") {
              totalUnclearedBalance += amountPaid || 0;
            }
          });
      
          // Process Bills Data
          billsSnapshot.forEach((doc) => {
            const docData = doc.data();
            const { status, amount = 0, voucherNumber, name, paymentDate } = docData;
      
            if (status === "unpaid") {
              totalUnpaidDue += amount; // Accumulate unpaid dues
            } else if (status === "paid") {
              billsData.push({
                id: voucherNumber || `${voucherNumber}-${Math.random()}`, // Ensure ID is unique,,
                title: `Paid bill for ${name}`,
                dueDate: paymentDate,
                amount,
                status,
                type: "Paid bill",
              });
            }
          });
      
          // Update states
          setUnclearedBalance(totalUnclearedBalance);
          setTotalDue(totalUnpaidDue);
          setMyStatementData([...billsData, ...balanceData]);
      
        } catch (error) {
          console.error("Error fetching bills and balance data:", error);
        }
      };
      

     

  // Render each item in the statement
    const renderStatementItem = ({ item }: { item: any }) => (
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/member/myBill/WalletDetails",
            params: { 
              source,
              societyName,
              wing,
              flatNumber,
              floorName,
              item: JSON.stringify(item) 
            }, // Pass item as a string
          })
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              <Text
                style={[
                  styles.amount,
                  { color: item.title === "Add Money" ? "green" : "red" },
                ]}
              >
                ₹{item.amount.toFixed(2)}
              </Text>
            </View>
            <Text style={styles.dueDate}>{item.dueDate}</Text>
          </Card.Content>
          <Divider />
        </Card>
      </TouchableOpacity>
    );
    



 

  return (
    <View style={styles.container}>
        {/* Appbar */}
      <Appbar.Header style={[styles.header, { backgroundColor: source === "Admin" ? "#6200ee" : "#2196F3" },]}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="Wallet" titleStyle={styles.titleStyle} />
      </Appbar.Header>

        <View style={[styles.headerContainer, { backgroundColor: source === "Admin" ? "#6200ee" : "#2196F3" },]}> 
          {/* Profile Header */}
        {source === "Admin" && (
          <View style={styles.profileContainer}>
            <Avatar.Text size={44} label="XD" style={[styles.avatar, { backgroundColor: source === "Admin" ? "#6200ee" : "#2196F3" } ]} />
            <View style={styles.textContainer}>
              <Text style={styles.profileText}>{`${wing} ${flatNumber}`}</Text>
            </View>
          </View>
        )}

        {/* Balance Summary */}

          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryTitle}>Current Balance</Text>
              <Text style={[styles.summaryValue, { color: "green" }]}>
                ₹{currentBalance.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryTitle}>Uncleared Balance</Text>
              <Text style={[styles.summaryValue, { color: "red" }]}>
                ₹{unclearedBalance.toFixed(2)}
              </Text>
            </View>
            
          </View>

          {/* Add Money  Actions */}
          {source !== "Admin" && (
            <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push({
                pathname: "/member/myBill/MakePayments", 
                params: {
                  totalDue: totalDue.toFixed(2),
                  currentBalance: currentBalance.toFixed(2),
                  unclearedBalance: unclearedBalance.toFixed(2),
                },
              })}
            >
              <Text style={styles.actionText}>Add Money</Text>
            </TouchableOpacity>
            </View>
          )}
      </View>   

      <FlatList
              data={myStatementData}
              renderItem={renderStatementItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                        <Text style={styles.emptyMessage}>
                          No Wallet Transactions yet
                        </Text>
                      }
            />

    </View>
  )
}

export default Wallet

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: { backgroundColor: "#2196F3" },
  titleStyle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerContainer:{backgroundColor: "#2196F3",},
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    marginBottom: 5,
    elevation: 2,
  },
  summaryItem: {
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    width:150,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  card: {
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dueDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  list: {
    padding: 10,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#2196F3",
    padding: 10,
  },
  actionButton: {
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "bold",
    paddingHorizontal:10,    
  },
  emptyMessage: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginVertical: 20,
  },
  profileContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10 },
  profileText: { fontSize: 14, color: "white" },
  textContainer: { justifyContent: "center" },
  avatar: { backgroundColor: "#2196F3", marginRight: 10, borderColor: "#fff", borderWidth: 2 },
  
})