import * as functions from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// Generate PDF as Buffer
async function generatePDF(content: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: any[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.text(content, {align: 'left'});
    doc.end();
  });
}

// ---------------------------------------------------
// 🔹 Load Handlebars template safely
// ---------------------------------------------------
function loadTemplate(templateName: string): string {
  const templatePath = path.resolve(__dirname, `./templates/${templateName}`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

// ---------------------------------------------------
// Load inline image from /communication/assets
// ---------------------------------------------------
function loadAsset(assetName: string): Buffer {
  const assetPath = path.resolve(__dirname, `./assets/${assetName}`);

  if (!fs.existsSync(assetPath)) {
    throw new Error(`Asset not found: ${assetPath}`);
  }

  return fs.readFileSync(assetPath);
}

export const sendEmail = functions.onCall(async (request) => {
  try {
    const {
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      templateName,
      templateData,
      generatePdf,
      inlineImages,
      attachments,
      societyName, // ✔ REQUIRED
    } = request.data;

    // ------------------------------------------
    // ❗ REQUIRED FIELD VALIDATION
    // ------------------------------------------
    if (!to || !subject) {
      throw new Error("Missing required fields: 'to' or 'subject'");
    }

    if (!societyName) {
      throw new Error("Missing required field: 'societyName'");
    }

    const senderName = societyName;

    // 🔹 ENV-based nodemailer AUTH
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.HOSTINGER_EMAIL,
        pass: process.env.HOSTINGER_PASS,
      },
    });

    // ---------------------------------------------------
    // 🔹 TEMPLATE HANDLING (Handlebars only)
    // ---------------------------------------------------
    let finalHtml = html || '';

    if (templateName) {
      if (!templateName.endsWith('.hbs')) {
        throw new Error('Template must be a .hbs file');
      }

      const templateContent = loadTemplate(templateName);
      const compiled = handlebars.compile(templateContent);

      finalHtml = compiled(templateData || {});
    }

    // ---------------------------------------------------
    // 🔹 PDF GENERATION
    // ---------------------------------------------------
    const pdfBuffer = generatePdf
      ? await generatePDF(generatePdf.content || '')
      : null;

    // ---------------------------------------------------
    // 🔹 ATTACHMENTS
    // ---------------------------------------------------
    const formattedAttachments = [
      ...(attachments || []).map((file: any) => ({
        filename: file.filename,
        content: file.base64
          ? Buffer.from(file.base64, 'base64')
          : file.content,
        contentType: file.contentType || undefined,
      })),

      ...(pdfBuffer
        ? [
            {
              filename: generatePdf.filename || 'document.pdf',
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : []),
    ];

    // ---------------------------------------------------
    // 🔹 INLINE IMAGES
    // ---------------------------------------------------
    const formattedInlineImages = (inlineImages || []).map((img: any) => ({
      filename: img.filename,
      cid: img.cid,
      content: img.base64
        ? Buffer.from(img.base64, 'base64') // Option 1: base64 input
        : loadAsset(img.filename), // Option 2: load from filesystem
      contentType: img.contentType,
    }));

    // ---------------------------------------------------
    // 🔹 SEND EMAIL
    // ---------------------------------------------------
    await transporter.sendMail({
      from: `"${senderName}" <${process.env.HOSTINGER_EMAIL}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(',') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(',') : bcc) : undefined,

      subject,
      text,
      html: finalHtml,
      attachments: [...formattedAttachments, ...formattedInlineImages],
    });

    return {
      success: true,
      message: 'Email sent successfully!',
    };
  } catch (error: any) {
    logger.error('Email error:', error.message);
    return {success: false, error: error.message};
  }
});
