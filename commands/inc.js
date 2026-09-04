// BOT NAME  ➳ GLORIA MD
// BOT DEV   ➳ MR ROAN
// CONTACT DEV ➳ +237689301479
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const store = require('../lib/store');
const { jidBase, isPrimaryOwner, isOwnerOrSudo, isGroupAdmin } = require('../lib/permissions');
const presence = require('../lib/presence');

const BOT_NAME = () => process.env.BOT_NAME || '𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗';

async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch (e) {}
}

function getTarget(m) {
    if (m.mentionedJid && m.mentionedJid.length > 0) return m.mentionedJid[0];
    if (m.quoted && m.quoted.sender) return m.quoted.sender;
    return null;
}

module.exports = {

    // ═══════════════════ GROUP COMMANDS ═══════════════════

    tagall: {
        pattern: 'tagall',
        desc: 'Mention every member of the group',
        category: 'group',
        use: '.tagall [message]',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin, metadata } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins or owner only.');
            if (!metadata) return reply('❌ Unable to fetch group info.');
            const participants = metadata.participants;
            let teks = `༄ *𝗚𝗿𝗼𝘂𝗽*: ${metadata.subject}\n༄ *𝗠𝗲𝗺𝗯𝗲𝗿𝘀*: ${participants.length}\n༄ *𝗠𝗲𝘀𝘀𝗮𝗴𝗲*: ${q || 'Attention everyone!'}\n\n┌───❁ *𝗠𝗘𝗡𝗧𝗜𝗢𝗡𝗦*\n`;
            participants.forEach(p => { teks += `│📢 @${p.id.split('@')[0]}\n`; });
            teks += `└──༄ ${BOT_NAME()} ༄──`;
            await conn.sendMessage(from, { text: teks, mentions: participants.map(p => p.id) }, { quoted: message });
        }
    },

    hidetag: {
        pattern: 'hidetag',
        desc: 'Mention everyone without showing the list (hidden tag)',
        category: 'group',
        use: '.hidetag [message]',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin, metadata } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins or owner only.');
            if (!metadata) return reply('❌ Unable to fetch group info.');
            await conn.sendMessage(from, {
                text: q || `📢 ${BOT_NAME()}`,
                mentions: metadata.participants.map(p => p.id)
            }, { quoted: message });
        }
    },

    tagadmins: {
        pattern: 'tagadmins',
        desc: "Mention all admins of the group",
        category: 'group',
        use: '.tagadmins [message]',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            let metadata;
            try { metadata = await conn.groupMetadata(from); } catch { return reply('❌ Unable to fetch group info.'); }
            const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
            if (!admins.length) return reply('❌ No admins found.');
            let teks = `༄ *𝗚𝗿𝗼𝘂𝗽*: ${metadata.subject}\n༄ *𝗠𝗲𝘀𝘀𝗮𝗴𝗲*: ${q || 'Attention admins!'}\n\n┌───❁ *𝗔𝗗𝗠𝗜𝗡𝗦*\n`;
            admins.forEach(a => { teks += `│🌹 @${a.split('@')[0]}\n`; });
            teks += `└──༄ ${BOT_NAME()} ༄──`;
            await conn.sendMessage(from, { text: teks, mentions: admins }, { quoted: message });
        }
    },

    idch: {
        pattern: 'idch',
        alias: ['getchannelid'],
        desc: "Get a WhatsApp channel's JID (@newsletter) from its invite link",
        category: 'general',
        use: '.idch <WhatsApp channel link>',
        filename: __filename,
        execute: async (conn, message, m, { q, reply }) => {
            const input = (q || '').trim();
            if (!input) return reply('❌ Provide the channel link. Example: .idch https://whatsapp.com/channel/0029VaXXXXXXXXXXXXXX');
            // Accepts the full link or just the invite code
            const match = input.match(/channel\/([A-Za-z0-9]+)/i);
            const inviteCode = match ? match[1] : input.replace(/[^A-Za-z0-9]/g, '');
            if (!inviteCode) return reply('❌ Invalid link. Example: .idch https://whatsapp.com/channel/0029VaXXXXXXXXXXXXXX');
            try {
                if (!conn.newsletterMetadata) return reply("❌ Not supported by this version of Baileys.");
                const meta = await conn.newsletterMetadata('invite', inviteCode);
                if (!meta || !meta.id) return reply('❌ Channel not found. Check the link.');
                const name = (meta.name && meta.name.text) || meta.name || 'Unknown';
                const text = `📡 *𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽 𝗰𝗵𝗮𝗻𝗻𝗲𝗹 𝗶𝗻𝗳𝗼*\n\n` +
                    `📛 Name: ${name}\n` +
                    `🆔 JID: ${meta.id}\n` +
                    `👥 Followers: ${meta.subscribers ?? 'N/A'}`;
                reply(text);
            } catch (e) {
                reply('⚠️ Unable to fetch info for this channel (invalid or expired link).');
            }
        }
    },

    promote: {
        pattern: 'promote',
        desc: 'Promote a member to admin',
        category: 'group',
        react: '🖤',
        use: '.promote @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            try {
                await conn.groupParticipantsUpdate(from, [target], 'promote');
                await react(conn, from, message.key, '✅');
                await conn.sendMessage(from, { text: `⚡ @${target.split('@')[0]} is now an admin`, mentions: [target] }, { quoted: message });
            } catch (e) { await react(conn, from, message.key, '❌'); reply('⚠️ Promotion failed.'); }
        }
    },

    demote: {
        pattern: 'demote',
        desc: 'Demote an admin',
        category: 'group',
        react: '🖤',
        use: '.demote @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            try {
                await conn.groupParticipantsUpdate(from, [target], 'demote');
                await react(conn, from, message.key, '✅');
                await conn.sendMessage(from, { text: `⬇️ @${target.split('@')[0]} is no longer an admin`, mentions: [target] }, { quoted: message });
            } catch (e) { await react(conn, from, message.key, '❌'); reply('⚠️ Demotion failed.'); }
        }
    },

    hijack: {
        pattern: 'hijack',
        desc: 'Change the name and description of the group where the command is run',
        category: 'owner',
        use: '.hijack [new name]',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Owner/sudo only.');
            const metadata = await conn.groupMetadata(from).catch(() => null);
            if (!metadata) return reply('❌ Unable to fetch group info.');
            const botId = jidBase(conn.user.id);
            const botIsAdmin = metadata.participants?.some(p => jidBase(p.id) === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
            if (!botIsAdmin) return reply('❌ The bot must be an admin of this group to run this command.');
            const newName = (q || `☠️ ${BOT_NAME()} TOOK OVER ☠️`).slice(0, 25);
            const newDesc = `This group was taken over by ${BOT_NAME()} 🖤\nDev: ${process.env.OWNER_NAME || 'MR ROAN'}`;
            try {
                await conn.groupUpdateSubject(from, newName);
                await conn.groupUpdateDescription(from, newDesc);
                reply(`✅ Group name and description updated.`);
            } catch (e) {
                reply('⚠️ Failed (make sure the bot is an admin).');
            }
        }
    },

    kick: {
        pattern: 'kick',
        desc: 'Remove a member from the group',
        category: 'group',
        react: '🖤',
        use: '.kick @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            try {
                await conn.groupParticipantsUpdate(from, [target], 'remove');
                await react(conn, from, message.key, '👢');
                await conn.sendMessage(from, { text: `👢 @${target.split('@')[0]} was removed`, mentions: [target] }, { quoted: message });
            } catch (e) { await react(conn, from, message.key, '❌'); reply("⚠️ Removal failed."); }
        }
    },

    add: {
        pattern: 'add',
        desc: 'Add a member to the group',
        category: 'group',
        use: '.add 2376xxxxxxxx',
        filename: __filename,
        execute: async (conn, message, m, { args, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            const number = (args[0] || '').replace(/[^0-9]/g, '');
            if (!number) return reply('❌ Provide a number. Example: .add 2376xxxxxxxx');
            const jid = `${number}@s.whatsapp.net`;
            try {
                await conn.groupParticipantsUpdate(from, [jid], 'add');
                reply(`✅ @${number} added to the group.`);
            } catch (e) { reply('⚠️ Failed to add (the number must accept direct adds).'); }
        }
    },

    mute: {
        pattern: 'mute',
        desc: 'Close the group (only admins can post)',
        category: 'group',
        react: '🖤',
        use: '.mute',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            try {
                await conn.groupSettingUpdate(from, 'announcement');
                await react(conn, from, message.key, '🔒');
                reply('🔒 Group closed, only admins can post.');
            } catch (e) { reply('⚠️ Failed.'); }
        }
    },

    unmute: {
        pattern: 'unmute',
        desc: 'Reopen the group (everyone can post)',
        category: 'group',
        react: '🔓',
        use: '.unmute',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            try {
                await conn.groupSettingUpdate(from, 'not_announcement');
                await react(conn, from, message.key, '🔓');
                reply('🔓 Group opened, everyone can post.');
            } catch (e) { reply('⚠️ Failed.'); }
        }
    },

    left: {
        pattern: 'left',
        desc: 'Make the bot leave the group',
        category: 'group',
        use: '.left',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            await reply('👋 See you soon!');
            try { await conn.groupLeave(from); } catch (e) {}
        }
    },

    grouplink: {
        pattern: 'grouplink',
        desc: "Get the group's invite link",
        category: 'group',
        react: '🖤',
        use: '.grouplink',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            try {
                const code = await conn.groupInviteCode(from);
                reply(`🔗 https://chat.whatsapp.com/${code}`);
            } catch (e) { reply('❌ I need to be an admin to generate the link.'); }
        }
    },

    resetlink: {
        pattern: 'resetlink',
        desc: "Reset the invite link",
        category: 'group',
        react: '🖤',
        use: '.resetlink',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            try {
                const code = await conn.groupRevokeInvite(from);
                reply(`♻️ New link: https://chat.whatsapp.com/${code}`);
            } catch (e) { reply('❌ I need to be an admin to reset the link.'); }
        }
    },

    kickadmins: {
        pattern: 'kickadmins',
        desc: 'Remove all admins (except the owner)',
        category: 'group',
        use: '.kickadmins',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const metadata = await conn.groupMetadata(from);
            const targets = metadata.participants
                .filter(p => (p.admin === 'admin' || p.admin === 'superadmin') && jidBase(p.id) !== jidBase(sender))
                .map(p => p.id);
            if (!targets.length) return reply('ℹ️ No admins to remove.');
            for (const t of targets) { try { await conn.groupParticipantsUpdate(from, [t], 'remove'); } catch (e) {} }
            reply(`👢 ${targets.length} admin(s) removed.`);
        }
    },

    kickall: {
        pattern: 'kickall',
        desc: 'Remove all non-admin members',
        category: 'group',
        use: '.kickall',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const metadata = await conn.groupMetadata(from);
            const botBase = jidBase(conn.user.id);
            const targets = metadata.participants
                .filter(p => !p.admin && jidBase(p.id) !== botBase)
                .map(p => p.id);
            if (!targets.length) return reply('ℹ️ No members to remove.');
            for (const t of targets) { try { await conn.groupParticipantsUpdate(from, [t], 'remove'); } catch (e) {} }
            reply(`👢 ${targets.length} member(s) removed.`);
        }
    },

    listadmins: {
        pattern: 'listadmins',
        desc: 'List the admins of the group',
        category: 'group',
        use: '.listadmins',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const metadata = await conn.groupMetadata(from);
            const admins = metadata.participants.filter(p => p.admin);
            if (!admins.length) return reply('ℹ️ No admins found.');
            let text = `👑 *Admins of ${metadata.subject}*\n\n`;
            admins.forEach(a => { text += `• @${a.id.split('@')[0]} ${a.admin === 'superadmin' ? '(creator)' : ''}\n`; });
            await conn.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: message });
        }
    },

    listonline: {
        pattern: 'listonline',
        desc: 'List members who are currently online (best-effort)',
        category: 'group',
        use: '.listonline',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const metadata = await conn.groupMetadata(from);
            const online = metadata.participants.filter(p => presence.isOnline(p.id));
            if (!online.length) return reply('ℹ️ No presence data available right now (members need to have sent a message recently).');
            let text = `🟢 *Online members*\n\n`;
            online.forEach(p => { text += `• @${p.id.split('@')[0]}\n`; });
            await conn.sendMessage(from, { text, mentions: online.map(p => p.id) }, { quoted: message });
        }
    },

    opentime: {
        pattern: 'opentime',
        desc: 'Schedule a daily automatic group opening (HH:MM)',
        category: 'group',
        use: '.opentime 07:00',
        filename: __filename,
        execute: async (conn, message, m, { args, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            const time = args[0];
            if (!time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return reply('❌ Invalid format. Example: .opentime 07:00');
            store.setSchedule(from, { openTime: time });
            reply(`✅ Automatic opening scheduled for ${time} every day.`);
        }
    },

    closetime: {
        pattern: 'closetime',
        desc: 'Schedule a daily automatic group closing (HH:MM)',
        category: 'group',
        use: '.closetime 23:00',
        filename: __filename,
        execute: async (conn, message, m, { args, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            const time = args[0];
            if (!time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return reply('❌ Invalid format. Example: .closetime 23:00');
            store.setSchedule(from, { closeTime: time });
            reply(`✅ Automatic closing scheduled for ${time} every day.`);
        }
    },

    antilink: {
        pattern: 'antilink',
        desc: 'Enable/disable automatic link deletion',
        category: 'group',
        use: '.antilink on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            if (!q) return reply(`⚙️ Use .antilink on / .antilink off\n📡 Current status: *${store.isAntilink(from) ? 'ON ✅' : 'OFF ❌'}*`);
            const val = q.toLowerCase() === 'on';
            store.setAntilink(from, val);
            reply(`${val ? '✅ Antilink enabled.' : '❌ Antilink disabled.'}`);
        }
    },

    vcf: {
        pattern: 'vcf',
        desc: 'Export the group members as a VCF file',
        category: 'group',
        use: '.vcf',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const metadata = await conn.groupMetadata(from);
            let vcf = '';
            metadata.participants.forEach((p, i) => {
                const num = p.id.split('@')[0];
                vcf += `BEGIN:VCARD\nVERSION:3.0\nFN:Member ${i + 1}\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD\n`;
            });
            await conn.sendMessage(from, {
                document: Buffer.from(vcf, 'utf8'),
                mimetype: 'text/vcard',
                fileName: `${metadata.subject}-contacts.vcf`
            }, { quoted: message });
        }
    },

    creategroup: {
        pattern: 'creategroup',
        desc: 'Create a new group',
        category: 'group',
        use: '.creategroup Name|2376xx,2376yy',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            if (!q || !q.includes('|')) return reply('❌ Format: .creategroup Group name|2376xx,2376yy');
            const [name, numbersStr] = q.split('|');
            const numbers = numbersStr.split(',').map(n => n.trim().replace(/[^0-9]/g, '')).filter(Boolean);
            const jids = numbers.map(n => `${n}@s.whatsapp.net`);
            try {
                const group = await conn.groupCreate(name.trim(), jids);
                reply(`✅ Group "${name.trim()}" created successfully.`);
            } catch (e) { reply('⚠️ Failed to create the group.'); }
        }
    },

    join: {
        pattern: 'join',
        desc: "Join a group via an invite link",
        category: 'group',
        use: '.join https://chat.whatsapp.com/xxxx',
        filename: __filename,
        execute: async (conn, message, m, { args, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const link = args[0];
            if (!link) return reply("❌ Provide an invite link.");
            const code = link.split('https://chat.whatsapp.com/')[1];
            if (!code) return reply('❌ Invalid link.');
            try {
                await conn.groupAcceptInvite(code);
                reply('✅ Successfully joined the group.');
            } catch (e) { reply('⚠️ Failed, the link may be invalid or expired.'); }
        }
    },

    closegc: {
        pattern: 'closegc',
        desc: 'Lock the group info (only admins can edit)',
        category: 'group',
        use: '.closegc',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            try {
                await conn.groupSettingUpdate(from, 'locked');
                reply('🔒 Only admins can edit the group info now.');
            } catch (e) { reply('⚠️ Failed.'); }
        }
    },

    opengc: {
        pattern: 'opengc',
        desc: 'Unlock the group info (everyone can edit)',
        category: 'group',
        use: '.opengc',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            try {
                await conn.groupSettingUpdate(from, 'unlocked');
                reply('🔓 Everyone can edit the group info now.');
            } catch (e) { reply('⚠️ Failed.'); }
        }
    },

    warn: {
        pattern: 'warn',
        desc: 'Warn a member (3 warnings = removal)',
        category: 'group',
        use: '.warn @user [reason]',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            const count = store.addWarn(from, target);
            await conn.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} received a warning (${count}/3)${q ? `\nReason: ${q}` : ''}`, mentions: [target] }, { quoted: message });
            if (count >= 3) {
                try {
                    await conn.groupParticipantsUpdate(from, [target], 'remove');
                    store.resetWarn(from, target);
                    conn.sendMessage(from, { text: `👢 @${target.split('@')[0]} removed after 3 warnings.`, mentions: [target] });
                } catch (e) {}
            }
        }
    },

    warns: {
        pattern: 'warns',
        desc: "View a member's warnings",
        category: 'group',
        use: '.warns @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const target = getTarget(m);
            if (!target) {
                const all = store.getAllWarns(from);
                const keys = Object.keys(all);
                if (!keys.length) return reply('ℹ️ No warnings recorded in this group.');
                let text = '⚠️ *Group warnings*\n\n';
                keys.forEach(k => { text += `• @${k.split('@')[0]}: ${all[k]}/3\n`; });
                return conn.sendMessage(from, { text, mentions: keys }, { quoted: message });
            }
            const count = store.getWarn(from, target);
            await conn.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} has ${count}/3 warning(s).`, mentions: [target] }, { quoted: message });
        }
    },

    resetwarn: {
        pattern: 'resetwarn',
        desc: "Reset a member's warnings",
        category: 'group',
        use: '.resetwarn @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Command only available in groups.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            store.resetWarn(from, target);
            await conn.sendMessage(from, { text: `♻️ Warnings for @${target.split('@')[0]} have been reset.`, mentions: [target] }, { quoted: message });
        }
    },

    // ═══════════════════ WELCOME / GOODBYE ═══════════════════

    welcome: {
        pattern: 'welcome',
        desc: 'Enable/disable the welcome message',
        category: 'group',
        react: '🖤',
        use: '.welcome on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
            const { isAdmin } = isGroup ? await isGroupAdmin(conn, from, sender) : { isAdmin: false };
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins or owner only.');
            if (!q) return reply(`⚙️ Use .welcome on / .welcome off\n📡 Status: *${process.env.WELCOME_ENABLED === 'false' ? 'OFF ❌' : 'ON ✅'}*`);
            process.env.WELCOME_ENABLED = q.toLowerCase() === 'on' ? 'true' : 'false';
            reply(process.env.WELCOME_ENABLED === 'true' ? '✅ Welcome messages enabled.' : '❌ Welcome messages disabled.');
        }
    },

    goodbye: {
        pattern: 'goodbye',
        desc: 'Enable/disable the goodbye message',
        category: 'group',
        react: '🖤',
        use: '.goodbye on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
            const { isAdmin } = isGroup ? await isGroupAdmin(conn, from, sender) : { isAdmin: false };
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Admins or owner only.');
            if (!q) return reply(`⚙️ Use .goodbye on / .goodbye off\n📡 Status: *${process.env.GOODBYE_ENABLED === 'false' ? 'OFF ❌' : 'ON ✅'}*`);
            process.env.GOODBYE_ENABLED = q.toLowerCase() === 'on' ? 'true' : 'false';
            reply(process.env.GOODBYE_ENABLED === 'true' ? '✅ Goodbye messages enabled.' : '❌ Goodbye messages disabled.');
        }
    },

    // ═══════════════════ OWNER / BOT COMMANDS ═══════════════════

    owner: {
        pattern: 'owner',
        desc: "Owner's contact",
        category: 'owner',
        use: '.owner',
        filename: __filename,
        execute: async (conn, message, m, { from, reply }) => {
            const number = (process.env.OWNER_NUMBER || '').split(',')[0] || jidBase(conn.user.id);
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${process.env.OWNER_NAME || 'Owner'}\nTEL;type=CELL;type=VOICE;waid=${number}:+${number}\nEND:VCARD`;
            await conn.sendMessage(from, { contacts: { displayName: process.env.OWNER_NAME || 'Owner', contacts: [{ vcard }] } }, { quoted: message });
        }
    },

    repo: {
        pattern: 'repo',
        desc: 'Repository / source code link',
        category: 'owner',
        use: '.repo',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            reply(`📦 Repository: ${process.env.REPO_LINK || 'https://github.com'}`);
        }
    },

    getpp: {
        pattern: 'getpp',
        desc: "Get a user's or the group's profile picture",
        category: 'owner',
        use: '.getpp [@user] (or alone in a group for the group photo)',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            const target = getTarget(m) || (!isGroup ? from : null) || from;
            try {
                const url = await conn.profilePictureUrl(target, 'image');
                await conn.sendMessage(message.key.remoteJid, { image: { url }, caption: `🖼️ Profile picture` }, { quoted: message });
            } catch (e) {
                reply('❌ Unable to fetch this profile picture (maybe no picture is set).');
            }
        }
    },

    setprefix: {
        pattern: 'setprefix',
        desc: 'Change the command prefix',
        category: 'owner',
        use: '.setprefix !',
        filename: __filename,
        execute: async (conn, message, m, { args, reply, sender, sessionId }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const newPrefix = args[0];
            if (!newPrefix) return reply('❌ Provide a new prefix. Example: .setprefix !');
            store.setPrefix(sessionId, newPrefix);
            reply(`✅ Prefix changed to: ${newPrefix}`);
        }
    },

    restart: {
        pattern: 'restart',
        desc: 'Restart the bot',
        category: 'owner',
        use: '.restart',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            await reply('🔄 Restarting...');
            setTimeout(() => process.exit(0), 1000);
        }
    },

    eval: {
        pattern: 'eval',
        desc: 'Run JS code (owner only, for debugging)',
        category: 'owner',
        use: '.eval <code>',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            if (!q) return reply('❌ Provide code to run.');
            try {
                let result = eval(q);
                if (typeof result !== 'string') result = require('util').inspect(result);
                reply('```\n' + result + '\n```');
            } catch (e) { reply('⚠️ Error: ' + e.message); }
        }
    },

    ban: {
        pattern: 'ban',
        desc: 'Ban a user (the bot will ignore their commands)',
        category: 'owner',
        use: '.ban @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Owner/sudo only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            store.ban(jidBase(target));
            await conn.sendMessage(message.key.remoteJid, { text: `🚫 @${target.split('@')[0]} banned.`, mentions: [target] }, { quoted: message });
        }
    },

    unban: {
        pattern: 'unban',
        desc: 'Unban a user',
        category: 'owner',
        use: '.unban @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Owner/sudo only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            store.unban(jidBase(target));
            await conn.sendMessage(message.key.remoteJid, { text: `✅ @${target.split('@')[0]} unbanned.`, mentions: [target] }, { quoted: message });
        }
    },

    self: {
        pattern: 'self',
        desc: "Private mode: the bot only replies to the owner",
        category: 'owner',
        use: '.self',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Owner/sudo only.');
            store.setMode('self');
            reply('🔒 SELF mode enabled: only the owner can use the bot.');
        }
    },

    public: {
        pattern: 'public',
        desc: 'Public mode: anyone can use the bot',
        category: 'owner',
        use: '.public',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Owner/sudo only.');
            store.setMode('public');
            reply('🌍 PUBLIC mode enabled: anyone can use the bot.');
        }
    },

    mode: {
        pattern: 'mode',
        desc: "Show the bot's current mode",
        category: 'owner',
        use: '.mode',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            reply(`⚙️ Current mode: *${store.getMode().toUpperCase()}*`);
        }
    },

    autoread: {
        pattern: 'autoread',
        desc: 'Enable/disable automatic read receipts',
        category: 'owner',
        use: '.autoread on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            if (!q) return reply(`📡 autoread: *${store.getToggle('autoread') ? 'ON' : 'OFF'}*`);
            store.setToggle('autoread', q.toLowerCase() === 'on');
            reply(`✅ autoread ${q.toLowerCase() === 'on' ? 'enabled' : 'disabled'}.`);
        }
    },

    autobio: {
        pattern: 'autobio',
        desc: "Automatically update the bot's status/bio",
        category: 'owner',
        use: '.autobio on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            if (!q) return reply(`📡 autobio: *${store.getToggle('autobio') ? 'ON' : 'OFF'}*`);
            store.setToggle('autobio', q.toLowerCase() === 'on');
            reply(`✅ autobio ${q.toLowerCase() === 'on' ? 'enabled' : 'disabled'}.`);
        }
    },

    autorecording: {
        pattern: 'autorecording',
        desc: 'Continuously simulate an audio recording',
        category: 'owner',
        use: '.autorecording on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            if (!q) return reply(`📡 autorecording: *${store.getToggle('autorecording') ? 'ON' : 'OFF'}*`);
            store.setToggle('autorecording', q.toLowerCase() === 'on');
            if (q.toLowerCase() === 'on') store.setToggle('autotyping', false);
            reply(`✅ autorecording ${q.toLowerCase() === 'on' ? 'enabled' : 'disabled'}.`);
        }
    },

    autotyping: {
        pattern: 'autotyping',
        desc: 'Continuously simulate typing',
        category: 'owner',
        use: '.autotyping on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            if (!q) return reply(`📡 autotyping: *${store.getToggle('autotyping') ? 'ON' : 'OFF'}*`);
            store.setToggle('autotyping', q.toLowerCase() === 'on');
            if (q.toLowerCase() === 'on') store.setToggle('autorecording', false);
            reply(`✅ autotyping ${q.toLowerCase() === 'on' ? 'enabled' : 'disabled'}.`);
        }
    },

    autoviewstatus: {
        pattern: 'autoviewstatus',
        desc: "Automatically view contacts' statuses",
        category: 'owner',
        use: '.autoviewstatus on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            if (!q) return reply(`📡 autoviewstatus: *${store.getToggle('autoviewstatus') ? 'ON' : 'OFF'}*`);
            store.setToggle('autoviewstatus', q.toLowerCase() === 'on');
            reply(`✅ autoviewstatus ${q.toLowerCase() === 'on' ? 'enabled' : 'disabled'}.`);
        }
    },

    autoreact: {
        pattern: 'autoreact',
        desc: 'Automatically react to received messages',
        category: 'owner',
        use: '.autoreact on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            if (!q) return reply(`📡 autoreact: *${store.getToggle('autoreact') ? 'ON' : 'OFF'}*`);
            store.setToggle('autoreact', q.toLowerCase() === 'on');
            reply(`✅ autoreact ${q.toLowerCase() === 'on' ? 'enabled' : 'disabled'}.`);
        }
    },

    block: {
        pattern: 'block',
        desc: 'Block a WhatsApp contact',
        category: 'owner',
        use: '.block @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            try { await conn.updateBlockStatus(target, 'block'); reply(`🚫 @${target.split('@')[0]} blocked.`); }
            catch (e) { reply('⚠️ Block failed.'); }
        }
    },

    unblock: {
        pattern: 'unblock',
        desc: 'Unblock a WhatsApp contact',
        category: 'owner',
        use: '.unblock @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            try { await conn.updateBlockStatus(target, 'unblock'); reply(`✅ @${target.split('@')[0]} unblocked.`); }
            catch (e) { reply('⚠️ Unblock failed.'); }
        }
    },

    delete: {
        pattern: 'delete',
        desc: "Delete one of the bot's messages (reply to it)",
        category: 'owner',
        use: ".delete (reply to a message from the bot)",
        filename: __filename,
        execute: async (conn, message, m, { from, reply, sender }) => {
            const ctx = message.message?.extendedTextMessage?.contextInfo;
            if (!ctx || !ctx.quotedMessage) return reply('❌ Reply to the message you want to delete.');
            try {
                await conn.sendMessage(from, { delete: { remoteJid: from, fromMe: true, id: ctx.stanzaId, participant: ctx.participant } });
            } catch (e) { reply('⚠️ Deletion failed.'); }
        }
    },

    addsudo: {
        pattern: 'addsudo',
        desc: "Add a trusted user (sudo)",
        category: 'owner',
        use: '.addsudo @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            store.addSudo(jidBase(target));
            reply(`✅ @${target.split('@')[0]} added as sudo.`);
        }
    },

    delsudo: {
        pattern: 'delsudo',
        desc: 'Remove a sudo user',
        category: 'owner',
        use: '.delsudo @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mention or reply to a user.');
            store.delSudo(jidBase(target));
            reply(`✅ @${target.split('@')[0]} removed from sudo.`);
        }
    },

    listsudo: {
        pattern: 'listsudo',
        desc: 'List sudo users',
        category: 'owner',
        use: '.listsudo',
        filename: __filename,
        execute: async (conn, message, m, { from, reply }) => {
            const sudos = store.getSudo();
            if (!sudos.length) return reply('ℹ️ No sudo users registered.');
            let text = '🛡️ *Sudo users*\n\n';
            sudos.forEach(s => { text += `• @${s}\n`; });
            await conn.sendMessage(from, { text, mentions: sudos.map(s => `${s}@s.whatsapp.net`) }, { quoted: message });
        }
    },

    fixowner: {
        pattern: 'fixowner',
        desc: "Reset the owner to the bot's own number",
        category: 'owner',
        use: '.fixowner',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Bot owner only.');
            const botNumber = jidBase(conn.user.id);
            process.env.OWNER_NUMBER = botNumber;
            reply(`✅ Owner reset to +${botNumber}`);
        }
    },

    getbot: {
        pattern: 'getbot',
        desc: 'Technical information about the bot',
        category: 'owner',
        use: '.getbot',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            const mem = process.memoryUsage();
            const text = `🤖 *Bot info*\n\n` +
                `📛 Name: ${BOT_NAME()}\n` +
                `📞 Number: +${jidBase(conn.user.id)}\n` +
                `🟢 Node.js: ${process.version}\n` +
                `💾 RAM used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
                `⚙️ Platform: ${process.platform}\n` +
                `⚙️ Mode: ${store.getMode().toUpperCase()}\n` +
                `🔗 Bot link: ${process.env.BOT_LINK || 'https://gloria-md-production.up.railway.app'}`;
            reply(text);
        }
    }
};
