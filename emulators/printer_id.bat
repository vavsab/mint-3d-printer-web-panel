@echo off

IF "%1" NEQ "testKey" (
    echo {"printer_id": null}    
    EXIT
)

echo {"printer_id": "testHash"}