// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'store.json');

function defaultData() {
    return {
        sudo: [],
        banned: [],
        warns: {},          // { groupId: { userJid: count } }
        antilink: {},        // { groupId: true/false }
        mode: 'public',      // 'public' | 'self'
        prefix: {},          // { sessionId: '.' }
        settings: {
            autoread: false,
            autobio: false,
            autorecording: false,
            autotyping: false,
            autoviewstatus: false,
            autoreact: false
        },
        groupSchedule: {},   // { groupId: { openTime: 'HH:MM', closeTime: 'HH:MM', lastRun: {} } }
        groupToggles: {},    // { groupId: { antibot: true, chatbot: false, ... } }
        groupMetaCache: {}   // { groupId: { subject, desc } } — used by protectgc
    };
}

function ensure() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify(defaultData(), null, 2));
}

function read() {
    ensure();
    try {
        const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
        // merge with the defaults in case new fields were added
        return Object.assign(defaultData(), raw, {
            settings: Object.assign(defaultData().settings, raw.settings || {})
        });
    } catch (e) {
        console.error('Store read error:', e);
        return defaultData();
    }
}

function write(data) {
    ensure();
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    // --- SUDO ---
    getSudo() { return read().sudo; },
    addSudo(jid) {
        const d = read();
        if (!d.sudo.includes(jid)) d.sudo.push(jid);
        write(d);
    },
    delSudo(jid) {
        const d = read();
        d.sudo = d.sudo.filter(x => x !== jid);
        write(d);
    },

    // --- BAN GLOBAL ---
    getBanned() { return read().banned; },
    ban(jid) {
        const d = read();
        if (!d.banned.includes(jid)) d.banned.push(jid);
        write(d);
    },
    unban(jid) {
        const d = read();
        d.banned = d.banned.filter(x => x !== jid);
        write(d);
    },
    isBanned(jid) { return read().banned.includes(jid); },

    // --- WARNS ---
    addWarn(groupId, jid) {
        const d = read();
        d.warns[groupId] = d.warns[groupId] || {};
        d.warns[groupId][jid] = (d.warns[groupId][jid] || 0) + 1;
        write(d);
        return d.warns[groupId][jid];
    },
    getWarn(groupId, jid) {
        const d = read();
        return (d.warns[groupId] && d.warns[groupId][jid]) || 0;
    },
    resetWarn(groupId, jid) {
        const d = read();
        if (d.warns[groupId]) delete d.warns[groupId][jid];
        write(d);
    },
    getAllWarns(groupId) {
        const d = read();
        return d.warns[groupId] || {};
    },

    // --- ANTILINK ---
    setAntilink(groupId, val) {
        const d = read();
        d.antilink[groupId] = val;
        write(d);
    },
    isAntilink(groupId) { return !!read().antilink[groupId]; },

    // --- MODE (self / public) ---
    setMode(mode) {
        const d = read();
        d.mode = mode;
        write(d);
    },
    getMode() { return read().mode; },

    // --- PREFIX ---
    setPrefix(sessionId, prefix) {
        const d = read();
        d.prefix[sessionId] = prefix;
        write(d);
    },
    getPrefix(sessionId, fallback) {
        const d = read();
        return d.prefix[sessionId] || fallback;
    },

    // --- AUTO TOGGLES ---
    setToggle(name, val) {
        const d = read();
        d.settings[name] = val;
        write(d);
    },
    getToggle(name) { return !!read().settings[name]; },
    getSettings() { return read().settings; },

    // --- PER-GROUP SETTINGS (antibot, chatbot, antidemote, antipromote, protectgc, autopromote...) ---
    setGroupToggle(groupId, name, val) {
        const d = read();
        d.groupToggles[groupId] = d.groupToggles[groupId] || {};
        d.groupToggles[groupId][name] = val;
        write(d);
    },
    getGroupToggle(groupId, name) {
        const d = read();
        return !!(d.groupToggles[groupId] && d.groupToggles[groupId][name]);
    },
    getAllGroupToggles(groupId) {
        return read().groupToggles[groupId] || {};
    },

    // --- GROUP NAME/DESCRIPTION CACHE (used by protectgc) ---
    cacheGroupMeta(groupId, meta) {
        const d = read();
        d.groupMetaCache[groupId] = meta;
        write(d);
    },
    getCachedGroupMeta(groupId) {
        return read().groupMetaCache[groupId] || null;
    },

    // --- PROGRAMMATION GROUPE (opentime / closetime) ---
    setSchedule(groupId, obj) {
        const d = read();
        d.groupSchedule[groupId] = Object.assign({}, d.groupSchedule[groupId], obj);
        write(d);
    },
    getSchedule(groupId) { return read().groupSchedule[groupId] || {}; },
    getAllSchedules() { return read().groupSchedule; }
};
