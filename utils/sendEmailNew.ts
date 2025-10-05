// utils/sendEmail.ts
import * as FileSystem from "expo-file-system";

type Attachment = {
  uri: string;
  name: string;
};

export const sendEmailNew = async ({
  to,
  subject,
  text,
  attachments = [],
}: {
  to: string;
  subject: string;
  text: string;
  attachments?: Attachment[];
}) => {
  try {
    // Convert files to base64 if any
    const formattedAttachments = [];
    for (const file of attachments) {
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64",
      });
      formattedAttachments.push({
        filename: file.name,
        content: base64,
        encoding: "base64",
      });
    }

    const res = await fetch(
      "https://myhousingappvercel.vercel.app/api/sendMail",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          text,
          attachments: formattedAttachments.length
            ? formattedAttachments
            : undefined,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send email");

    console.log(`Email sent to ${to}`);
    return data;
  } catch (err: any) {
    console.error(`Error sending email to ${to}:`, err);
    return { error: err.message || "Unknown error" };
  }
};
