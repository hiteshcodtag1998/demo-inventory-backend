
const invoiceBill = () => {
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice</title>
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
            margin-top: 7em;
        }
    </style>
</head>

<body>
    <h1>Invoice {{ invoiceNumber }}</h1>
    <div style="display: flex; justify-content: space-between">
        <div>
            {{#companyDetails}} {{ . }}<br /> {{/companyDetails}}
        </div>
        <div>
            {{#customerDetails}} {{ . }}<br /> {{/customerDetails}}
        </div>
    </div>

    <div>
        <table>
            <thead>
                <tr style="font-weight: bold">
                    <th style="width: 40%">Item</th>
                    <th style="width: 20%; text-align: right">Price per unit</th>
                    <th style="width: 10%; text-align: right">Qty</th>
                    <th style="width: 20%; text-align: right">Price</th>
                </tr>
            </thead>
            <tbody>
                {{#items}}
                <tr>
                    <td>{{ item }}</td>
                    <td style="text-align: right">{{ pricePerUnit }}$</td>
                    <td style="text-align: right">{{ quantity }}</td>
                    <td style="text-align: right">{{ price }}$</td>
                </tr>
                {{/items}}
                <tr style="height: 5em; vertical-align: bottom">
                    <td></td>
                    <td></td>
                    <td style="font-weight: bold; text-align: right">Total</td>
                    <td style="text-align: right">{{ total }}$</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>

</html>`
}

module.exports = {
    invoiceBill
}