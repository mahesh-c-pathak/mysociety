export const generateLiftChargesHtml = (
  societyName: string,
  chargesTitle: string,
  dueDate: string,
  payableAmount: number
) => `
    <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${chargesTitle} Invoice</title>
      <style>
          body {
              font-family: Arial, sans-serif;
          }
          .container {
              width: 80%;
              margin: 20px auto;
              border: 1px solid #000;
              padding: 20px;
          }
          .header, .footer {
              text-align: center;
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 20px;
          }
          .section {
              margin-bottom: 15px;
              font-size: 16px;
              font-weight: bold;
              text-align: center;
          }
          table {
              width: 100%;
              border-collapse: collapse;
          }
          table, th, td {
              border: 1px solid black;
          }
          th, td {
              padding: 8px;
              text-align: left;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">${societyName}<br>Pune</div>
          <div class="section">${chargesTitle}</div>
          <table>
              <tr>
                  <td>GSTIN: NA</td>
                  <td>INVOICE DATE: 03-02-2025</td>
              </tr>
              <tr>
                  <td>PAN No.: NA</td>
                  <td>INVOICE NO.: BILL/4382/24-25</td>
              </tr>
              <tr>
                  <td>REVERSE CHARGE: N.A.</td>
                  <td>DUE DATE: ${dueDate}</td>
              </tr>
              <tr>
                  <td colspan="2">PAYABLE AMOUNT: ${payableAmount.toFixed(
                    2
                  )}</td>
              </tr>
          </table>
          <br>
          <table>
              <tr>
                  <td>INVOICE TO: Mahesh Pathak</td>
                  <td>FLAT NO.: B1-603</td>
              </tr>
              <tr>
                  <td>ADDRESS: Pune</td>
                  <td>FLAT AREA: 1.0 Sqft</td>
              </tr>
              <tr>
                  <td>MOBILE NO.: 9730667309</td>
                  <td>E-MAIL: mahesh.c.pathak@gmail.com</td>
              </tr>
          </table>
          <br>
          <table>
              <tr>
                  <th>Description of Services</th>
                  <th>Units</th>
                  <th>SAC Code</th>
                  <th>Rate (INR)</th>
                  <th>Amount Payable (INR)</th>
              </tr>
              <tr>
                  <td>${chargesTitle}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>${payableAmount.toFixed(2)}</td>
                  <td>${payableAmount.toFixed(2)}</td>
              </tr>
              <tr>
                  <td>CGST @9%</td>
                  <td colspan="3"></td>
                  <td>0.00</td>
              </tr>
              <tr>
                  <td>SGST @9%</td>
                  <td colspan="3"></td>
                  <td>0.00</td>
              </tr>
              <tr>
                  <td>Current Bill Amount (INR)</td>
                  <td colspan="3"></td>
                  <td>${payableAmount.toFixed(2)}</td>
              </tr>
              <tr>
                  <td>Last month’s outstanding (INR)</td>
                  <td colspan="3"></td>
                  <td>0.00</td>
              </tr>
              <tr>
                  <td>Cheque Dishonor Charges (INR)</td>
                  <td colspan="3"></td>
                  <td>0.00</td>
              </tr>
              <tr>
                  <td>Payable Amount (INR)</td>
                  <td colspan="3"></td>
                  <td>${payableAmount.toFixed(2)}</td>
              </tr>
          </table>
          <p>Amount in words: ${convertAmountToWords(payableAmount)} Only</p>
          <div class="footer">${societyName}<br>Authorized Signatory</div>
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
