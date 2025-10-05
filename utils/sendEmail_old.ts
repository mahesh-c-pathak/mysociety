import axios from 'axios';

interface SendEmailResponse {
    success: boolean;
    message: string;
    data?: any;
    error?: any;
}

/**
 * Sends an email using the custom WordPress REST API endpoint.
 *
 * @param {string | string[]} to - Recipients (string or array of email addresses).
 * @param {string | string[]} [cc] - CC recipients (optional).
 * @param {string | string[]} [bcc] - BCC recipients (optional).
 * @param {string} subject - Email subject.
 * @param {string} message - Email message.
 * @param {string[]} [attachments] - Array of attachment file paths (optional).
 * @param {string} userToken - User's authentication token for the API.
 * @returns {Promise<SendEmailResponse>} - Response object containing success or error status.
 */
export const sendEmail = async (
    to: string | string[],
    cc: string | string[] = [],
    bcc: string | string[] = [],
    subject: string,
    message: string,
    attachments: string[] = [],
    userToken: string
): Promise<SendEmailResponse> => {
    try {
        // Prepare the API request payload
        const data = {
            to: Array.isArray(to) ? to.join(',') : to,
            cc: Array.isArray(cc) ? cc.join(',') : cc,
            bcc: Array.isArray(bcc) ? bcc.join(',') : bcc,
            subject,
            message,
            attachments,
        };

        // Make the API request
        const response = await axios.post('https://myhousingsociety.in/wp-json/wp-send-email-rest-api/v1/send-email/', data, {
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            },
        });

        // Handle success
        if (response.status === 200) {
            return { success: true, message: 'Email sent successfully.', data: response.data };
        } else {
            return { success: false, message: 'Failed to send email.', data: response.data };
        }
    } catch (err) {
        // Handle error explicitly
        const error = err as Error; // Cast to Error
        return { success: false, message: error.message, error };
    }
};
