import nodemailer from 'nodemailer';

let transporter;

const getTransporter = async () => {
    if (transporter) return transporter;

    const user = process.env.SMTP_USER || 'rvetrivignesh01@gmail.com';
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
        console.log(`Configuring SMTP transporter for user: ${user}`);
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: user,
                pass: pass
            }
        });
    } else {
        console.log('No SMTP password (SMTP_PASS) found in environment variables. Setting up Ethereal Mail testing account...');
        try {
            const testAccount = await nodemailer.createTestAccount();
            console.log('Ethereal Mail account created:', testAccount.user);
            transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
        } catch (err) {
            console.error('Failed to create Ethereal Mail account. Falling back to dummy transporter:', err);
            // Dummy fallback so it does not block application execution
            transporter = {
                sendMail: async (options) => {
                    console.log('--- DUMMY MAIL LOG (SMTP NOT CONFIG) ---');
                    console.log(`To: ${options.to}`);
                    console.log(`Subject: ${options.subject}`);
                    console.log(`Body: ${options.html}`);
                    return { messageId: 'dummy-id' };
                }
            };
        }
    }
    return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
    try {
        if (!to) {
            console.error(`[Mail Service] Cannot send email. Recipient address is empty/undefined. Subject: "${subject}"`);
            return;
        }

        console.log(`[Mail Service] Attempting to send email to: ${to} | Subject: "${subject}"`);
        const activeTransporter = await getTransporter();
        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'XeroxDosth'}" <${process.env.SMTP_FROM || 'rvetrivignesh01@gmail.com'}>`,
            to,
            subject,
            html
        };

        const info = await activeTransporter.sendMail(mailOptions);
        console.log(`[Mail Service] Email successfully dispatched to ${to}: ${info.messageId}`);
        
        // Show test link if we are using Ethereal
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`✉️ Ethereal Email Preview Link: ${previewUrl}`);
        }
        return info;
    } catch (error) {
        console.error(`[Mail Service] Error occurred in mail delivery service to ${to}:`, error);
        // We log the error but don't reject/crash so operations can continue normally
    }
};
