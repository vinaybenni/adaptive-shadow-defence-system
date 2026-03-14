@echo off
echo ===================================================
echo      Starting Risk Based Deception System
echo ===================================================
echo.

echo Starting Agent 1: Risk Engine...
start "Agent 1 - Risk Engine" cmd /k "cd backend\agent1_risk && python main.py"

echo Starting Agent 2: Traffic Router...
start "Agent 2 - Traffic Router" cmd /k "cd backend\agent2_traffic && python main.py"

echo Starting Agent 3: Shadow Environment...
start "Agent 3 - Shadow Environment" cmd /k "cd backend\agent3_shadow && python main.py"

echo Starting Agent 4: Learning System...
start "Agent 4 - Learning System" cmd /k "cd backend\agent4_learning && python main.py"

echo Starting Frontend Dashboard...
cd frontend
echo Waiting for backend agents to initialize...
timeout /t 5
start "Frontend Dashboard" cmd /k "npm.cmd run electron:dev"
cd ..

echo.
echo ===================================================
echo      System Startup Initiated!
echo      Please check the individual windows for logs.
echo ===================================================
pause
