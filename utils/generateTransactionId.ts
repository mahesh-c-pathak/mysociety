/**
 * Generates a random 10-digit transaction ID.
 * @returns {string} A 10-digit transaction ID as a string.
 */
export const generateTransactionId = (): string => {
    // Generate a random 10-digit number as a string
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};
