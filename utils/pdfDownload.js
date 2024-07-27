const pdf = require('html-pdf');
const path = require('path');

// Get the path to the locally installed PhantomJS binary
const phantomPath = require('phantomjs-prebuilt').path;

const generatePDFfromHTML = (htmlContent, res) => {
    const options = { format: 'Letter', phantomPath };

    // Generate PDF from HTML content
    pdf.create(htmlContent, options).toBuffer((err, buffer) => {
        if (err) {
            console.error('Error generating PDF:', err);
            return res.status(500).send('Error generating PDF');
        }

        // Set response headers for PDF content
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');

        // Send the generated PDF as the response
        res.send(buffer);
    });
};

module.exports = {
    generatePDFfromHTML
};
