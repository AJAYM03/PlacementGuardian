/**
 * Placement Guardian - Content Script
 * Upgraded with Aggressive Text Normalization for better matching
 */

// Helper function to strip everything except letters and numbers
const normalizeText = (text) => {
    return String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "AUTOFILL_FORM") {
        const data = request.data;
        
        const formMapping = [
            { keywords: ["name", "full name"], value: data.full_name },
            { keywords: ["email", "email id"], value: data.personal_email },
            { keywords: ["phone", "contact", "mobile", "mobile no."], value: data.phone_number },
            { keywords: ["10th", "sslc"], value: data.tenth_percentage },
            { keywords: ["12th", "hsc", "plus two"], value: data.twelfth_percentage },
            { keywords: ["cgpa", "b.tech", "degree %", "b-tech cgpa"], value: data.btech_cgpa },
            { keywords: ["branch", "programme", "study"], value: data.branch },
            { keywords: ["uid", "college id"], value: data.college_uid }
        ];

        const inputWrappers = document.querySelectorAll('div[role="listitem"]');

        inputWrappers.forEach(wrapper => {
            const questionTextElement = wrapper.querySelector('div[role="heading"] span');
            if (!questionTextElement) return;

            const questionText = normalizeText(questionTextElement.innerText);

            // Find matching data based on keywords (keywords also need normalization now)
            let matchedValue = null;
            for (let map of formMapping) {
                if (map.keywords.some(keyword => questionText.includes(normalizeText(keyword)))) {
                    matchedValue = map.value;
                    break;
                }
            }

            if (matchedValue !== null) {
                // 1. TEXT INPUTS
                const inputElement = wrapper.querySelector('input[type="text"], input[type="email"], input[type="number"], textarea');
                
                if (inputElement) {
                    inputElement.value = matchedValue;
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    inputElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    inputElement.style.borderBottom = '2px solid #10b981';
                } 
                // 2. RADIO BUTTONS (Aggressive Match)
                else {
                    const radioButtons = wrapper.querySelectorAll('div[role="radio"]');
                    
                    if (radioButtons.length > 0) {
                        const normalizedDbValue = normalizeText(matchedValue); // e.g., 'computerscienceengineering'

                        radioButtons.forEach(radio => {
                            const rawRadioText = radio.getAttribute('data-value') || radio.innerText;
                            const normalizedRadioValue = normalizeText(rawRadioText);
                            
                            // Now we compare the stripped-down strings
                            if (normalizedRadioValue.includes(normalizedDbValue) || normalizedDbValue.includes(normalizedRadioValue)) {
                                radio.click();
                                radio.parentElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                                radio.parentElement.style.borderRadius = '4px';
                            }
                        });
                    }
                }
            }
        });
        
        console.log("Placement Guardian: Form successfully populated with normalized matching.");

        sendResponse({ success: true });
    }

    return true; // Keep the message channel open for async response    
});