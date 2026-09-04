// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
//
// In-memory (non-persistent) cache of recently received messages.
// Used by the Antidelete feature to be able to resend a message's content
// after it gets deleted (WhatsApp only ever transmits a reference to the
// deleted message, never its actual content).

const MAX_AGE_MS = 30 * 60 * 1000; // keep each message for at most 30 minutes
const cache = new Map();

function key(remoteJid, id) {
    return `${remoteJid}::${id}`;
}

function save(remoteJid, id, data) {
    if (!remoteJid || !id) return;
    cache.set(key(remoteJid, id), Object.assign({}, data, { ts: Date.now() }));
}

function get(remoteJid, id) {
    if (!remoteJid || !id) return null;
    return cache.get(key(remoteJid, id)) || null;
}

// Periodic cleanup to avoid a long-term memory leak
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
        if (now - v.ts > MAX_AGE_MS) cache.delete(k);
    }
}, 5 * 60 * 1000);

module.exports = { save, get };
