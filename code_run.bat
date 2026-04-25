@echo off
SET PYTHONUTF8=1
cd gram-sphere
..\.venv\Scripts\python.exe -m fastapi dev main.py
pause
