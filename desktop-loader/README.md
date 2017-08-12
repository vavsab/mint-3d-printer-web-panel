# Desktop loader for MINT console

## How to compile 
npm install electron -g
npm install electron-packager -g

For Windows:
electron-packager . --platform=win32 --electronVersion=1.6.1

For Raspberry:
electron-packager . --platform=linux --arch=armv7l --electronVersion=1.6.1

To get installed electron version:
electron -v