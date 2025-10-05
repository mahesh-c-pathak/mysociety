import axios from 'axios';

/**
 * Upload a file to WordPress using the REST API
 * @param {string} fileUri - The file URI
 * @param {string} fileName - The name of the file
 * @param {string} fileType - The MIME type of the file
 * @param {string} userToken - The user's JWT token
 * @returns {Promise<{ data: object } | { error: string }>}
 */
const UploaFiles = async (
    fileUri: string,
    fileName: string,
    fileType: string,
    userToken: string
): Promise<{ data: object } | { error: string }> => {
    try {
        const formData = new FormData();

        // Append the file with type casting for compatibility
        formData.append('file', {
            uri: fileUri,
            name: fileName,
            type: fileType,
        } as any);

        const response = await axios.post('https://myhousingsociety.in/wp-json/wp/v2/media', formData, {
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response.status === 201) {
            return response.data.source_url; // Return only the file URL as a string
        } else {
            return { error: 'Failed to upload file. Please try again.' };
        }
    } catch (error: any) {
        return {
            error: error.response?.data?.message || 'An error occurred during file upload.',
        };
    }
};

export default UploaFiles;

