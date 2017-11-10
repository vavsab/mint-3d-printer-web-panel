@echo off

ping 1.1.1.1 -n 1 -w 3000 >NUL 

IF %1 EQU --status (
	echo {
	echo	"downloaded_version": "1.2.1"
	echo }
)

IF %1 EQU --fetch (
	
	echo {
	echo	"version": "1.2.2",
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