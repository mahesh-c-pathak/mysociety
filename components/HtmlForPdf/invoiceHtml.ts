export const invoiceHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #000;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f4f4f4;
      }
      .group {
        font-weight: bold;
      }
      .subgroup {
        padding-left: 20px;
      }
      .total {
        font-weight: bold;
      }
      .amount {
        text-align: right;
      }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          <th>Liabilities</th>
          <th class="amount">Amount</th>
          <th>Assets</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="group">Capital Account</td>
          <td></td>
          <td class="group">Accounts Receivable</td>
          <td></td>
        </tr>
        <tr>
          <td class="subgroup">Reserve and surplus</td>
          <td class="amount">0.00</td>
          <td class="subgroup">Club House Income Receivables</td>
          <td class="amount">-14.00</td>
        </tr>
        <tr>
          <td></td>
          <td></td>
          <td class="subgroup">Donation Received Receivables</td>
          <td class="amount">-3.00</td>
        </tr>
        <tr>
          <td class="group">Current Liabilities</td>
          <td></td>
          <td class="subgroup">Electricity Income Collection Receivables</td>
          <td class="amount">6.00</td>
        </tr>
        <tr>
          <td class="subgroup">Members advanced</td>
          <td class="amount">0.00</td>
          <td class="group">Bank Accounts</td>
          <td></td>
        </tr>
        <tr>
          <td class="group">Reserve and Surplus</td>
          <td></td>
          <td class="subgroup">Bank</td>
          <td class="amount">23.00</td>
        </tr>
        <tr>
          <td class="group">Cash in Hand</td>
          <td></td>
          <td class="subgroup">Cash</td>
          <td class="amount">-509.00</td>
        </tr>
        <tr>
          <td class="total">Total Amount</td>
          <td class="amount total">-509.00</td>
          <td class="total">Total Amount</td>
          <td class="amount total">-497.00</td>
        </tr>
      </tbody>
    </table>
  </body>
  </html>
`;
