(function () {
    console.log("Risk System Telemetry: Initializing...");

    // Configuration
    // Dynamically use the current host so other network devices send to the correct IP
    const currentHost = window.location.hostname;
    const AGENT_URL = "http://" + currentHost + ":8010/api/v1/telemetry";

    // Immediate Breach Prevention: Hide content if URL looks suspicious
    const attackPatterns = /(' OR '1'='1|--|union|select|insert|delete|update|drop|truncate|alter|xp_cmdshell)/i;
    if (attackPatterns.test(window.location.search) || attackPatterns.test(window.location.hash)) {
        console.warn("Risk System: Suspicious URL detected. Hiding content until verified...");
        document.documentElement.style.display = 'none';
    }

    function sendTelemetry(eventType = 'hit', overrides = {}) {
        return new Promise((resolve) => {
            const data = {
                event: eventType,
                method: "GET",
                path: window.location.pathname,
                host: window.location.host,
                full_url: window.location.href,
                referrer: document.referrer,
                timestamp: new Date().toISOString(),
                ...overrides
            };

            fetch(AGENT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            })
                .then(response => response.json())
                .then(result => {
                    console.log("Risk System Response:", result);
                    if (result.action === 'block') {
                        document.body.innerHTML = `
                            <div style="background: #000; color: #ff0000; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif;">
                                <h1 style="font-size: 3rem;">SECURITY BLOCK</h1>
                                <p style="font-size: 1.2rem; color: #888;">Your IP address has been restricted by the administrator.</p>
                                <div style="margin-top: 2rem; padding: 1rem; border: 1px solid #ff0000; color: #ff0000;">ERROR_CODE: IP_RESTRICTED</div>
                            </div>
                        `;
                        document.documentElement.style.display = 'block';
                        resolve(result);
                        return;
                    }
                    if (result.action === 'redirect' && result.url) {
                        const targetUrl = result.url.toLowerCase();
                        const currentUrl = window.location.href.toLowerCase();

                        if (!currentUrl.startsWith(targetUrl)) {
                            console.warn("Risk System: HIGH RISK DETECTED. Redirecting to shadow: " + result.url);
                            window.location.href = result.url;
                            return;
                        }
                    }
                    // If safe, show content
                    document.documentElement.style.display = 'block';
                    resolve(result);
                })
                .catch(error => {
                    console.error("Risk System Error:", error);
                    document.documentElement.style.display = 'block';
                    resolve({ action: 'none' });
                });
        });
    }

    // Capture Page Load
    sendTelemetry('hit');

    // Capture Login Attempts and Form Data (for Attack Detection)
    document.addEventListener('submit', function (e) {
        if (e.target.dataset.telemetryVerified) return;

        const form = e.target;

        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('login.php') || currentPath.includes('login/') || currentPath.endsWith('login')) {
            console.log("Risk System: Login page detected. Verifying and allowing non-blocking flow.");
            sendTelemetry('hit', {
                method: (form.getAttribute('method') || 'GET').toUpperCase(),
                path: form.getAttribute('action') || window.location.pathname,
                payload: "login_attempt=true"
            }).then(result => {
                // Even on login pages, if the Risk is HIGH, move to shadow
                if (result.action === 'redirect' && result.url) {
                    console.warn("Risk System: Critical risk on login. Moving to shadow.");
                    window.location.href = result.url;
                }
            });
            return; // Still return to allow original form handler if no redirect occurs within timeout
        }

        e.preventDefault();

        const formData = new FormData(form);
        const params = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            params.append(key, value);
        }
        const payload = params.toString();
        const method = (form.getAttribute('method') || 'GET').toUpperCase();

        console.log("Risk System: Verifying form submission before clearing...");
        sendTelemetry('hit', {
            method: method,
            path: form.getAttribute('action') || window.location.pathname,
            payload: payload
        }).then(result => {
            if (result.action !== 'redirect' && result.action !== 'block') {
                console.log("Risk System: Request verified. Proceeding.");
                form.dataset.telemetryVerified = "true";
                // More reliable form submission 
                const submitBtn = form.querySelector('[type="submit"]');
                if (submitBtn && typeof submitBtn.click === 'function') {
                    submitBtn.click();
                } else {
                    form.submit();
                }
            } else {
                console.warn("Risk System: Blocked form submission due to high risk.");
            }
        });
    }, true);

    // Clear login flag when on login page (user logged out or fresh visit)
    if (window.location.pathname.includes('login.php')) {
        sessionStorage.removeItem('login_success_sent');
    }

    // Detect Successful Login (DVWA shows Logout link when authed)
    function detectSuccess() {
        const isIndex = window.location.pathname.includes('index.php');
        const hasLogout = !!document.querySelector('a[href*="logout"]');
        const alreadySent = sessionStorage.getItem('login_success_sent');
        if (isIndex && hasLogout && !alreadySent) {
            console.log("Risk System: Successful login detected.");
            sessionStorage.setItem('login_success_sent', 'true');
            sendTelemetry('login_success');
        }
    }

    window.addEventListener('load', detectSuccess);
})()
