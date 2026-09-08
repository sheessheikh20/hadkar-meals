package com.hadkarmeals.service;

import com.hadkarmeals.dto.MonthlyBillResponse;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;

@Service
public class PdfBillService {

    private final BillingService billingService;

    public PdfBillService(BillingService billingService) {
        this.billingService = billingService;
    }

    public byte[] generateBillPdf(Long studentId, String monthYear) {
        MonthlyBillResponse bill = billingService.getStudentBill(studentId, monthYear);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Colors
            Color primaryColor = new Color(220, 38, 38); // Red-600 warm food accent
            Color darkColor = new Color(30, 41, 59);    // Slate-800
            Color lightGray = new Color(241, 245, 249); // Slate-100

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, primaryColor);
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 11, darkColor);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, darkColor);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, darkColor);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, darkColor);

            // Header Section
            Paragraph brand = new Paragraph("HADKAR MEALS", titleFont);
            brand.setAlignment(Element.ALIGN_CENTER);
            document.add(brand);

            Paragraph tagline = new Paragraph("Fresh Meals. Every Day. \u2022 Ghar Ka Khana, Hostel Tak.", subtitleFont);
            tagline.setAlignment(Element.ALIGN_CENTER);
            tagline.setSpacingAfter(15);
            document.add(tagline);

            // Invoice Title Bar
            PdfPTable titleTable = new PdfPTable(2);
            titleTable.setWidthPercentage(100);
            titleTable.setWidths(new float[]{1, 1});

            PdfPCell c1 = new PdfPCell(new Phrase("MONTHLY TIFFIN INVOICE", headingFont));
            c1.setBorder(Rectangle.NO_BORDER);
            c1.setBackgroundColor(lightGray);
            c1.setPadding(8);
            titleTable.addCell(c1);

            PdfPCell c2 = new PdfPCell(new Phrase("Billing Month: " + bill.getMonthYear(), boldFont));
            c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
            c2.setBorder(Rectangle.NO_BORDER);
            c2.setBackgroundColor(lightGray);
            c2.setPadding(8);
            titleTable.addCell(c2);

            titleTable.setSpacingAfter(15);
            document.add(titleTable);

            // Student & Hostel Info
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{1, 1});

            PdfPCell sInfo = new PdfPCell();
            sInfo.setBorder(Rectangle.NO_BORDER);
            sInfo.addElement(new Paragraph("Billed To:", boldFont));
            sInfo.addElement(new Paragraph(bill.getStudentName(), headingFont));
            sInfo.addElement(new Paragraph("Phone: " + bill.getPhoneNumber(), normalFont));
            sInfo.addElement(new Paragraph("Service Location: " + bill.getHostelName(), normalFont));
            infoTable.addCell(sInfo);

            PdfPCell bInfo = new PdfPCell();
            bInfo.setHorizontalAlignment(Element.ALIGN_RIGHT);
            bInfo.setBorder(Rectangle.NO_BORDER);
            bInfo.addElement(new Paragraph("Service Details:", boldFont));
            bInfo.addElement(new Paragraph("Hadkar Meals Kitchen", normalFont));
            bInfo.addElement(new Paragraph("Helpline: +91 98765 43210", normalFont));
            bInfo.addElement(new Paragraph("Status: " + bill.getStatus(), boldFont));
            infoTable.addCell(bInfo);

            infoTable.setSpacingAfter(20);
            document.add(infoTable);

            // Billing Items Table
            PdfPTable billTable = new PdfPTable(2);
            billTable.setWidthPercentage(100);
            billTable.setWidths(new float[]{3, 1});

            addTableHeader(billTable, "Description", boldFont, lightGray);
            addTableHeader(billTable, "Amount (₹)", boldFont, lightGray);

            addRow(billTable, "Daily Dinner Tiffin Charges", "₹ " + bill.getFoodCharges(), normalFont);
            addRow(billTable, "Extra Charges (Rotis, Curd, Rice, Sweets, etc.)", "₹ " + bill.getExtraCharges(), normalFont);
            addRow(billTable, "Previous Outstanding Balance Carried Forward", "₹ " + bill.getPreviousBalance(), normalFont);
            addRow(billTable, "Total Bill Amount", "₹ " + bill.getTotalAmount(), boldFont);
            addRow(billTable, "Total Amount Paid / Settled", "₹ " + bill.getPaidAmount(), normalFont);

            // Outstanding Row (Highlighted)
            PdfPCell outLabelCell = new PdfPCell(new Phrase("NET OUTSTANDING BALANCE", boldFont));
            outLabelCell.setPadding(8);
            outLabelCell.setBackgroundColor(new Color(254, 226, 226)); // Red-100
            billTable.addCell(outLabelCell);

            PdfPCell outAmtCell = new PdfPCell(new Phrase("₹ " + bill.getOutstandingBalance(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, primaryColor)));
            outAmtCell.setPadding(8);
            outAmtCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            outAmtCell.setBackgroundColor(new Color(254, 226, 226));
            billTable.addCell(outAmtCell);

            billTable.setSpacingAfter(25);
            document.add(billTable);

            // Payment Instructions
            Paragraph paymentTitle = new Paragraph("Payment Information & Instructions", boldFont);
            paymentTitle.setSpacingAfter(5);
            document.add(paymentTitle);

            Paragraph p1 = new Paragraph("\u2022 UPI ID: hadkarmeals@okaxis (Scan or transfer directly)", normalFont);
            Paragraph p2 = new Paragraph("\u2022 Please share payment screenshot via WhatsApp to +91 98765 43210 for instant ledger update.", normalFont);
            Paragraph p3 = new Paragraph("\u2022 Thank you for enjoying healthy, home-style meals with Hadkar Meals!", subtitleFont);
            p3.setSpacingBefore(10);

            document.add(p1);
            document.add(p2);
            document.add(p3);

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Error generating PDF bill", e);
        }

        return out.toByteArray();
    }

    private void addTableHeader(PdfPTable table, String text, Font font, Color bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(6);
        table.addCell(cell);
    }

    private void addRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, font));
        c1.setPadding(6);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(value, font));
        c2.setPadding(6);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(c2);
    }
}
