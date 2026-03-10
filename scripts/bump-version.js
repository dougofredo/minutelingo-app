#!/usr/bin/env node
/**
 * Bump version for a new release (iOS + Android in sync).
 * Updates app.json: version (patch), ios.buildNumber, android.versionCode.
 * Usage: node scripts/bump-version.js
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const version = app.expo.version;
const parts = version.split('.').map(Number);
parts[2] = (parts[2] || 0) + 1;
const newVersion = parts.join('.');

const buildNumber = String((parseInt(app.expo.ios?.buildNumber || '0', 10) + 1));
const versionCode = (app.expo.android?.versionCode || 0) + 1;

app.expo.version = newVersion;
app.expo.ios = app.expo.ios || {};
app.expo.ios.buildNumber = buildNumber;
app.expo.android = app.expo.android || {};
app.expo.android.versionCode = versionCode;

fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n', 'utf8');

console.log('Version bumped:');
console.log('  version:        ', version, '→', newVersion);
console.log('  ios.buildNumber:', app.expo.ios.buildNumber);
console.log('  android.versionCode:', app.expo.android.versionCode);
