// === media.js ===
// Nouvelles commandes ajoutées : protections de groupe, view-once, stickers, chatbot
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const store = require('../lib/store');
const { jidBase, isPrimaryOwner, isOwnerOrSudo, isGroupAdmin } = require('../lib/permissions');

const PACK_NAME = '༄𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗༆';

function ownerName() { return process.env.OWNER_NAME || '𝗠𝗥 𝗥𝗢𝗔𝗡'; }

// Trouve un média "view once" quel que soit son emballage (versions WhatsApp différentes)
function unwrapViewOnce(content) {
    if (!content) return null;
    let node = content;
    // Emballages possibles
    if (node.viewOnceMessageV2) node = node.viewOnceMessageV2.message;
    else if (node.viewOnceMessageV2Extension) node = node.viewOnceMessageV2Extension.message;
    else if (node.viewOnceMessage) node = node.viewOnceMessage.message;

    if (!node) return null;

    const types = ['imageMessage', 'videoMessage', 'audioMessage'];
    for (const t of types) {
        if (node[t] && (node[t].viewOnce || content.viewOnceMessage || content.viewOnceMessageV2 || content.viewOnceMessageV2Extension)) {
            return { type: t, message: node };
        }
        // Certains clients marquent viewOnce=true directement sans emballage
        if (node[t] && node[t].viewOnce) {
            return { type: t, message: node };
        }
    }
    return null;
}

async function webpToPng(webpBuffer) {
    const inPath = path.join(os.tmpdir(), crypto.randomBytes(6).toString('hex') + '.webp');
    const outPath = path.join(os.tmpdir(), crypto.randomBytes(6).toString('hex') + '.png');
    fs.writeFileSync(inPath, webpBuffer);
    await new Promise((resolve, reject) => {
        ffmpeg(inPath).on('error', reject).on('end', resolve).save(outPath);
    });
    const buf = fs.readFileSync(outPath);
    fs.unlinkSync(inPath);
    fs.unlinkSync(outPath);
    return buf;
}

async function makeSticker(buffer, isVideo) {
    const sticker = new Sticker(buffer, {
        pack: PACK_NAME,
        author: ownerName(),
        type: StickerTypes.FULL,
        quality: 60,
    });
    return sticker.toBuffer();
}

module.exports = {

    // ═══════════════════ PROTECTIONS DE GROUPE ═══════════════════

    antidemote: {
        pattern: 'antidemote',
        desc: 'Protéger le bot/propriétaire contre une rétrogradation',
        category: 'group',
        use: '.antidemote on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Réservé aux admins.');
            if (!q) return reply(`📡 antidemote : *${store.getGroupToggle(from, 'antidemote') ? 'ON' : 'OFF'}*`);
            store.setGroupToggle(from, 'antidemote', q.toLowerCase() === 'on');
            reply(`✅ antidemote ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    autopromote: {
        pattern: 'autopromote',
        desc: 'Promouvoir automatiquement les nouveaux membres',
        category: 'group',
        use: '.autopromote on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Réservé aux admins.');
            if (!q) return reply(`📡 autopromote : *${store.getGroupToggle(from, 'autopromote') ? 'ON' : 'OFF'}*`);
            store.setGroupToggle(from, 'autopromote', q.toLowerCase() === 'on');
            reply(`✅ autopromote ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    antigcstatus: {
        pattern: 'antigcstatus',
        desc: "Empêcher la modification du nom/description du groupe",
        category: 'group',
        use: '.antigcstatus on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Réservé aux admins.');
            if (!q) return reply(`📡 antigcstatus : *${store.getGroupToggle(from, 'antigcstatus') ? 'ON' : 'OFF'}*`);
            const val = q.toLowerCase() === 'on';
            if (val) {
                const meta = await conn.groupMetadata(from).catch(() => null);
                if (meta) store.cacheGroupMeta(from, { subject: meta.subject, desc: meta.desc });
            }
            store.setGroupToggle(from, 'antigcstatus', val);
            reply(`✅ antigcstatus ${val ? 'activé' : 'désactivé'}.`);
        }
    },

    antibot: {
        pattern: 'antibot',
        desc: 'Supprimer automatiquement le menu envoyé par le bot après un court délai',
        category: 'group',
        use: '.antibot on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            const { isAdmin } = isGroup ? await isGroupAdmin(conn, from, sender) : { isAdmin: false };
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Réservé aux admins/propriétaire.');
            if (!q) return reply(`📡 antibot : *${store.getGroupToggle(from, 'antibot') ? 'ON' : 'OFF'}*`);
            store.setGroupToggle(from, 'antibot', q.toLowerCase() === 'on');
            reply(`✅ antibot ${q.toLowerCase() === 'on' ? "activé (le menu s'autodétruira après envoi)" : 'désactivé'}.`);
        }
    },

    gcstatus: {
        pattern: 'gcstatus',
        desc: 'Afficher les réglages actuels du groupe',
        category: 'group',
        use: '.gcstatus',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const on = (v) => v ? 'ON ✅' : 'OFF ❌';
            const text = `⚙️ *Statut du groupe*\n\n` +
                `🔗 Antilink : ${on(store.isAntilink(from))}\n` +
                `🛡️ Antidemote : ${on(store.getGroupToggle(from, 'antidemote'))}\n` +
                `⚡ Autopromote : ${on(store.getGroupToggle(from, 'autopromote'))}\n` +
                `📛 Antigcstatus : ${on(store.getGroupToggle(from, 'antigcstatus'))}\n` +
                `🤖 Antibot : ${on(store.getGroupToggle(from, 'antibot'))}\n` +
                `🎒 Welcome : ${process.env.WELCOME_ENABLED !== 'false' ? 'ON ✅' : 'OFF ❌'}\n` +
                `🚤 Goodbye : ${process.env.GOODBYE_ENABLED !== 'false' ? 'ON ✅' : 'OFF ❌'}`;
            reply(text);
        }
    },

    // ═══════════════════ VIEW ONCE ═══════════════════

    antiviewonce: {
        pattern: 'antiviewonce',
        desc: 'Capturer automatiquement les médias "vue unique" et les renvoyer en privé',
        category: 'owner',
        use: '.antiviewonce on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Réservé au propriétaire/sudo.');
            if (!q) return reply(`📡 antiviewonce : *${store.getToggle('antiviewonce') ? 'ON' : 'OFF'}*`);
            store.setToggle('antiviewonce', q.toLowerCase() === 'on');
            reply(`✅ antiviewonce ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    vv: {
        pattern: 'vv',
        alias: ['viewonce'],
        desc: 'Débloquer un média "vue unique" (répondre au message)',
        category: 'general',
        use: '.vv (en réponse à une photo/vidéo/audio vue unique)',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            const quotedContent = m.quoted?.message?.message;
            const found = unwrapViewOnce(quotedContent);
            if (!found) return reply('❌ Réponds à un message photo/vidéo/audio en vue unique.');
            try {
                const buffer = await downloadMediaMessage({ message: found.message, key: m.quoted.message.key }, 'buffer', {});
                const caption = `🔓 Média vue unique débloqué\n👤 Demandé par : @${sender.split('@')[0]}`;
                const targetChat = sender; // toujours envoyé en privé à celui qui exécute la commande
                if (found.type === 'imageMessage') {
                    await conn.sendMessage(targetChat, { image: buffer, caption });
                } else if (found.type === 'videoMessage') {
                    await conn.sendMessage(targetChat, { video: buffer, caption });
                } else if (found.type === 'audioMessage') {
                    await conn.sendMessage(targetChat, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
                }
                if (message.key.remoteJid !== targetChat) reply('✅ Média envoyé dans ton privé.');
            } catch (e) {
                reply('⚠️ Impossible de récupérer ce média (il a peut-être déjà expiré).');
            }
        }
    },

    // ═══════════════════ STICKERS ═══════════════════

    take: {
        pattern: 'take',
        desc: `Recréer un sticker/image avec le pack "${PACK_NAME}"`,
        category: 'general',
        use: '.take (en réponse à une image/vidéo/sticker)',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            const quoted = m.quoted?.message?.message;
            const type = quoted ? Object.keys(quoted)[0] : null;
            if (!quoted || !['imageMessage', 'videoMessage', 'stickerMessage'].includes(type)) {
                return reply('❌ Réponds à une image, vidéo ou un sticker avec .take');
            }
            try {
                const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                const webp = await makeSticker(buffer, type === 'videoMessage');
                await conn.sendMessage(message.key.remoteJid, { sticker: webp }, { quoted: message });
            } catch (e) {
                reply('⚠️ Échec de la création du sticker.');
            }
        }
    },

    sticker: {
        pattern: 'sticker',
        desc: 'Convertir un sticker en image',
        category: 'general',
        use: '.sticker (en réponse à un sticker)',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            const quoted = m.quoted?.message?.message;
            if (!quoted || !quoted.stickerMessage) return reply('❌ Réponds à un sticker avec .sticker');
            try {
                const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                const png = await webpToPng(buffer);
                await conn.sendMessage(message.key.remoteJid, { image: png }, { quoted: message });
            } catch (e) {
                reply('⚠️ Échec de la conversion (sticker animé non supporté).');
            }
        }
    },

    tgstick: {
        pattern: 'tgstick',
        desc: `Récupérer un pack de stickers Telegram et le renommer "${PACK_NAME}"`,
        category: 'general',
        use: '.tgstick <lien du pack Telegram>',
        filename: __filename,
        execute: async (conn, message, m, { args, reply }) => {
            const link = args[0];
            if (!link) return reply('❌ Fournis un lien de pack Telegram. Exemple: .tgstick https://t.me/addstickers/NomDuPack');
            const token = process.env.TELEGRAM_BOT_TOKEN;
            if (!token) return reply('❌ TELEGRAM_BOT_TOKEN manquant dans .env (nécessaire pour lire les packs Telegram).');
            const packName = link.split('/').pop().replace('addstickers/', '');
            try {
                const fetch = require('node-fetch');
                const setRes = await fetch(`https://api.telegram.org/bot${token}/getStickerSet?name=${packName}`).then(r => r.json());
                if (!setRes.ok) return reply('❌ Pack introuvable ou lien invalide.');
                const stickers = setRes.result.stickers.filter(s => !s.is_animated && !s.is_video).slice(0, 30);
                if (!stickers.length) return reply('❌ Aucun sticker statique trouvé dans ce pack (les packs animés ne sont pas supportés).');
                reply(`📦 Envoi de ${stickers.length} sticker(s) du pack "${packName}" renommés "${PACK_NAME}"...`);
                for (const s of stickers) {
                    try {
                        const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${s.file_id}`).then(r => r.json());
                        const filePath = fileRes.result.file_path;
                        const fileBuffer = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`).then(r => r.buffer());
                        const webp = await makeSticker(fileBuffer, false);
                        await conn.sendMessage(message.key.remoteJid, { sticker: webp });
                    } catch (e) {}
                }
            } catch (e) {
                reply('⚠️ Échec de la récupération du pack Telegram.');
            }
        }
    },

    // ═══════════════════ CHATBOT ═══════════════════

    chatbot: {
        pattern: 'chatbot',
        desc: "Activer/désactiver le chatbot IA (répond aux messages sans préfixe)",
        category: 'owner',
        use: '.chatbot on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Réservé au propriétaire/sudo.');
            // En privé : réglage GLOBAL (s'applique à toutes les conversations privées).
            // En groupe : réglage propre à CE groupe uniquement (pour éviter le spam ailleurs).
            if (!isGroup) {
                if (!q) return reply(`📡 chatbot (privé, tous les contacts) : *${store.getToggle('chatbot_dm') ? 'ON' : 'OFF'}*`);
                store.setToggle('chatbot_dm', q.toLowerCase() === 'on');
                reply(`✅ chatbot ${q.toLowerCase() === 'on' ? 'activé pour TOUTES tes conversations privées' : 'désactivé pour toutes tes conversations privées'}.`);
            } else {
                if (!q) return reply(`📡 chatbot (ce groupe) : *${store.getGroupToggle(from, 'chatbot') ? 'ON' : 'OFF'}*`);
                store.setGroupToggle(from, 'chatbot', q.toLowerCase() === 'on');
                reply(`✅ chatbot ${q.toLowerCase() === 'on' ? 'activé sur ce groupe' : 'désactivé sur ce groupe'}.`);
            }
        }
    }
};
