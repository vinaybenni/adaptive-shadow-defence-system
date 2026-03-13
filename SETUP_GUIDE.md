# Project Setup and Guide

This project contains a multi-agent backend system (4 Python Agents) and a modern Electron/React Frontend.

## 🚀 Quick Start (Windows)

We have provided automated scripts to get you up and running quickly.

### 1. Installation
Run the `install.bat` file.
```cmd
install.bat
```
This will automatically:
- Install all Node.js dependencies for the Frontend.
- Install all Python dependencies for the 4 Backend Agents.

### 2. Execution
Run the `run.bat` file.
```cmd
run.bat
```
This will:
- Open 4 separate terminal windows (one for each backend agent).
- Start the Electron Frontend Dashboard.

## 📂 Project Structure
- **/frontend**: Electron + React + Vite application.
- **/backend**:
  - **agent1_risk**: Risk Engine & Behavior Monitoring.
  - **agent2_traffic**: Traffic Router.
  - **agent3_shadow**: Shadow/Deception Environment.
  - **agent4_learning**: Learning & Adaptation System.

## 🛠 Manual Setup (If scripts fail)
If you prefer running things manually:

**Frontend:**
```bash
cd frontend
npm install
npm run electron:dev
```

**Backend (Repeat for each agent folder):**
```bash
cd backend/agentX_name
pip install -r requirements.txt
python main.py
```
