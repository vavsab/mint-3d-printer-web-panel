@echo off

ping 1.1.1.1 -n 1 -w 3000 >NUL 

IF "%1" EQU "--status" ( 
    echo {
    echo    "connected": true
    echo }
    EXIT 0
)

IF "%1" NEQ "--connect" (
	IF "%1" NEQ "--disconnect" ( 
        echo {
        echo    "success": false,
        echo	"error": "Unknown operation"
        echo }
        EXIT -1
    )
)

IF "%2" NEQ "--printer-id" (
    echo {
    echo    "success": false,
    echo	"error": "Printer id wasn't supplied"
    echo }
    EXIT -1
)

IF "%3" NEQ "testHash" (
    echo {
    echo    "success": false,
    echo	"error": "Printer id is not correct"
    echo }
    EXIT -1
)

set /a rand = (%RANDOM%) %% 2

IF "%rand%" EQU "1" (
    echo {
    echo    "success": true
    echo }
) ELSE (
    echo {
    echo    "success": false,
    echo    "error": "Error during setuping remote connection"
    echo }
    EXIT -1
)