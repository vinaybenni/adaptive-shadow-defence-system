@echo off
echo ===================================================
echo      Installing Dependencies for Risk System
echo ===================================================
echo.

echo [1/5] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..
echo Frontend dependencies installed.
echo.

echo [2/5] Installing Agent 1 (Risk) Dependencies...
cd backend\agent1_risk
pip install -r requirements.txt
cd ..\..
echo Agent 1 dependencies installed.
echo.

echo [3/5] Installing Agent 2 (Traffic) Dependencies...
cd backend\agent2_traffic
pip install -r requirements.txt
cd ..\..
echo Agent 2 dependencies installed.
echo.

echo [4/5] Installing Agent 3 (Shadow) Dependencies...
cd backend\agent3_shadow
pip install -r requirements.txt
cd ..\..
echo Agent 3 dependencies installed.
echo.

echo [5/5] Installing Agent 4 (Learning) Dependencies...
cd backend\agent4_learning
pip install -r requirements.txt
cd ..\..
echo Agent 4 dependencies installed.
echo.

echo ===================================================
echo      All Dependencies Installed Successfully!
echo ===================================================
pause
