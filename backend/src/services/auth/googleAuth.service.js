import dotenv from 'dotenv';
dotenv.config();
import { OAuth2Client } from 'google-auth-library';
import ApiError from '../../utils/ApiError.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies a Google ID token sent from the client and returns the user payload.
 * @param {string} idToken - The Google ID token.
 * @returns {Promise<object>} The validated user payload from Google.
 */
export const verifyGoogleToken = async (idToken) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        
        if (!payload.email_verified) {
            throw new ApiError(400, "Google email is not verified");
        }
        
        return payload;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(400, "Invalid Google ID token: " + error.message);
    }
};
