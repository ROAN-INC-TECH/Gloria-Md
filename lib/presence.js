// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
const cache = new Map(); // jid -> { presence, lastSeen }

function update(jid, presence) {
    cache.set(jid, { presence, lastSeen: Date.now() });
}

function isOnline(jid, windowMs = 2 * 60 * 1000) {
    const entry = cache.get(jid);
    if (!entry) return false;
    if (entry.presence === 'available' || entry.presence === 'composing' || entry.presence === 'recording') return true;
    return Date.now() - entry.lastSeen < windowMs;
}

function getAll() { return cache; }

module.exports = { update, isOnline, getAll };
