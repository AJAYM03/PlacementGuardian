const API_BASE_URL = 'http://127.0.0.1:8000';
let currentProfileData = null;
let currentJwt = null;

// --- Custom Toast Notification Engine ---
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = (isError ? "⚠️ " : "✅ ") + message;
    if (isError) toast.classList.add('error');
    else toast.classList.remove('error');
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    const loginContent = document.getElementById('login-content');
    const onboardingContent = document.getElementById('onboarding-content');
    const appContent = document.getElementById('app-content');
    const btnLogin = document.getElementById('btn-login');

    const storage = await chrome.storage.local.get(['pg_jwt']);
    
    if (storage.pg_jwt) {
        currentJwt = storage.pg_jwt;
        loginContent.classList.add('hidden');
        loadProfileData();
    }

    // Google Handshake
    btnLogin.addEventListener('click', () => {
        btnLogin.innerHTML = "⏳ Authenticating...";
        chrome.runtime.sendMessage({ action: "LOGIN_WITH_GOOGLE" }, (response) => {
            if (response && response.success) window.location.reload();
            else {
                showToast("Login Failed: " + (response?.error || "Unknown error"), true);
                btnLogin.innerHTML = "Sign in with Google";
            }
        });
    });

    // Secure Profile Fetch + Onboarding Router
    async function loadProfileData() {
        try {
            const response = await fetch(`${API_BASE_URL}/profile/me`, {
                headers: { 'Authorization': `Bearer ${currentJwt}` }
            });
            
            if (response.status === 404) {
                // User is logged in, but has no data! Show Onboarding.
                onboardingContent.classList.remove('hidden');
                return;
            }
            if (!response.ok) throw new Error("Connection error");
            
            currentProfileData = await response.json();
            appContent.classList.remove('hidden');
            
            document.querySelector('.profile-name').textContent = currentProfileData.full_name;
            document.getElementById('badge-branch').textContent = currentProfileData.branch;
            document.getElementById('badge-cgpa').textContent = `CGPA: ${currentProfileData.btech_cgpa}`;
            
            loadAlerts(); // Load drives only if profile exists
        } catch (error) {
            showToast("Cannot connect to server.", true);
        }
    }

    // Load Alerts (with unique click telemetry)
    async function loadAlerts() {
        try {
            const response = await fetch(`${API_BASE_URL}/drives/active`, {
                headers: { 'Authorization': `Bearer ${currentJwt}` }
            });
            if (!response.ok) return;
            
            const drives = await response.json();
            const storage = await chrome.storage.local.get(['dismissed_drives']);
            const dismissedDrives = storage.dismissed_drives || [];
            const container = document.getElementById('alerts-container');
            container.innerHTML = '';

            const visibleDrives = drives.filter(d => !dismissedDrives.includes(d.id));

            if (visibleDrives.length === 0) {
                container.innerHTML = `<section class="card" style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 12px;">You're all caught up! No new drives.</section>`;
                return;
            }

            visibleDrives.forEach(drive => {
                const card = document.createElement('section');
                card.className = 'card alert-card';
                card.innerHTML = `
                    <div class="alert-header">
                        <h3 class="alert-company">${drive.company_name}</h3>
                        <span class="alert-deadline">${drive.deadline_text}</span>
                    </div>
                    <p class="alert-summary">${drive.role_summary}</p>
                    <div class="action-row" style="margin-top: 8px;">
                        <button class="btn btn-primary open-form-btn" data-url="${drive.apply_link}" data-id="${drive.id}" style="flex: 2;">Open Form →</button>
                        <button class="btn btn-secondary dismiss-btn" data-id="${drive.id}" style="flex: 1; padding: 6px;">
                            <svg style="width:14px; height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });

            // --- 1. OPEN FORM BUTTON (With Double-Click Protection) ---
            document.querySelectorAll('.open-form-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.currentTarget;
                    
                    // Prevent double-clicks from spamming the "Opened" metrics
                    if (button.disabled) return; 
                    button.disabled = true; 
                    
                    const url = button.getAttribute('data-url');
                    const driveId = parseInt(button.getAttribute('data-id'));
                    
                    button.innerHTML = "Opening..."; 
                    
                    const stor = await chrome.storage.local.get(['clicked_drives']);
                    const clickedDrives = stor.clicked_drives || [];
                    
                    if (!clickedDrives.includes(driveId)) {
                        try {
                            await fetch(`${API_BASE_URL}/drives/${driveId}/click`, { 
                                method: 'POST', 
                                headers: { 'Authorization': `Bearer ${currentJwt}` }
                            });
                            clickedDrives.push(driveId);
                            await chrome.storage.local.set({ 'clicked_drives': clickedDrives });
                        } catch(err) {}
                    }
                    
                    chrome.tabs.create({ url: url }); 
                    
                    // Re-enable button in case they switch back to the popup
                    setTimeout(() => { 
                        button.innerHTML = "Open Form →"; 
                        button.disabled = false; 
                    }, 1000);
                });
            });

            // --- 2. MARK AS APPLIED BUTTON (With UX Feedback & Debounce) ---
            document.querySelectorAll('.dismiss-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const button = e.currentTarget;
                    
                    // Instantly lock the button to prevent duplicate "Applied" increments
                    if (button.disabled) return; 
                    button.disabled = true; 
                    
                    const driveId = parseInt(button.getAttribute('data-id'));
                    button.innerHTML = "⏳"; // Show loading state
                    
                    const stor = await chrome.storage.local.get(['dismissed_drives']);
                    const updatedDismissed = stor.dismissed_drives || [];
                    
                    // Only ping the server if it's the very first time clicking
                    if (!updatedDismissed.includes(driveId)) {
                        try {
                            await fetch(`${API_BASE_URL}/drives/${driveId}/apply`, { 
                                method: 'POST', 
                                headers: { 'Authorization': `Bearer ${currentJwt}` }
                            });
                            updatedDismissed.push(driveId);
                            await chrome.storage.local.set({ 'dismissed_drives': updatedDismissed });
                        } catch(error) {}
                    }
                    
                    // UI Confirmation: Turn button green and show a checkmark
                    button.style.backgroundColor = "var(--accent-green)";
                    button.style.color = "white";
                    button.style.border = "none";
                    button.innerHTML = "✅";
                    
                    // Trigger the explicit toast message
                    showToast("Marked as Applied!");
                    
                    // Smoothly remove the card after a 600ms delay so the user actually sees the success
                    setTimeout(() => {
                        button.closest('.alert-card').style.display = 'none';
                    }, 600);
                });
            });
        } catch (error) {}
    }

    // --- UI Interactions ---
    const openOptionsPage = () => {
        if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
        else window.open(chrome.runtime.getURL('options.html'));
    };

    document.getElementById('btn-dashboard').addEventListener('click', openOptionsPage);
    document.getElementById('btn-setup-dashboard').addEventListener('click', openOptionsPage);

    document.getElementById('btn-autofill').addEventListener('click', () => {
        if (!currentProfileData) return showToast("Please setup profile first", true);
        
        const btn = document.getElementById('btn-autofill');
        const originalText = btn.innerHTML;
        btn.innerHTML = "⏳ Injecting...";

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0] || !tabs[0].url) {
                showToast("Cannot detect active webpage.", true);
                btn.innerHTML = originalText;
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, { action: "AUTOFILL_FORM", data: currentProfileData }, (response) => {
                if (chrome.runtime.lastError) {
                    showToast("Please refresh the Google Form first.", true);
                    btn.innerHTML = originalText;
                    return;
                }
                btn.textContent = "✅ Form Filled!";
                btn.style.backgroundColor = 'var(--accent-green)';
                btn.style.color = 'white';
                setTimeout(() => { btn.innerHTML = originalText; btn.style = ''; }, 2000);
            });
        });
    });

    document.getElementById('btn-copy').addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/profile/me/resumes/`, {
                headers: { 'Authorization': `Bearer ${currentJwt}` }
            });
            const resumes = await response.json();
            const defaultResume = resumes.find(r => r.is_default) || resumes[0];
            
            if (defaultResume) {
                navigator.clipboard.writeText(defaultResume.drive_link);
                showToast("Resume link copied to clipboard!");
            } else {
                showToast("No resume found. Add one in Dashboard.", true);
            }
        } catch (error) {
            showToast("Failed to fetch resume.", true);
        }
    });
});