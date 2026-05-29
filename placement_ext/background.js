/**
 * Placement Guardian - Background Worker
 * Handles Google OAuth and secure token storage.
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === "LOGIN_WITH_GOOGLE") {
        
        // 1. Ask Chrome to trigger the Google Login popup
        chrome.identity.getAuthToken({ interactive: true }, async (token) => {
            if (chrome.runtime.lastError) {
                console.error("Login failed:", chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }

            try {
                // 2. Send the Google Token to our FastAPI backend
                const response = await fetch(`${API_BASE_URL}/auth/google?google_token=${token}`, {
                    method: 'POST'
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || "Backend rejected the token");
                }

                const data = await response.json();

                // 3. Save the FastAPI JWT securely in Chrome's local storage
                await chrome.storage.local.set({ 
                    'pg_jwt': data.access_token,
                    'pg_email': data.email 
                });

                console.log("Placement Guardian: Successfully authenticated.");
                sendResponse({ success: true, email: data.email });

            } catch (error) {
                console.error("Backend Auth Error:", error);
                sendResponse({ success: false, error: error.message });
            }
        });

        // Return true to indicate we will send the response asynchronously
        return true; 
    }
});