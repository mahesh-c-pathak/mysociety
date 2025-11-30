import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import {
  collectionGroup,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useSociety } from "@/utils/SocietyContext";

export default function ExcelGenerator() {
  const { societyName } = useSociety();
  // const customFlatsBillsSubcollectionName = `${societyName} bills`;
  const customFlatsBillsSubcollectionName = "flatbills";

  // ✅ STATE to store fetched bills
  const [billsForExcel, setBillsForExcel] = useState<any[]>([]);

  const [unpaidBillsForExcel, setUnpaidBillsForExcell] = useState<any[]>([]);
  const [paidBillsForExcel, setPaidBillsForExcell] = useState<any[]>([]);

  const [unclearedBalance, setUnclearedBalance] = useState<any[]>([]);
  const [memberReceipt, setMemberReceipt] = useState<any[]>([]);
  const [memberRefund, setMemberRefund] = useState<any[]>([]);
  const [memberAdvance, setMemberAdvance] = useState<any[]>([]);

  const [flatInfoMapState, setFlatInfoMapState] = useState<
    Map<string, { flatNo: string; name: string; contact: string }>
  >(new Map());

  const unclearedBalanceSubcollectionName = "unclearedBalances";

  useEffect(() => {
    const fetchForExcel = async () => {
      try {
        type FlatInfo = {
          flatNo: string;
          name: string;
          contact: string;
        };

        const unclearedBalanceQuery = query(
          collectionGroup(db, unclearedBalanceSubcollectionName),
          where("societyName", "==", societyName),
          where("status", "==", "Cleared") // ✅ Only fetch docs with status = "Cleared"
        );

        const customFlatsBillsSubcollectionNameQuery = query(
          collectionGroup(db, customFlatsBillsSubcollectionName),
          where("societyName", "==", societyName)
        );

        // 1️⃣ Query all balance docs for society, newest first
        const flatCurrentBalanceQuery = query(
          collectionGroup(db, "flatCurrentBalance"),
          where("societyName", "==", societyName),
          orderBy("date", "desc") // important!
        );

        // Step 1: Fetch both flats and bills in parallel
        const [
          flatsSnapshot,
          billsSnapshot,
          unclearedBalanceQuerySnapshot,
          flatCurrentBalanceSnapshot,
        ] = await Promise.all([
          getDocs(collectionGroup(db, `${societyName} flats`)),
          getDocs(customFlatsBillsSubcollectionNameQuery),
          getDocs(unclearedBalanceQuery),
          getDocs(flatCurrentBalanceQuery),
        ]);

        // Step 2: Build Flat Info Map
        const flatInfoMap = new Map<string, FlatInfo>();

        flatsSnapshot.forEach((doc) => {
          const flatData = doc.data();
          if (!flatData) return;

          const flatType = flatData.flatType?.toLowerCase();
          if (flatType === "dead") return;

          const segments = doc.ref.path.split("/");
          const wing = segments[3];
          const flatNo = segments[7];
          const key = `${wing}_${flatNo}`;

          const userDetails = flatData.userDetails || {};
          const entries = Object.entries(userDetails) as [
            string,
            {
              userName?: string;
              userEmail?: string;
              userStatus?: string;
              userType?: string;
            },
          ][];

          let approvedUsers = entries.filter(
            ([, userInfo]) => userInfo.userStatus === "Approved"
          );

          if (flatType === "rent") {
            approvedUsers = approvedUsers.filter(
              ([, userInfo]) => userInfo.userType?.toLowerCase() === "renter"
            );
          }

          const [, userInfo] = approvedUsers[0] || [];
          const name = userInfo?.userName || "";
          const contact = userInfo?.userEmail || "";

          flatInfoMap.set(key, { flatNo: `${wing} ${flatNo}`, name, contact });

          // ✅ Save for reuse
          setFlatInfoMapState(flatInfoMap);
        });

        // Step 3: Combine with bills
        const result = billsSnapshot.docs.map((doc) => {
          const billData = doc.data();
          const segments = doc.ref.path.split("/");
          const wing = segments[3];
          const flatNo = segments[7];
          const flatKey = `${wing}_${flatNo}`;

          const flatInfo =
            flatInfoMap.get(flatKey) ||
            ({
              flatNo: `${wing} ${flatNo}`,
              name: "",
              contact: "",
            } as FlatInfo);

          let monthLabel = "Unknown";
          if (billData.startDate) {
            const d = new Date(billData.startDate);
            monthLabel = `${d.toLocaleString("default", { month: "short" })}-${d.getFullYear()}`;
          }

          return {
            month: monthLabel,
            flatNo: flatInfo.flatNo,
            name: flatInfo.name,
            contact: flatInfo.contact,
            billName: billData.name || "",
            totalDue: Number(billData.amount || 0),
            billStatus: billData.status || "",
            billStartDate: billData.startDate,
          };
        });

        // ✅ Save fetched data in state
        setBillsForExcel(result);

        // ✅ Split unpaid and paid bills
        const unpaid = result.filter(
          (b) => b.billStatus?.toLowerCase() === "unpaid"
        );
        const paid = result.filter(
          (b) => b.billStatus?.toLowerCase() === "paid"
        );

        setUnpaidBillsForExcell(unpaid);
        setPaidBillsForExcell(paid);

        // Process Creared Balances

        const unclearedBalanceList: any[] = [];
        const memberReceiptList: any[] = [];
        const memberRefundList: any[] = [];
        const memberAdvanceList: any[] = [];

        unclearedBalanceQuerySnapshot.forEach((doc) => {
          const unclearedBalanceData = doc.data();
          const unclearedBalanceId = doc.id;

          const docPath = doc.ref.path;
          const pathSegments = docPath.split("/");
          const wing = pathSegments[3];
          const flatNumber = pathSegments[7];

          const flatKey = `${wing}_${flatNumber}`;
          const flatInfo = flatInfoMap.get(flatKey); // ✅ Get name from flatInfoMap

          const entry = {
            flatNo: `${wing} ${flatNumber}`,
            name: flatInfo?.name || "", // ✅ ADDED NAME HERE
            type: unclearedBalanceData.type,
            amount: unclearedBalanceData.amountReceived,
            voucherNumber: unclearedBalanceData.voucherNumber,
            paymentDate: unclearedBalanceData.paymentReceivedDate,
            ledgerAccount: unclearedBalanceData.ledgerAccount,
            ledgerAccountGroup: unclearedBalanceData.ledgerAccountGroup,
            paymentMode: unclearedBalanceData.paymentMode,
            selectedIds: unclearedBalanceData.selectedIds ?? [], // Default to an empty array if undefined,
            transactionId: unclearedBalanceId,
            selectedBills: unclearedBalanceData.selectedBills ?? [],
            status: unclearedBalanceData.status,
            note: unclearedBalanceData.note,
            bankName: unclearedBalanceData.bankName,
            chequeNo: unclearedBalanceData.chequeNo,
          };

          // Push to main uncleared balance list
          unclearedBalanceList.push(entry);
          // ✅ If type is "Bill Settlement", also push to memberReceipt
          if (unclearedBalanceData.type === "Bill Settlement") {
            memberReceiptList.push(entry);
          }
          // ✅ If type is "Refund", also push to memberRefundList
          if (unclearedBalanceData.type === "Refund") {
            memberRefundList.push(entry);
          }
        });
        setUnclearedBalance(unclearedBalanceList);
        setMemberReceipt(memberReceiptList);
        setMemberRefund(memberRefundList);

        // Set Member Advance to Current Balance
        // ✅ Process Member Advance from flatCurrentBalanceSnapshot
        const latestBalancePerFlat: Record<string, any> = {};
        flatCurrentBalanceSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const wing = data.wing; // ✅ coming from Firestore doc field
          const flatNo = data.flat; // ✅ coming from Firestore doc field
          if (!wing || !flatNo) return; // safety check

          const flatKey = `${wing}_${flatNo}`;
          // ✅ Keep ONLY the first doc (query is ordered by date desc)
          if (!latestBalancePerFlat[flatKey]) {
            const flatInfo = flatInfoMap.get(flatKey);

            latestBalancePerFlat[flatKey] = {
              flatNo: `${wing} ${flatNo}`,
              name: flatInfo?.name || "",
              amount: data.cumulativeBalance ?? 0, // Advance amount
              date: data.date,
            };
          }
        });
        // ✅ Convert map to array for Excel sheet
        setMemberAdvance(Object.values(latestBalancePerFlat));

        // console.log("✅ latestBalancePerFlat:", latestBalancePerFlat);
      } catch (error) {
        console.log("❌ error in fetchForExcel", error);
      }
    };

    fetchForExcel();
  }, [customFlatsBillsSubcollectionName, societyName]);

  const generateExcel = async () => {
    if (billsForExcel.length === 0) {
      alert("Data still loading... try again");
      return;
    }
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // ========== SHEET 1: Maintenance Bill Summary ==========

      const billSummaryMap = billsForExcel.reduce((acc, bill) => {
        const key = `${bill.startDate}_${bill.billName}`;

        if (!acc[key]) {
          acc[key] = {
            date: bill.billStartDate, // use startDate
            billName: bill.billName,
            totalPaid: 0,
            totalDue: 0,
            paidCount: 0,
            unpaidCount: 0,
          };
        }

        if (bill.billStatus === "paid") {
          acc[key].totalPaid += bill.totalDue;
          acc[key].paidCount += 1;
        } else {
          acc[key].totalDue += bill.totalDue;
          acc[key].unpaidCount += 1;
        }

        return acc;
      }, {});

      const maintenanceRows = Object.values(billSummaryMap).map((b: any) => [
        b.date,
        b.billName,
        b.totalPaid,
        b.totalDue,
        b.paidCount,
        b.unpaidCount,
      ]);

      const maintenanceTotals = [
        "TOTAL",
        "",
        maintenanceRows.reduce((a: any, r: any) => a + r[2], 0),
        maintenanceRows.reduce((a: any, r: any) => a + r[3], 0),
        maintenanceRows.reduce((a: any, r: any) => a + r[4], 0),
        maintenanceRows.reduce((a: any, r: any) => a + r[5], 0),
      ];

      const maintenanceData = [
        [
          "Date",
          "Bill Name",
          "Total Payment Received",
          "Total Payment Dues",
          "Paid Members Count",
          "UnPaid Members Count",
        ],
        ...maintenanceRows,
        maintenanceTotals,
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(maintenanceData);
      XLSX.utils.book_append_sheet(wb, ws1, "Maintenance Bill Summery");

      // ========== SHEET 2: Members Receipt ==========
      const ws2 = XLSX.utils.aoa_to_sheet([
        [
          "Receipt No.",
          "Payment Date",
          "Flat No.",
          "Name",
          "Amount",
          "Payment By",
          "Payment Notes",
          "Receiver Name",
          "Bank Name",
          "Cheque Number",
          "Custom Receipt",
        ],
      ]);
      XLSX.utils.book_append_sheet(wb, ws2, "Members Receipt");

      // ========== SHEET 3: Settlement Receipts ==========
      const ws3 = XLSX.utils.aoa_to_sheet([
        [
          "Receipt No.",
          "Invoice No.",
          "Flat No.",
          "Name",
          "Invoice Amount",
          "Settlement Amount",
          "Settlement Date",
          "Receipt Date",
          "Invoice Date",
          "Payment By",
          "Payment Notes",
          "Receiver Name",
          "Bank Name",
          "Cheque Number",
          "Custom Receipt",
        ],
      ]);
      XLSX.utils.book_append_sheet(wb, ws3, "Settlement Receipts");

      // ========== SHEET 4: Members Dues By Monthwise ==========

      // Group bills by month & flat
      const monthFlatMap = unpaidBillsForExcel.reduce((acc, bill) => {
        if (!acc[bill.month]) acc[bill.month] = {};
        if (!acc[bill.month][bill.flatNo]) {
          acc[bill.month][bill.flatNo] = {
            name: bill.name || "",
            contact: bill.contact || "",
            bills: [],
            total: 0,
          };
        }

        acc[bill.month][bill.flatNo].bills.push(bill.billName);
        acc[bill.month][bill.flatNo].total += bill.totalDue;

        return acc;
      }, {});

      let grandTotal = 0;

      const sheet4Rows = [
        ["Month", "Flat No", "Name", "Contact", "Bill Name", "Total Due"],
      ];

      Object.keys(monthFlatMap).forEach((month) => {
        // Month header row
        sheet4Rows.push([month, "", "", "", "", ""]);

        Object.keys(monthFlatMap[month]).forEach((flat) => {
          const f = monthFlatMap[month][flat];

          const billNames = f.bills.join("\n"); // multi-line in same cell

          sheet4Rows.push([
            "", // blank under Month
            flat,
            f.name,
            f.contact,
            billNames,
            f.total,
          ]);

          grandTotal += f.total;
        });
      });

      // Add Total row
      sheet4Rows.push(["Total", "", "", "", "", String(grandTotal)]);

      const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows);

      // enable wrap text for bill names column
      Object.keys(ws4)
        .filter((c) => c.startsWith("E")) // column E = Bill Name
        .forEach((cell) => {
          if (!ws4[cell].s) ws4[cell].s = {};
          ws4[cell].s = { alignment: { wrapText: true } };
        });

      XLSX.utils.book_append_sheet(wb, ws4, "Members Dues By Monthwise");

      // ========== SHEET 5: Total Dues by Memberwise ==========
      const ws5Data = [
        ["Flat No.", "Name", "Contact", "Bill Name - Amount", "Total Due"],
        ...billsForExcel.map((b) => [
          b.flatNo,
          b.name,
          b.contact,
          `${b.billName} - ${b.totalDue}`,
          b.totalDue,
        ]),
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
      XLSX.utils.book_append_sheet(wb, ws5, "Total Dues by Memberwise");

      // ========== SHEET 6: Bill Details ==========

      const monthBillFlatMap = billsForExcel.reduce((acc, bill) => {
        if (!acc[bill.month]) acc[bill.month] = {};
        if (!acc[bill.month][bill.flatNo]) {
          acc[bill.month][bill.flatNo] = {
            name: bill.name || "",
            contact: bill.contact || "",
            bills: [],
            total: 0,
          };
        }

        acc[bill.month][bill.flatNo].bills.push(bill.billName);
        acc[bill.month][bill.flatNo].total += bill.totalDue;

        return acc;
      }, {});

      let grandBillTotal = 0;

      const sheet6Rows = [
        ["Month", "Flat No", "Name", "Contact", "Bill Name", "Total Due"],
      ];

      Object.keys(monthBillFlatMap).forEach((month) => {
        // Month header row
        sheet6Rows.push([month, "", "", "", "", ""]);

        Object.keys(monthBillFlatMap[month]).forEach((flat) => {
          const f = monthBillFlatMap[month][flat];

          const billNames = f.bills.join("\n"); // multi-line in same cell

          sheet6Rows.push([
            "", // blank under Month
            flat,
            f.name,
            f.contact,
            billNames,
            f.total,
          ]);

          grandBillTotal += f.total;
        });
      });

      // Add Total row
      sheet6Rows.push(["Total", "", "", "", "", String(grandBillTotal)]);

      const ws6 = XLSX.utils.aoa_to_sheet(sheet6Rows);

      XLSX.utils.book_append_sheet(wb, ws6, "Bill Details");

      // ========== SHEET 7: Member Refund ==========
      const ws7 = XLSX.utils.aoa_to_sheet([
        [
          "Receipt No.",
          "Payment Date",
          "Flat No.",
          "Name",
          "Amount",
          "Payment By",
          "Payment Notes",
          "Bank Name",
          "Cheque Number",
          "Custom Receipt",
        ],
        ...memberRefund.map((r) => [
          r.voucherNumber,
          r.paymentDate,
          r.flatNo,
          r.name,
          r.amount,
          r.ledgerAccount, // Payment By
          r.note || "", // ✅ Use actual field if exists
          r.bankName || "", // ✅ Use actual field if exists
          r.chequeNo || "", // ✅ Use actual field if exists
          r.customReceipt || "", // ✅ Use actual field if exists
        ]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws7, "Member Refund");

      // ========== SHEET 8: Member Advance ==========

      const sheet8Data = [
        ["Flat No.", "Name", "Advance Amount"],
        ...memberAdvance.map((a) => {
          return [
            a.flatNo, // Flat No
            a.name || "", // ✅ Get Name from flatInfoMapState
            a.amount ?? "", // Advance Amount
          ];
        }),
      ];

      const ws8 = XLSX.utils.aoa_to_sheet(sheet8Data);
      XLSX.utils.book_append_sheet(wb, ws8, "Member Advance");

      // Convert to base64 and save
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      const fileUri = FileSystem.cacheDirectory + "SocietyReport.xlsx";
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Share Society Excel Report",
      });

      console.log("✅ Excel generated and shared successfully!");
    } catch (error) {
      console.error("❌ Error generating Excel:", error);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        margin: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Button mode="contained" onPress={generateExcel}>
        Generate Excel Report
      </Button>
    </View>
  );
}
