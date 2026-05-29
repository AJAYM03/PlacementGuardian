/**
 * Placement Guardian - Content Script
 * Upgraded with Aggressive Text Normalization & Exhaustive Mapping
 */

// Helper function to strip everything except letters and numbers for fuzzy matching
const normalizeText = (text) => {
    if (!text) return "";
    return String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "AUTOFILL_FORM") {
        const data = request.data;

        // Exhaustive mapping array to catch variations in HR form creation
        const formMapping = [
            {
                keywords: ["full name", "applicant name", "student name", "candidate name", "first name", "name"],
                value: data.full_name
            },
            {
                keywords: ["email id", "email address", "personal email", "e-mail", "email"],
                value: data.personal_email
            },
            {
                keywords: ["mobile no", "contact no", "phone no", "whatsapp no", "mobile number", "contact number", "phone number", "whatsapp", "phone", "contact", "mobile"],
                value: data.phone_number
            },
            {
                keywords: ["10th", "sslc", "xth", "class 10", "tenth", "matriculation"],
                value: data.tenth_percentage
            },
            {
                keywords: ["12th", "hsc", "plus two", "xiith", "class 12", "twelfth", "intermediate", "puc"],
                value: data.twelfth_percentage
            },
            {
                keywords: ["cgpa", "btech cgpa", "b.tech cgpa", "degree %", "graduation %", "ug cgpa", "undergrad", "b.e", "btech", "degree"],
                value: data.btech_cgpa
            },
            {
                keywords: ["branch", "programme", "department", "specialization", "course", "stream", "study"],
                value: data.branch
            },
            {
                keywords: ["uid", "college id", "university id", "roll no", "registration no", "prn", "student id", "admission no"],
                value: data.college_uid
            },
            {
                keywords: ["linkedin", "linked in"],
                value: data.linkedin_url
            },
            {
                keywords: ["github", "git hub"],
                value: data.github_url
            },
            {
                keywords: ["portfolio", "personal website", "personal link", "website", "blog"],
                value: data.portfolio_url
            },
            {
                keywords: ["backlog", "arrear", "history of arrear", "standing arrear", "history of backlog", "ktkt"],
                value: data.active_backlogs !== undefined && data.active_backlogs !== null ? String(data.active_backlogs) : "0"
            }
        ];

        const inputWrappers = document.querySelectorAll('div[role="listitem"]');
        let filledCount = 0;

        inputWrappers.forEach(wrapper => {
            const questionTextElement = wrapper.querySelector('div[role="heading"] span');
            if (!questionTextElement) return;

            const rawQuestionText = questionTextElement.innerText;
            const normalizedQuestion = normalizeText(rawQuestionText);

            let matchedValue = null;

            // Find matching data based on exhaustive keywords
            for (let map of formMapping) {
                // Check if any normalized keyword is inside the normalized question
                if (map.keywords.some(keyword => normalizedQuestion.includes(normalizeText(keyword)))) {
                    // Ensure the value actually exists in the profile before injecting
                    if (map.value !== null && map.value !== undefined && map.value !== "") {
                        matchedValue = String(map.value); // Coerce to string for injection safety
                    }
                    break; // Stop checking other fields once we find a match for this question
                }
            }

            if (matchedValue !== null) {
                // 1. TEXT / NUMBER / EMAIL / URL INPUTS & TEXTAREAS
                const inputElement = wrapper.querySelector('input[type="text"], input[type="email"], input[type="number"], input[type="url"], textarea');

                if (inputElement) {
                    inputElement.value = matchedValue;
                    
                    // Fire native DOM events so Google Forms registers the change
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Visual feedback for the user
                    inputElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    inputElement.style.borderBottom = '2px solid #10b981';
                    filledCount++;
                }
                // 2. RADIO BUTTONS & CHECKBOXES (Bidirectional Match)
                else {
                    const radioButtons = wrapper.querySelectorAll('div[role="radio"], div[role="checkbox"]');

                    if (radioButtons.length > 0) {
                        const normalizedDbValue = normalizeText(matchedValue);

                        radioButtons.forEach(radio => {
                            const rawRadioText = radio.getAttribute('data-value') || radio.innerText;
                            const normalizedRadioValue = normalizeText(rawRadioText);

                            // Bidirectional fuzzy match:
                            // "Computer Science" (DB) matches "Computer Science Engineering" (Form) and vice-versa
                            if (normalizedRadioValue.includes(normalizedDbValue) || normalizedDbValue.includes(normalizedRadioValue)) {
                                
                                // Only click if it's not already checked (prevents un-toggling)
                                if (radio.getAttribute('aria-checked') !== 'true') {
                                    radio.click();
                                }
                                
                                // Visual feedback
                                radio.parentElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                                radio.parentElement.style.borderRadius = '4px';
                                filledCount++;
                            }
                        });
                    }
                }
            }
        });

        console.log(`Placement Guardian: Form successfully populated. Filled ${filledCount} fields.`);
        sendResponse({ success: true, count: filledCount });
    }

    return true; // Keep the message channel open for async response
});