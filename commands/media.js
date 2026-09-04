// === media.js ===
// Group protections, view-once, stickers, chatbot, and the .gcstatus broadcast tool.
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

// Finds a "view once" media regardless of how it's wrapped (varies across WhatsApp versions)
function unwrapViewOnce(content) {
    if (!content) return null;
    let node = content;
    // Possible wrappers
    if (node.viewOnceMessageV2) node = node.viewOnceMessageV2.message;
    else if (node.viewOnceMessageV2Extension) node = node.viewOnceMessageV2Extension.message;
    else if (node.viewOnceMessage) node = node.viewOnceMessage.message;

    if (!node) return null;

    const types = ['imageMessage', 'videoMessage', 'audioMessage'];
    for (const t of types) {
        if (node[t] && (node[t].viewOnce || content.viewOnceMessage || content.viewOnceMessageV2 || content.viewOnceMessageV2Extension)) {
            return { type: t, message: node };
        }
        // Some clients set viewOnce=true directly without a wrapper
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

    // ═══════════════════ GROUP PROTECTIONS ═══════════════════

    antidemote: {
        pattern: 'antidemote',
        desc: 'If a non-owner demotes an admin, they get demoted too (toggle)',
        category: 'group',
        use: '.antidemote on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Admins only.');
            if (!q) return reply(`📡 antidemote: *${store.getGroupToggle(from, 'antidemote') ? 'ON' : 'OFF'}*`);
            store.setGroupToggle(from, 'antidemote', q.toLowerCase() === 'on');
            reply(`✅ antidemote ${q.toLowerCase() === 'on' ? 'enabled: anyone who demotes an admin without permission will be demoted as well' : 'disabled'}.`);
        }
    },

    antipromote: {
        pattern: 'antipromote',
        desc: 'Only the owner/bot or the group creator can promote admins (toggle)',
        category: 'group',
        use: '.antipromote on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Admins only.');
            if (!q) return reply(`📡 antipromote: *${store.getGroupToggle(from, 'antipromote') ? 'ON' : 'OFF'}*`);
            store.setGroupToggle(from, 'antipromote', q.toLowerCase() === 'on');
            reply(`✅ antipromote ${q.toLowerCase() === 'on' ? 'enabled (only the owner/bot or the group creator can promote admins; anyone else who tries will be demoted along with the person they tried to promote)' : 'disabled'}.`);
        }
    },

    autopromote: {
        pattern: 'autopromote',
        desc: 'Automatically promote new members',
        category: 'group',
        use: '.autopromote on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Admins only.');
            if (!q) return reply(`📡 autopromote: *${store.getGroupToggle(from, 'autopromote') ? 'ON' : 'OFF'}*`);
            store.setGroupToggle(from, 'autopromote', q.toLowerCase() === 'on');
            reply(`✅ autopromote ${q.toLowerCase() === 'on' ? 'enabled' : 'disabled'}.`);
        }
    },

    // .gcstatus: reply to a sticker/image/video/link/text with this command and the
    // bot broadcasts that content to the whole group while tagging every member.
    gcstatus: {
        pattern: 'gcstatus',
        desc: 'Reply to a sticker/image/video/link/text to broadcast it to the group, tagging every member',
        category: 'group',
        use: '.gcstatus (reply to a sticker/image/video/link/text message)',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');

            // antigcstatus ON => only admins/owner may use .gcstatus
            if (store.getGroupToggle(from, 'antigcstatus')) {
                const { isAdmin } = await isGroupAdmin(conn, from, sender);
                if (!isAdmin && !isOwnerOrSudo(conn, sender)) {
                    return reply('❌ Antigcstatus is active: only admins can use .gcstatus in this group.');
                }
            }

            const quoted = m.quoted?.message?.message;
            if (!quoted) return reply('❌ Reply to a sticker, image, video, link or text message with .gcstatus.');

            let meta;
            try {
                meta = await conn.groupMetadata(from);
            } catch (e) {
                return reply('⚠️ Unable to fetch the group members list.');
            }
            const participants = meta.participants.map(p => p.id);
            const type = Object.keys(quoted)[0];

            try {
                if (type === 'stickerMessage') {
                    const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                    await conn.sendMessage(from, { sticker: buffer, mentions: participants });
                } else if (type === 'imageMessage') {
                    const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                    await conn.sendMessage(from, { image: buffer, caption: quoted.imageMessage.caption || '', mentions: participants });
                } else if (type === 'videoMessage') {
                    const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                    await conn.sendMessage(from, { video: buffer, caption: quoted.videoMessage.caption || '', mentions: participants });
                } else {
                    const text = quoted.conversation || quoted.extendedTextMessage?.text || '';
                    if (!text) return reply('❌ Unsupported quoted message type.');
                    await conn.sendMessage(from, { text, mentions: participants });
                }
            } catch (e) {
                reply('⚠️ Failed to broadcast this message to the group.');
            }
        }
    },

    // .antigcstatus: restricts .gcstatus to admins/owner only when enabled.
    antigcstatus: {
        pattern: 'antigcstatus',
        desc: 'Restrict the .gcstatus command to admins only',
        category: 'group',
        use: '.antigcstatus on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Admins only.');
            if (!q) return reply(`📡 antigcstatus: *${store.getGroupToggle(from, 'antigcstatus') ? 'ON' : 'OFF'}*`);
            const val = q.toLowerCase() === 'on';
            store.setGroupToggle(from, 'antigcstatus', val);
            reply(`✅ antigcstatus ${val ? 'enabled (only admins can now use .gcstatus in this group)' : 'disabled (everyone can use .gcstatus again)'}.`);
        }
    },

    // .protectgc: (formerly named "antigcstatus") restores the group name/description
    // whenever a non-admin changes it. Kept as its own command so it doesn't collide
    // with the new .gcstatus/.antigcstatus pair above.
    protectgc: {
        pattern: 'protectgc',
        desc: 'Automatically restore the group name/description if changed by a non-admin',
        category: 'group',
        use: '.protectgc on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Admins only.');
            if (!q) return reply(`📡 protectgc: *${store.getGroupToggle(from, 'protectgc') ? 'ON' : 'OFF'}*`);
            const val = q.toLowerCase() === 'on';
            if (val) {
                const meta = await conn.groupMetadata(from).catch(() => null);
                if (meta) store.cacheGroupMeta(from, { subject: meta.subject, desc: meta.desc });
            }
            store.setGroupToggle(from, 'protectgc', val);
            reply(`✅ protectgc ${val ? 'enabled' : 'disabled'}.`);
        }
    },

    // .antibot: while active, any message that looks like another bot's menu,
    // sent by a participant who is NOT an admin of the group, gets deleted.
    antibot: {
        pattern: 'antibot',
        desc: 'Delete menus posted by other bots that are not group admins',
        category: 'group',
        use: '.antibot on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            const { isAdmin } = isGroup ? await isGroupAdmin(conn, from, sender) : { isAdmin: false };
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Admins/owner only.');
            if (!q) return reply(`📡 antibot: *${store.getGroupToggle(from, 'antibot') ? 'ON' : 'OFF'}*`);
            store.setGroupToggle(from, 'antibot', q.toLowerCase() === 'on');
            reply(`✅ antibot ${q.toLowerCase() === 'on' ? 'enabled (menus from non-admin bots will be deleted automatically)' : 'disabled'}.`);
        }
    },

    // .gcsettings: (formerly named "gcstatus") shows the current toggle status for this group.
    gcsettings: {
        pattern: 'gcsettings',
        alias: ['groupsettings'],
        desc: 'Show the current settings for this group',
        category: 'group',
        use: '.gcsettings',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const on = (v) => v ? 'ON ✅' : 'OFF ❌';
            const text = `⚙️ *Group status*\n\n` +
                `🔗 Antilink: ${on(store.isAntilink(from))}\n` +
                `🛡️ Antidemote: ${on(store.getGroupToggle(from, 'antidemote'))}\n` +
                `🚫 Antipromote: ${on(store.getGroupToggle(from, 'antipromote'))}\n` +
                `⚡ Autopromote: ${on(store.getGroupToggle(from, 'autopromote'))}\n` +
                `📛 Protectgc: ${on(store.getGroupToggle(from, 'protectgc'))}\n` +
                `📢 Antigcstatus: ${on(store.getGroupToggle(from, 'antigcstatus'))}\n` +
                `🤖 Antibot: ${on(store.getGroupToggle(from, 'antibot'))}\n` +
                `🗑️ Antidelete: ${on(store.getToggle('antidelete'))}\n` +
                `🎒 Welcome: ${process.env.WELCOME_ENABLED !== 'false' ? 'ON ✅' : 'OFF ❌'}\n` +
                `🚤 Goodbye: ${process.env.GOODBYE_ENABLED !== 'false' ? 'ON ✅' : 'OFF ❌'}`;
            reply(text);
        }
    },

    antidelete: {
        pattern: 'antidelete',
        desc: 'Forward any deleted message (group or private) to the owner in DM',
        category: 'owner',
        use: '.antidelete on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Owner/sudo only.');
            if (!q) return reply(`📡 antidelete: *${store.getToggle('antidelete') ? 'ON' : 'OFF'}*`);
            store.setToggle('antidelete', q.toLowerCase() === 'on');
            reply(`✅ antidelete ${q.toLowerCase() === 'on' ? 'enabled: deleted messages (groups and DMs) will be forwarded to your DM' : 'disabled'}.`);
        }
    },

    setppgc: {
        pattern: 'setppgc',
        desc: "Replace the group photo with the tagged (replied) image",
        category: 'group',
        use: '.setppgc (reply to an image)',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isOwnerOrSudo(conn, sender)) return reply('❌ Admins/owner only.');
            const quoted = m.quoted?.message?.message;
            if (!quoted || !quoted.imageMessage) return reply('❌ Reply to an image with .setppgc');
            try {
                const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                await conn.updateProfilePicture(from, buffer);
                reply('✅ Group photo updated successfully.');
            } catch (e) {
                reply('⚠️ Update failed (the bot must be a group admin).');
            }
        }
    },

    // ═══════════════════ VIEW ONCE ═══════════════════

    antiviewonce: {
        pattern: 'antiviewonce',
        desc: 'Automatically capture "view once" media and forward it to your DM',
        category: 'owner',
        use: '.antiviewonce on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Owner/sudo only.');
            if (!q) return reply(`📡 antiviewonce: *${store.getToggle('antiviewonce') ? 'ON' : 'OFF'}*`);
            store.setToggle('antiviewonce', q.toLowerCase() === 'on');
            reply(`✅ antiviewonce ${q.toLowerCase() === 'on' ? 'enabled' : 'disabled'}.`);
        }
    },

    // .vv: unlock a "view once" media by replying to it. Whether used in a private
    // chat or in a group, the unlocked media is ALWAYS delivered to the WhatsApp
    // DM of the person who ran the command.
    vv: {
        pattern: 'vv',
        alias: ['viewonce'],
        desc: 'Unlock a "view once" media (reply to the message)',
        category: 'general',
        use: '.vv (reply to a view-once photo/video/audio)',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            const quotedContent = m.quoted?.message?.message;
            const found = unwrapViewOnce(quotedContent);
            if (!found) return reply('❌ Reply to a view-once photo/video/audio message.');
            try {
                const buffer = await downloadMediaMessage({ message: found.message, key: m.quoted.message.key }, 'buffer', {});
                const caption = `🔓 View-once media unlocked\n👤 Requested by: @${sender.split('@')[0]}`;
                const targetChat = sender; // always delivered to the DM of whoever ran the command
                if (found.type === 'imageMessage') {
                    await conn.sendMessage(targetChat, { image: buffer, caption });
                } else if (found.type === 'videoMessage') {
                    await conn.sendMessage(targetChat, { video: buffer, caption });
                } else if (found.type === 'audioMessage') {
                    await conn.sendMessage(targetChat, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
                }
                if (message.key.remoteJid !== targetChat) reply('✅ Media sent to your DM.');
            } catch (e) {
                reply('⚠️ Could not retrieve this media (it may have already expired).');
            }
        }
    },

    // .vvset: hidden alias of .vv, kept out of the menu on purpose. Reply to a
    // sticker (or an image/video) with it and it gets delivered to your own DM,
    // exactly like .vv does for view-once media.
    vvset: {
        pattern: 'vvset',
        hidden: true,
        desc: 'Hidden: reply to a sticker/image/video to get it delivered to your own DM (same delivery behavior as .vv)',
        category: 'general',
        use: '.vvset (reply to a sticker/image/video)',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            const quoted = m.quoted?.message?.message;
            const type = quoted ? Object.keys(quoted)[0] : null;
            if (!quoted || !['stickerMessage', 'imageMessage', 'videoMessage'].includes(type)) {
                return reply('❌ Reply to a sticker, image or video with .vvset');
            }
            try {
                const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                const caption = `🔓 Media unlocked via .vvset\n👤 Requested by: @${sender.split('@')[0]}`;
                const targetChat = sender; // always delivered to the DM of whoever ran the command
                if (type === 'stickerMessage') {
                    await conn.sendMessage(targetChat, { sticker: buffer });
                } else if (type === 'imageMessage') {
                    await conn.sendMessage(targetChat, { image: buffer, caption });
                } else if (type === 'videoMessage') {
                    await conn.sendMessage(targetChat, { video: buffer, caption });
                }
                if (message.key.remoteJid !== targetChat) reply('✅ Media sent to your DM.');
            } catch (e) {
                reply('⚠️ Could not retrieve this media.');
            }
        }
    },

    // ═══════════════════ STICKERS ═══════════════════

    take: {
        pattern: 'take',
        desc: `Recreate a sticker/image using the "${PACK_NAME}" pack`,
        category: 'general',
        use: '.take (reply to an image/video/sticker)',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            const quoted = m.quoted?.message?.message;
            const type = quoted ? Object.keys(quoted)[0] : null;
            if (!quoted || !['imageMessage', 'videoMessage', 'stickerMessage'].includes(type)) {
                return reply('❌ Reply to an image, video or sticker with .take');
            }
            try {
                const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                const webp = await makeSticker(buffer, type === 'videoMessage');
                await conn.sendMessage(message.key.remoteJid, { sticker: webp }, { quoted: message });
            } catch (e) {
                reply('⚠️ Sticker creation failed.');
            }
        }
    },

    sticker: {
        pattern: 'sticker',
        desc: 'Convert a sticker to an image',
        category: 'general',
        use: '.sticker (reply to a sticker)',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            const quoted = m.quoted?.message?.message;
            if (!quoted || !quoted.stickerMessage) return reply('❌ Reply to a sticker with .sticker');
            try {
                const buffer = await downloadMediaMessage({ message: quoted, key: m.quoted.message.key }, 'buffer', {});
                const png = await webpToPng(buffer);
                await conn.sendMessage(message.key.remoteJid, { image: png }, { quoted: message });
            } catch (e) {
                reply('⚠️ Conversion failed (animated stickers are not supported).');
            }
        }
    },

    tgstick: {
        pattern: 'tgstick',
        desc: `Fetch a Telegram sticker pack and rename it "${PACK_NAME}"`,
        category: 'general',
        use: '.tgstick <Telegram pack link>',
        filename: __filename,
        execute: async (conn, message, m, { args, reply }) => {
            const link = args[0];
            if (!link) return reply('❌ Provide a Telegram pack link. Example: .tgstick https://t.me/addstickers/PackName');
            const token = process.env.TELEGRAM_BOT_TOKEN;
            if (!token) return reply('❌ TELEGRAM_BOT_TOKEN is missing from .env (needed to read Telegram packs).');
            const packName = link.split('/').pop().replace('addstickers/', '');
            try {
                const axios = require('axios');
                const { data: setRes } = await axios.get(`https://api.telegram.org/bot${token}/getStickerSet?name=${packName}`);
                if (!setRes.ok) return reply('❌ Pack not found or invalid link.');
                const stickers = setRes.result.stickers.filter(s => !s.is_animated && !s.is_video).slice(0, 30);
                if (!stickers.length) return reply('❌ No static stickers found in this pack (animated packs are not supported).');
                reply(`📦 Sending ${stickers.length} sticker(s) from pack "${packName}" renamed to "${PACK_NAME}"...`);
                for (const s of stickers) {
                    try {
                        const { data: fileRes } = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${s.file_id}`);
                        const filePath = fileRes.result.file_path;
                        const { data: fileBuffer } = await axios.get(`https://api.telegram.org/file/bot${token}/${filePath}`, { responseType: 'arraybuffer' });
                        const webp = await makeSticker(Buffer.from(fileBuffer), false);
                        await conn.sendMessage(message.key.remoteJid, { sticker: webp });
                    } catch (e) {}
                }
            } catch (e) {
                reply('⚠️ Failed to fetch the Telegram pack.');
            }
        }
    },

    // ═══════════════════ CHATBOT ═══════════════════

    chatbot: {
        pattern: 'chatbot',
        desc: "Enable/disable the AI chatbot (replies to messages without a prefix)",
        category: 'owner',
        use: '.chatbot on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Owner/sudo only.');
            // Private chat: GLOBAL setting (applies to every DM conversation).
            // Group chat: setting scoped to THIS group only (to avoid spamming other groups).
            if (!isGroup) {
                if (!q) return reply(`📡 chatbot (private, all contacts): *${store.getToggle('chatbot_dm') ? 'ON' : 'OFF'}*`);
                store.setToggle('chatbot_dm', q.toLowerCase() === 'on');
                reply(`✅ chatbot ${q.toLowerCase() === 'on' ? 'enabled for ALL your private conversations' : 'disabled for all your private conversations'}.`);
            } else {
                if (!q) return reply(`📡 chatbot (this group): *${store.getGroupToggle(from, 'chatbot') ? 'ON' : 'OFF'}*`);
                store.setGroupToggle(from, 'chatbot', q.toLowerCase() === 'on');
                reply(`✅ chatbot ${q.toLowerCase() === 'on' ? 'enabled for this group' : 'disabled for this group'}.`);
            }
        }
    }
};
