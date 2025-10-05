export const billGeneratedHtml = (
  societyName: string,
  wing: string,
  flatNumber: string,
  userName: string,
  chargesTitle: string,
  payableAmount: number,
  dueDate: string
) => `
     <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>New Bill Raised</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header img {
            max-width: 100px;
            margin-bottom: 10px;
        }
        .header h2 {
            margin: 0;
            font-size: 22px;
            font-weight: bold;
            color: #333;
        }
        .content {
            font-size: 16px;
            color: #333;
            line-height: 1.6;
        }
        .content b {
            font-weight: bold;
        }
        .highlight {
            font-weight: bold;
        }
        .due-date {
            font-weight: bold;
            color: #333;
        }
        .footer {
            font-size: 14px;
            color: #777;
            margin-top: 20px;
        }
        .invoice-link a {
            color: #0073aa;
            text-decoration: none;
            font-weight: bold;
        }
        .invoice-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h2>New Bill Raised</h2>
        </div>
        <div class="content">
            <p>Dear ${userName},</p> 
            <p>Your society <b>${societyName}</b>, has released a bill for your apartment <b>${wing}-${flatNumber}</b>. Please find the details below:</p>
            <p>
                <b>Bill type:</b> <span class="highlight">${chargesTitle}</span><br>
                <b>Bill Amount:</b> ₹ ${payableAmount.toFixed(2)}<br>
                
            </p>
            <p><b>Due date:</b> <span class="due-date">${dueDate}</span></p>
            <p>Failing to pay before the due date will incur a penalty, if applicable.</p>
        </div>
        <div class="footer">
            <p>Please connect with the society office in case of queries.</p>
        </div>
    </div>
</body>
</html>

    `;

/**
 * Helper function to convert numbers to words
 */
const convertAmountToWords = (amount: number): string => {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });

  return formatter.format(amount);
};
