@echo off
echo Starting Risk Deception System...

:: Set PYTHONPATH so agents can import 'shared'
set PYTHONPATH=%cd%\backend

:: 1. Redis (Assumes redis-server is in PATH)
start "Redis" redis-server

:: 2. Agent 1
start "Agent 1 - Risk" backend\agent1_risk\venv\Scripts\python backend\agent1_risk\main.py

:: 3. Agent 2
start "Agent 2 - Traffic" backend\agent2_traffic\venv\Scripts\python backend\agent2_traffic\main.py

:: 4. Agent 3
start "Agent 3 - Shadow" backend\agent3_shadow\venv\Scripts\python backend\agent3_shadow\main.py

:: 5. Agent 4
start "Agent 4 - Learning" backend\agent4_learning\venv\Scripts\python backend\agent4_learning\main.py

echo All services started!
