// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
const store = require('./store');

function jidBase(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function getEnvOwners() {
    return (process.env.OWNER_NUMBER || '')
        .split(',')
        .map(n => n.trim())
        .filter(Boolean);
}

// Le vrai propriétaire (numéro du bot ou numéro déclaré dans .env)
function isPrimaryOwner(conn, sender) {
    const senderBase = jidBase(sender);
    const botBase = jidBase(conn?.user?.id);
    return senderBase === botBase || getEnvOwners().includes(senderBase);
}

// Propriétaire OU sudo (utilisateurs de confiance)
function isOwnerOrSudo(conn, sender) {
    const senderBase = jidBase(sender);
    if (isPrimaryOwner(conn, sender)) return true;
    const sudos = store.getSudo().map(jidBase);
    return sudos.includes(senderBase);
}

async function isGroupAdmin(conn, from, sender) {
    try {
        const metadata = await conn.groupMetadata(from);
        const participant = metadata.participants.find(p => jidBase(p.id) === jidBase(sender));
        return {
            isAdmin: participant?.admin === 'admin' || participant?.admin === 'superadmin',
            isCreator: participant?.admin === 'superadmin',
            metadata
        };
    } catch (e) {
        return { isAdmin: false, isCreator: false, metadata: null };
    }
}

module.exports = { jidBase, getEnvOwners, isPrimaryOwner, isOwnerOrSudo, isGroupAdmin };
