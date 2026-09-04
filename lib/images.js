// BOT NAME  ➳ GLORIA MD
// BOT DEV   ➳ MR ROAN
// CONTACT DEV ➳ +237689301479
//
// Central place that resolves the two brand images used by the bot:
//  - commands/gloria.jpg  -> used ONLY by the .menu command
//  - commands/Gloria.jpg  -> used by welcome, goodbye, alive and devinfo
//
// If a file is missing on disk, we gracefully fall back to MENU_IMAGE_URL
// (or the default remote image) so the bot never crashes because an asset
// wasn't uploaded yet. Simply drop the real files at the paths below and
// they will be picked up automatically (the cache is re-checked on every call).

const fs = require('fs');
const path = require('path');

const MENU_IMAGE_PATH = path.join(__dirname, '..', 'commands', 'gloria.jpg');
const BRAND_IMAGE_PATH = path.join(__dirname, '..', 'commands', 'gloria.jpg');
const FALLBACK_URL = process.env.MENU_IMAGE_URL || 'https://i.ibb.co/hFkhFqY5/jawadmd.jpg';

function readImage(filePath) {
    try {
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
    } catch (e) {
        // ignore, fall back below
    }
    return null;
}

// Image used exclusively for the .menu command (commands/gloria.jpg)
function getMenuImage() {
    return readImage(MENU_IMAGE_PATH) || { url: FALLBACK_URL };
}

// Image used for welcome, goodbye, alive and devinfo (commands/Gloria.jpg)
function getBrandImage() {
    return readImage(BRAND_IMAGE_PATH) || { url: FALLBACK_URL };
}

module.exports = { getMenuImage, getBrandImage, MENU_IMAGE_PATH, BRAND_IMAGE_PATH };
