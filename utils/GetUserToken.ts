import axios from 'axios';

/**
 * Authenticate user with WordPress JWT REST API
 * @param {string} username - The WordPress username
 * @param {string} password - The WordPress password
 * @returns {Promise<{ userToken: string } | { error: string }>}
 */
const GetUserToken = async (
    username: string,
    password: string
): Promise<{ userToken: string } | { error: string }> => {
    try {
        const response = await axios.post('https://myhousingsociety.in/wp-json/jwt-auth/v1/token', {
            username,
            password,
        });

        if (response.status === 200 && response.data.token) {
            return { userToken: response.data.token }; // Return the token
        } else {
            return { error: 'Failed to retrieve token. Please try again.' };
        }
    } catch (error: any) {
        return {
            error: error.response?.data?.message || 'An error occurred during authentication.',
        };
    }
};

export default GetUserToken;




