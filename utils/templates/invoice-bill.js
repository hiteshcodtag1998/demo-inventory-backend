
const invoiceBill = (data) => {
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data?.title || ""}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        table,
        th,
        td {
            border: 1px solid black;
        }

        th,
        td {
            padding: 10px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        div {
            margin-top: 1em;
        }
    </style>
</head>

<body>
    <div style="display: flex; justify-content: space-between">
        <h1>${data?.title || ""}</h1>
    </div>
    <span>Date: ${new Date().toLocaleDateString()}</span>
    <div style="display: flex; justify-content: space-between">
        ${data?.supplierName ? `<div>
            Supplier Name: ${data.supplierName}
        </div></>` : ""}
        <div>
            Warehouse Name: ${data?.storeName || ""}
        </div>
    </div>
    <div style="display: flex; justify-content: space-between">
        <div>
            Brand Name: ${data?.brandName || ""}
        </div>
        ${data?.referenceNo ? `
        <div>
            Reference No: ${data?.referenceNo || ""}
        </div>`
            : ""}
    </div>
    <div>
        <table>
            <thead>
                <tr style="font-weight: bold">
                    <th style="width: 40%">Product Name</th>
                    <th style="width: 10%; text-align: right">Qty</th>
                </tr>
            </thead>
            <tbody>

                <tr>
                    <td>${data?.productName || ""}</td>
                    <td style="text-align: right">${data?.qty || ""}</td>
                </tr>

            </tbody>
        </table>
    </div>
    <div style="display: flex; justify-content: space-between">
        ${data?.reason ? `<div>
            Reason: ${data.reason}
        </div></>` : ""}
    </div>
</body>

</html>`
}

module.exports = {
    invoiceBill
}

{/* <tr style="height: 5em; vertical-align: bottom">
                    <td></td>
                    <td></td>
                    <td style="font-weight: bold; text-align: right">Total</td>
                    <td style="text-align: right">{{ total }}$</td>
                </tr> */}