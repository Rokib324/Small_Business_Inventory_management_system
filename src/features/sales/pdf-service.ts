import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";

let cachedRegularFontBase64: string | null = null;
let cachedBoldFontBase64: string | null = null;

function getEmbeddedFonts(): { regular: string; bold: string } {
  if (!cachedRegularFontBase64 || !cachedBoldFontBase64) {
    try {
      const regPath = path.join(process.cwd(), "public/fonts/NotoSansBengali-Regular.ttf");
      const boldPath = path.join(process.cwd(), "public/fonts/NotoSansBengali-Bold.ttf");
      cachedRegularFontBase64 = fs.readFileSync(regPath).toString("base64");
      cachedBoldFontBase64 = fs.readFileSync(boldPath).toString("base64");
    } catch {
      cachedRegularFontBase64 = "";
      cachedBoldFontBase64 = "";
    }
  }
  return { regular: cachedRegularFontBase64, bold: cachedBoldFontBase64 };
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browserInstance;
}

export interface GenerateInvoicePdfOptions {
  saleId: string;
  shopId: string;
  format?: "a4" | "thermal";
}

export async function generateInvoicePdf(options: GenerateInvoicePdfOptions): Promise<Buffer> {
  const { saleId, shopId, format = "a4" } = options;

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, shopId, deletedAt: null },
    include: {
      items: true,
      customer: true,
      shop: true,
      user: true,
    },
  });

  if (!sale) {
    throw new Error("চালান খুঁজে পাওয়া যায়নি (Invoice not found)");
  }

  const { regular, bold } = getEmbeddedFonts();

  const formattedDate = new Date(sale.createdAt).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = new Date(sale.createdAt).toLocaleTimeString("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isPaid = sale.duePoisha === 0;
  const isPartial = sale.paidPoisha > 0 && sale.duePoisha > 0;
  const statusLabel = isPaid ? "পরিশোধিত" : isPartial ? "আংশিক বাকি" : "সম্পূর্ণ বাকি";
  const statusColor = isPaid ? "#059669" : isPartial ? "#d97706" : "#dc2626";
  const statusBg = isPaid ? "#ecfdf5" : isPartial ? "#fffbeb" : "#fef2f2";

  const isThermal = format === "thermal";

  const rowsHtml = sale.items
    .map((item, index) => {
      return `
      <tr>
        <td style="text-align: center;">${toBanglaDigits(index + 1)}</td>
        <td style="font-weight: 600;">${item.productName}</td>
        <td style="text-align: center;">${toBanglaDigits(item.quantity)} ${item.unit}</td>
        <td style="text-align: right;">${formatMoneyBn(item.unitPricePoisha)}</td>
        <td style="text-align: right; font-weight: 600;">${formatMoneyBn(item.subtotalPoisha)}</td>
      </tr>
    `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>চালান - ${sale.invoiceNumber}</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Bengali';
      font-style: normal;
      font-weight: 400;
      src: url('data:font/truetype;charset=utf-8;base64,${regular}') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Bengali';
      font-style: normal;
      font-weight: 700;
      src: url('data:font/truetype;charset=utf-8;base64,${bold}') format('truetype');
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Noto Sans Bengali', system-ui, sans-serif;
      color: #18181b;
      background: #ffffff;
      padding: ${isThermal ? "10px" : "35px"};
      font-size: ${isThermal ? "12px" : "14px"};
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .header {
      border-bottom: 2px solid #059669;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .shop-title {
      font-size: ${isThermal ? "18px" : "24px"};
      font-weight: 700;
      color: #059669;
      margin-bottom: 4px;
    }
    .meta-box {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      color: ${statusColor};
      background: ${statusBg};
      border: 1px solid ${statusColor}40;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
    }
    .summary-table {
      width: ${isThermal ? "100%" : "340px"};
      margin-left: auto;
      margin-bottom: 20px;
    }
    .summary-table td {
      border: none;
      padding: 5px 8px;
    }
    .summary-total {
      font-size: 16px;
      font-weight: 700;
      border-top: 2px solid #059669 !important;
      border-bottom: 2px solid #059669 !important;
      color: #059669;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 15px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="shop-title">${sale.shop.name}</div>
      <div style="font-size: 12px; color: #475569;">
        ${sale.shop.address ? `ঠিকানা: ${sale.shop.address}<br>` : ""}
        ${sale.shop.phone ? `মোবাইল: ${sale.shop.phone}` : ""}
      </div>
    </div>
    <div style="text-align: right;">
      <div class="badge">${statusLabel}</div>
      <div style="margin-top: 6px; font-weight: 700; font-size: 15px;">চালান নং: ${sale.invoiceNumber}</div>
      <div style="font-size: 12px; color: #64748b;">${formattedDate} | ${formattedTime}</div>
    </div>
  </div>

  <div class="meta-box">
    <div>
      <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">ক্রেতার বিবরণ:</div>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${sale.customer ? sale.customer.name : "সাধারণ নগদ ক্রেতা"}</div>
      ${sale.customer?.phone ? `<div style="font-size: 12px; color: #475569;">মোবাইল: ${sale.customer.phone}</div>` : ""}
      ${sale.customer?.address ? `<div style="font-size: 12px; color: #475569;">ঠিকানা: ${sale.customer.address}</div>` : ""}
    </div>
    <div style="text-align: right;">
      <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">বিক্রয়কারী:</div>
      <div style="font-size: 13px; font-weight: 600;">${sale.user?.name || "দোকান প্রতিনিধি"}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">ক্র.</th>
        <th>বিবরণ</th>
        <th style="width: 90px; text-align: center;">পরিমাণ</th>
        <th style="width: 100px; text-align: right;">দর (৳)</th>
        <th style="width: 110px; text-align: right;">মোট (৳)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <table class="summary-table">
    <tr>
      <td style="color: #64748b;">উপ-মোট:</td>
      <td style="text-align: right; font-weight: 600;">${formatMoneyBn(sale.subtotalPoisha)}</td>
    </tr>
    ${
      sale.discountPoisha > 0
        ? `<tr>
      <td style="color: #16a34a;">ছাড় / ডিসকাউন্ট:</td>
      <td style="text-align: right; font-weight: 600; color: #16a34a;">- ${formatMoneyBn(sale.discountPoisha)}</td>
    </tr>`
        : ""
    }
    <tr class="summary-total">
      <td>সর্বমোট:</td>
      <td style="text-align: right;">${formatMoneyBn(sale.totalPoisha)}</td>
    </tr>
    <tr>
      <td style="color: #059669; font-weight: 600;">নগদ / পরিশোধ:</td>
      <td style="text-align: right; font-weight: 700; color: #059669;">${formatMoneyBn(sale.paidPoisha)}</td>
    </tr>
    ${
      sale.duePoisha > 0
        ? `<tr>
      <td style="color: #dc2626; font-weight: 700;">বর্তমান বকেয়া (বাকি):</td>
      <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatMoneyBn(sale.duePoisha)}</td>
    </tr>`
        : ""
    }
  </table>

  ${
    sale.notes
      ? `<div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; font-size: 12px; margin-bottom: 20px;">
    <strong>মন্তব্য:</strong> ${sale.notes}
  </div>`
      : ""
  }

  <div class="footer">
    <p>সততাই ব্যবসার মূলধন। আমাদের সাথে ব্যবসা করার জন্য ধন্যবাদ।</p>
    <p style="margin-top: 4px; font-size: 10px;">চালান প্রস্তুতকারক: বাকি (Baki) • www.baki.app</p>
  </div>
</body>
</html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluateHandle("document.fonts.ready");

    let pdfBuffer: Buffer;
    if (isThermal) {
      pdfBuffer = Buffer.from(
        await page.pdf({
          width: "80mm",
          printBackground: true,
          margin: { top: "5mm", right: "4mm", bottom: "5mm", left: "4mm" },
        })
      );
    } else {
      pdfBuffer = Buffer.from(
        await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
        })
      );
    }

    return pdfBuffer;
  } finally {
    await page.close();
  }
}
