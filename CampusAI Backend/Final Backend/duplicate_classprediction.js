const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;

// Fixed Gemini API key for classification
const FIXED_GEMINI_API_KEY = "AIzaSyDo6Duj83vQdKyMxdRCgoCO_yccyFFIxCA";


async function classifyIssue(description, departments, images = [], dateTime = null) {
    try {
        // Use provided dateTime or current time
        const currentTime = dateTime || new Date().toISOString();
        const formattedTime = new Date(currentTime).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'long'
        });

        // Initialize Gemini with fixed API key
        const genAI = new GoogleGenerativeAI(FIXED_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Prepare content parts
        const contentParts = [];

        // Add text prompt
        const prompt = `Analyze the following issue/post and determine which department is responsible.

**Post Details:**
- Description: "${description}"
- Posted at: ${formattedTime}

**Available Departments:**
${JSON.stringify(departments, null, 2)}

**Instructions:**
1. Determine which ONE department from the list is responsible for this issue
2. If it belongs to a department, provide a short detailed summary of what the post is about
3. Include the time context in your analysis
4. If NO department is responsible, return null

**Response Format (ONLY JSON):**
If department found:
{
  "department": "<department-name>",
  "summary": "Brief 2-3 sentence summary of the issue, including what happened and when",
  "timestamp": "${formattedTime}"
}

If no department matches:
{
  "department": null,
  "summary": null,
  "timestamp": "${formattedTime}"
}

Return ONLY valid JSON, no other text.`;

        contentParts.push(prompt);

        // Add images if provided
        if (images && images.length > 0) {
            for (const image of images) {
                contentParts.push({
                    inlineData: {
                        data: image.buffer.toString('base64'),
                        mimeType: image.mimeType
                    }
                });
            }
        }

        // Call Gemini
        const result = await model.generateContent(contentParts);
        const responseText = result.response?.text?.() || "";

        // Clean and parse response
        const cleanJson = responseText
            .trim()
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const classification = JSON.parse(cleanJson);

        // Return structured result
        return {
            department: classification.department || null,
            summary: classification.summary || null,
            timestamp: classification.timestamp || formattedTime,
            success: true
        };

    } catch (error) {
        console.error('Classification error:', error);
        return {
            department: null,
            summary: null,
            timestamp: dateTime || new Date().toISOString(),
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper function to load image from file path
 * @param {string} filePath - Path to image file
 * @returns {Promise<Object>} Image object with buffer and mimeType
 */
async function loadImageFromPath(filePath) {
    const buffer = await fs.readFile(filePath);
    const ext = filePath.toLowerCase().split('.').pop();

    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp'
    };

    return {
        buffer,
        mimeType: mimeTypes[ext] || 'image/jpeg'
    };
}

module.exports = {
    classifyIssue,
    loadImageFromPath
};
