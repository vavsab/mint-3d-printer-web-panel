@echo off

ping 1.1.1.1 -n 1 -w 3000 >NUL 

IF %1 EQU --state (
	echo {
	echo	"downloaded_version": null
	echo }
)

IF %1 EQU --fetch (
	
	echo {
	echo	"version": "1.2.0",
	echo	"build_date": "2018/06/02 03:55:34 UTC",
	echo	"tarball_hash": "cba1928735bdb3db",
	echo	"tarball_size": 553621,
	echo	"changelog" : "This is changelog.\nMinor fixes.\n"
	echo }
)

ping 1.1.1.1 -n 1 -w 5000 >NUL 

IF %1 EQU --pull (
	echo {
	echo	"status": {
	echo		"download": True,
	echo		"preparation": True
	echo	}
	echo }
)

REM IF %1 EQU --install (
REM )