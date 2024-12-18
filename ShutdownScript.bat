@echo off
:: Schedule the shutdown task to run once at 00:00
schtasks /create /tn "OneTimeShutdown" /tr "shutdown /s /t 0" /sc once /st 00:00 /f
echo Task Scheduled: Your computer will shut down at midnight (00:00) local time, only once.
pause
