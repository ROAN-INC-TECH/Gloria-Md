// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
//
// Cache mémoire (non persistant) des messages récemment reçus.
// Utilisé par la fonction Antidelete pour pouvoir renvoyer le contenu
// d'un message après sa suppression (WhatsApp ne transmet que la
// référence du message supprimé, jamais son contenu).

const MAX_AGE_MS = 30 * 60 * 1000; // on garde chaque message 30 minutes max
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

// Nettoyage périodique pour éviter une fuite mémoire sur le long terme
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
        if (now - v.ts > MAX_AGE_MS) cache.delete(k);
    }
}, 5 * 60 * 1000);

module.exports = { save, get };
