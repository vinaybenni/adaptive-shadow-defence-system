# ASDS: Aegis Security Dashboard System

ASDS is a real-time security monitoring and threat detection system. it uses a multi-agent backend to score traffic, detect attacks, and route suspicious requests to a shadow environment.

## 🚀 Installation & Setup

### 1. Frontend Setup
The frontend is built with React, Vite, and Electron. Due to its size, the `node_modules` folder is excluded from Git.

**To install dependencies:**
1. Navigate to the `frontend` directory:
   ```powershell
   cd frontend
   ```
2. Run the install command:
   ```powershell
   npm install
   ```

### 2. Backend Setup
The backend consists of several Python-based agents. Ensure you have Python 3.10+ and Redis installed.

**Core Services & Ports:**
- **Agent 1 (Risk Scoring):** Port `8001`
- **Agent 2 (Telemetry & Management):** Port `8010`
- **Agent 3 (Shadow Environment):** Port `8003`
- **Dashboard (Frontend):** Port `5173`

**to open the prots use this cmd:**
netsh advfirewall firewall add rule name="ASDS_Web_80" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="ASDS_Telemetry_8010" dir=in action=allow protocol=TCP localport=8010
netsh advfirewall firewall add rule name="ASDS_Shadow_8003" dir=in action=allow protocol=TCP localport=8003


**Running the Agents:**
Each agent folder has a `requirements.txt`. Install them using `pip install -r requirements.txt` and start the services using the provided `.bat` or `.sh` scripts in the root directory.

---

## 🛡️ Website Connection (Telemetry)

To connect your existing website to the ASDS monitoring system, you must use the `telemetry.js` file and configure your website to send requests to the backend.

### 1. Include `telemetry.js`
Copy the `telemetry.js` file (found in `backend/agent2_traffic/telemetry.js`) to your website's script folder and include it in your HTML:

```html
<script src="path/to/telemetry.js"></script>
```

### 2. How it Works
The `telemetry.js` script:
- Automatically captures page hits and form submissions.
- Sends data to the Telemetry Agent (Agent 2) on port `8010`.
- Supports dynamic host detection so it works across different network devices.

### 3. Website Modification
To ensure your website sends the correct requests:
- Register your website domain in the **Applications** tab of the ASDS Dashboard.
- The system will then begin scoring traffic from that domain.
- `telemetry.js` handles the communication automatically once included.

---

## 📁 Git Information
- **`node_modules` is excluded**: Always run `npm install` after cloning this project.
- **`.gitignore` active**: Standard Python and Node.js artifacts are ignored to keep the repository clean.
- **Logs**: All logs are stored in the `/logs` directory and are excluded from Git.

---

## 🛠️ Components
- **Dashboard**: Real-time visualization of traffic and risks.
- **Risk Engine**: Analyzes request metadata for common attack patterns (SQLi, XSS, etc.).
- **Shadow Agent**: Provides a fake environment to trap and monitor attackers.
- **Learning Agent**: Monitors trends to propose new security rules.
