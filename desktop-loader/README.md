# Desktop loader for MINT console

## How to build ##

npm install electron -g
npm install electron-packager -g
npm install

For Windows:
electron-packager . --platform=win32 --electronVersion=1.6.1 --out=bin --overwrite

For Raspberry:
electron-packager . --platform=linux --arch=armv7l --electronVersion=1.6.1 --out=bin --overwrite

To get installed electron version:
electron -v