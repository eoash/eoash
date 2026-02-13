@echo off
cd /d "%~dp0"
C:\Python314\python.exe daily_journal.py >> journal_log.txt 2>&1
