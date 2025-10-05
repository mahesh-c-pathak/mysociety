export const addaHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            border: 1px solid #ddd;
            box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(to right, #3b82f6, #60a5fa);
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 20px;
            font-weight: bold;
        }
        .content {
            margin-top: 20px;
        }
        .receipt-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
        }
        .info {
            font-size: 14px;
            line-height: 1.5;
        }
        .table-container {
            margin-top: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .total {
            font-weight: bold;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            text-align: center;
            color: gray;
        }
    </style>
</head>
<body>
    <div class="header">New Happy Home Chs</div>
    <div class="content">
        <p class="info">This is a system generated email. Please do not reply to this email. For any queries please raise a Helpdesk ticket through <a href="#">ADDA App</a>.</p>
        <p class="receipt-title">RECEIPT</p>
        <p class="info"><strong>New Happy Home Chs</strong><br>
        New happy CHS LTD, plot no 03 sector 48 Nerul, Navi Mumbai 400706, Navi Mumbai-400706</p>
        <p class="info"><strong>Receipt No:</strong> 657<br>
        <strong>Date:</strong> 03-11-2024</p>
        <p class="info">Received ( ₹ Two Thousand Two Hundred and Nineteen only ) from <strong>SUSHMA SINGARE</strong> of Unit <strong>Block 104</strong></p>
        <div class="table-container">
            <table>
                <tr>
                    <th>ACCOUNT APPLIED</th>
                    <th>#BILL NO & Date</th>
                    <th>AMOUNT</th>
                </tr>
                <tr>
                    <td>Non Occupancy Charges</td>
                    <td>927 01-11-2024</td>
                    <td>₹189.00</td>
                </tr>
                <tr>
                    <td>Property Tax</td>
                    <td>927 01-11-2024</td>
                    <td>₹140.00</td>
                </tr>
                <tr>
                    <td>Maintenance Fee (Nov 2024)</td>
                    <td>927 01-11-2024</td>
                    <td>₹1,890.00</td>
                </tr>
                <tr class="total">
                    <td colspan="2">Total</td>
                    <td>₹2,219.00</td>
                </tr>
            </table>
        </div>
        <p class="info"><strong>Payment Instrument:</strong> Online Payment<br>
        <strong>Instrument Bank:</strong> ADDA Payment Gateway<br>
        <strong>Reference No.:</strong> NHH10222691</p>
    </div>
    <div class="footer">
        Transaction is Successful.<br>
        Electronically Generated, does not require Signature.
    </div>
</body>
</html>


`;
