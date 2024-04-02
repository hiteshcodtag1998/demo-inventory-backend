const puppeteer = require('puppeteer');

const generatePDFfromHTML = async (htmlContent, res) => {
    // // Create a new jsPDF instance
    // const doc = new jsPDF();

    // // Split the HTML content into lines based on newline characters
    // const lines = doc.splitTextToSize(htmlContent, doc.internal.pageSize.width - 20);

    // // Set initial y position
    // let yPosition = 10;

    // // Loop through lines and add them to the PDF
    // lines.forEach((line, index) => {
    //     // Add the line to the current page
    //     doc.text(line, 10, yPosition);

    //     // Increase y position for the next line
    //     yPosition += 10;

    //     // Check if a new page is needed
    //     if (yPosition >= doc.internal.pageSize.height - 10) {
    //         // Add a new page
    //         doc.addPage();
    //         // Reset y position for the new page
    //         yPosition = 10;
    //     }
    // });

    // console.log('PDF generated successfully');

    // // Set response headers for PDF content
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');

    // // Send the generated PDF as the response
    // res.send(doc.output());

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set content to the HTML
    await page.setContent(htmlContent);

    // Capture screenshot as PDF
    const pdfBuffer = await page.pdf();

    // Close browser
    await browser.close();

    // Set response headers for PDF content
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');

    // Send the generated PDF as the response
    res.send(pdfBuffer);
}

module.exports = {
    generatePDFfromHTML
}
