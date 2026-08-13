import { BrevoClient } from '@getbrevo/brevo';

let brevoClient = null;

const getBrevoClient = () => {
    if (brevoClient) return brevoClient;

    const apiKey = process.env.BREVO_API_KEY;

    if (apiKey) {
        brevoClient = new BrevoClient({
            apiKey
        });
    }
    return brevoClient;
};

export const sendEmail = async ({ to, subject, html, recipientName = '' }) => {
    try {
        if (!to) {
            console.error(`[Mail Service] Cannot send email. Recipient address is empty/undefined. Subject: "${subject}"`);
            return;
        }

        const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@xeroxdosth.com';
        const senderName = process.env.BREVO_SENDER_NAME || 'XeroxDosth';

        console.log(`[Mail Service] Attempting to send Brevo email to: ${to} | Subject: "${subject}"`);

        const client = getBrevoClient();

        if (!client) {
            console.warn(`[Mail Service] BREVO_API_KEY is not configured in environment variables. Logging email payload to console.`);
            console.log(`--- BREVO EMAIL LOG (KEY NOT CONFIGURED) ---`);
            console.log(`From: ${senderName} <${senderEmail}>`);
            console.log(`To: ${recipientName} <${to}>`);
            console.log(`Subject: ${subject}`);
            console.log(`Body: ${html}`);
            return { messageId: 'dummy-brevo-id' };
        }

        const sendData = {
            sender: {
                name: senderName,
                email: senderEmail
            },
            to: [
                {
                    email: to,
                    name: recipientName || to.split('@')[0]
                }
            ],
            subject: subject,
            htmlContent: html
        };

        const response = await client.transactionalEmails.sendTransacEmail(sendData);
        console.log(`[Mail Service] Brevo email successfully dispatched to ${to}. MessageId: ${response?.messageId || JSON.stringify(response)}`);
        return response;
    } catch (error) {
        console.error(`[Mail Service] Error occurred in Brevo mail delivery service to ${to}:`, error);
        // We log the error but don't reject/crash so operations can continue normally
    }
};
