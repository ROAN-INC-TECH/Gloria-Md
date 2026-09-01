// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
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

    // ═══════════════════ COMMANDES GROUPE ═══════════════════

    tagall: {
        pattern: 'tagall',
        desc: 'Mentionner tous les membres du groupe',
        category: 'group',
        use: '.tagall [message]',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin, metadata } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins ou au propriétaire.');
            if (!metadata) return reply('❌ Impossible de récupérer les infos du groupe.');
            const participants = metadata.participants;
            let teks = `༄ *𝗚𝗿𝗼𝘂𝗽*: ${metadata.subject}\n༄ *𝗠𝗲𝗺𝗯𝗲𝗿𝘀*: ${participants.length}\n༄ *𝗠𝗲𝘀𝘀𝗮𝗴𝗲*: ${q || 'Attention à tous !'}\n\n┌───❁ *𝗠𝗘𝗡𝗧𝗜𝗢𝗡𝗦*\n`;
            participants.forEach(p => { teks += `│📢 @${p.id.split('@')[0]}\n`; });
            teks += `└──༄ ${BOT_NAME()} ༄──`;
            await conn.sendMessage(from, { text: teks, mentions: participants.map(p => p.id) }, { quoted: message });
        }
    },

    hidetag: {
        pattern: 'hidetag',
        desc: 'Mentionner tout le monde sans afficher la liste (tag caché)',
        category: 'group',
        use: '.hidetag [message]',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin, metadata } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins ou au propriétaire.');
            if (!metadata) return reply('❌ Impossible de récupérer les infos du groupe.');
            await conn.sendMessage(from, {
                text: q || `📢 ${BOT_NAME()}`,
                mentions: metadata.participants.map(p => p.id)
            }, { quoted: message });
        }
    },

    tagadmins: {
        pattern: 'tagadmins',
        desc: "Mentionner tous les admins du groupe",
        category: 'group',
        use: '.tagadmins [message]',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            let metadata;
            try { metadata = await conn.groupMetadata(from); } catch { return reply('❌ Impossible de récupérer les infos du groupe.'); }
            const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
            if (!admins.length) return reply('❌ Aucun admin trouvé.');
            let teks = `༄ *𝗚𝗿𝗼𝘂𝗽*: ${metadata.subject}\n༄ *𝗠𝗲𝘀𝘀𝗮𝗴𝗲*: ${q || 'Attention admins !'}\n\n┌───❁ *𝗔𝗗𝗠𝗜𝗡𝗦*\n`;
            admins.forEach(a => { teks += `│🌹 @${a.split('@')[0]}\n`; });
            teks += `└──༄ ${BOT_NAME()} ༄──`;
            await conn.sendMessage(from, { text: teks, mentions: admins }, { quoted: message });
        }
    },

    promote: {
        pattern: 'promote',
        desc: 'Promouvoir un membre admin',
        category: 'group',
        react: '🖤',
        use: '.promote @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            try {
                await conn.groupParticipantsUpdate(from, [target], 'promote');
                await react(conn, from, message.key, '✅');
                await conn.sendMessage(from, { text: `⚡ @${target.split('@')[0]} est maintenant admin`, mentions: [target] }, { quoted: message });
            } catch (e) { await react(conn, from, message.key, '❌'); reply('⚠️ Échec de la promotion.'); }
        }
    },

    demote: {
        pattern: 'demote',
        desc: 'Rétrograder un admin',
        category: 'group',
        react: '🖤',
        use: '.demote @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            try {
                await conn.groupParticipantsUpdate(from, [target], 'demote');
                await react(conn, from, message.key, '✅');
                await conn.sendMessage(from, { text: `⬇️ @${target.split('@')[0]} n'est plus admin`, mentions: [target] }, { quoted: message });
            } catch (e) { await react(conn, from, message.key, '❌'); reply('⚠️ Échec de la rétrogradation.'); }
        }
    },

    kick: {
        pattern: 'kick',
        desc: 'Exclure un membre du groupe',
        category: 'group',
        react: '🖤',
        use: '.kick @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            try {
                await conn.groupParticipantsUpdate(from, [target], 'remove');
                await react(conn, from, message.key, '👢');
                await conn.sendMessage(from, { text: `👢 @${target.split('@')[0]} a été exclu`, mentions: [target] }, { quoted: message });
            } catch (e) { await react(conn, from, message.key, '❌'); reply('⚠️ Échec de l\'exclusion.'); }
        }
    },

    add: {
        pattern: 'add',
        desc: 'Ajouter un membre au groupe',
        category: 'group',
        use: '.add 2376xxxxxxxx',
        filename: __filename,
        execute: async (conn, message, m, { args, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            const number = (args[0] || '').replace(/[^0-9]/g, '');
            if (!number) return reply('❌ Fournis un numéro. Exemple: .add 2376xxxxxxxx');
            const jid = `${number}@s.whatsapp.net`;
            try {
                await conn.groupParticipantsUpdate(from, [jid], 'add');
                reply(`✅ @${number} ajouté au groupe.`);
            } catch (e) { reply('⚠️ Échec de l\'ajout (le numéro doit accepter les ajouts directs).'); }
        }
    },

    mute: {
        pattern: 'mute',
        desc: 'Fermer le groupe (seuls les admins peuvent écrire)',
        category: 'group',
        react: '🖤',
        use: '.mute',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            try {
                await conn.groupSettingUpdate(from, 'announcement');
                await react(conn, from, message.key, '🔒');
                reply('🔒 Groupe fermé, seuls les admins peuvent écrire.');
            } catch (e) { reply('⚠️ Échec.'); }
        }
    },

    unmute: {
        pattern: 'unmute',
        desc: 'Rouvrir le groupe (tout le monde peut écrire)',
        category: 'group',
        react: '🔓',
        use: '.unmute',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            try {
                await conn.groupSettingUpdate(from, 'not_announcement');
                await react(conn, from, message.key, '🔓');
                reply('🔓 Groupe ouvert, tout le monde peut écrire.');
            } catch (e) { reply('⚠️ Échec.'); }
        }
    },

    left: {
        pattern: 'left',
        desc: 'Faire quitter le bot du groupe',
        category: 'group',
        use: '.left',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            await reply('👋 À bientôt !');
            try { await conn.groupLeave(from); } catch (e) {}
        }
    },

    grouplink: {
        pattern: 'grouplink',
        desc: "Obtenir le lien d'invitation du groupe",
        category: 'group',
        react: '🖤',
        use: '.grouplink',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            try {
                const code = await conn.groupInviteCode(from);
                reply(`🔗 https://chat.whatsapp.com/${code}`);
            } catch (e) { reply('❌ Je dois être admin pour générer le lien.'); }
        }
    },

    resetlink: {
        pattern: 'resetlink',
        desc: "Réinitialiser le lien d'invitation",
        category: 'group',
        react: '🖤',
        use: '.resetlink',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            try {
                const code = await conn.groupRevokeInvite(from);
                reply(`♻️ Nouveau lien : https://chat.whatsapp.com/${code}`);
            } catch (e) { reply('❌ Je dois être admin pour réinitialiser le lien.'); }
        }
    },

    kickadmins: {
        pattern: 'kickadmins',
        desc: 'Exclure tous les admins (sauf le propriétaire)',
        category: 'group',
        use: '.kickadmins',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const metadata = await conn.groupMetadata(from);
            const targets = metadata.participants
                .filter(p => (p.admin === 'admin' || p.admin === 'superadmin') && jidBase(p.id) !== jidBase(sender))
                .map(p => p.id);
            if (!targets.length) return reply('ℹ️ Aucun admin à exclure.');
            for (const t of targets) { try { await conn.groupParticipantsUpdate(from, [t], 'remove'); } catch (e) {} }
            reply(`👢 ${targets.length} admin(s) exclu(s).`);
        }
    },

    kickall: {
        pattern: 'kickall',
        desc: 'Exclure tous les membres non-admins',
        category: 'group',
        use: '.kickall',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const metadata = await conn.groupMetadata(from);
            const botBase = jidBase(conn.user.id);
            const targets = metadata.participants
                .filter(p => !p.admin && jidBase(p.id) !== botBase)
                .map(p => p.id);
            if (!targets.length) return reply('ℹ️ Aucun membre à exclure.');
            for (const t of targets) { try { await conn.groupParticipantsUpdate(from, [t], 'remove'); } catch (e) {} }
            reply(`👢 ${targets.length} membre(s) exclu(s).`);
        }
    },

    listadmins: {
        pattern: 'listadmins',
        desc: 'Lister les admins du groupe',
        category: 'group',
        use: '.listadmins',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const metadata = await conn.groupMetadata(from);
            const admins = metadata.participants.filter(p => p.admin);
            if (!admins.length) return reply('ℹ️ Aucun admin trouvé.');
            let text = `👑 *Admins de ${metadata.subject}*\n\n`;
            admins.forEach(a => { text += `• @${a.id.split('@')[0]} ${a.admin === 'superadmin' ? '(créateur)' : ''}\n`; });
            await conn.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: message });
        }
    },

    listonline: {
        pattern: 'listonline',
        desc: 'Lister les membres actuellement en ligne (best-effort)',
        category: 'group',
        use: '.listonline',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const metadata = await conn.groupMetadata(from);
            const online = metadata.participants.filter(p => presence.isOnline(p.id));
            if (!online.length) return reply('ℹ️ Aucune donnée de présence disponible pour le moment (les membres doivent avoir envoyé un message récemment).');
            let text = `🟢 *Membres en ligne*\n\n`;
            online.forEach(p => { text += `• @${p.id.split('@')[0]}\n`; });
            await conn.sendMessage(from, { text, mentions: online.map(p => p.id) }, { quoted: message });
        }
    },

    opentime: {
        pattern: 'opentime',
        desc: 'Programmer une ouverture automatique quotidienne du groupe (HH:MM)',
        category: 'group',
        use: '.opentime 07:00',
        filename: __filename,
        execute: async (conn, message, m, { args, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            const time = args[0];
            if (!time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return reply('❌ Format invalide. Exemple: .opentime 07:00');
            store.setSchedule(from, { openTime: time });
            reply(`✅ Ouverture automatique programmée à ${time} chaque jour.`);
        }
    },

    closetime: {
        pattern: 'closetime',
        desc: 'Programmer une fermeture automatique quotidienne du groupe (HH:MM)',
        category: 'group',
        use: '.closetime 23:00',
        filename: __filename,
        execute: async (conn, message, m, { args, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            const time = args[0];
            if (!time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return reply('❌ Format invalide. Exemple: .closetime 23:00');
            store.setSchedule(from, { closeTime: time });
            reply(`✅ Fermeture automatique programmée à ${time} chaque jour.`);
        }
    },

    antilink: {
        pattern: 'antilink',
        desc: 'Activer/désactiver la suppression automatique des liens',
        category: 'group',
        use: '.antilink on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            if (!q) return reply(`⚙️ Utilise .antilink on / .antilink off\n📡 Statut actuel : *${store.isAntilink(from) ? 'ON ✅' : 'OFF ❌'}*`);
            const val = q.toLowerCase() === 'on';
            store.setAntilink(from, val);
            reply(`${val ? '✅ Antilink activé.' : '❌ Antilink désactivé.'}`);
        }
    },

    vcf: {
        pattern: 'vcf',
        desc: 'Exporter les membres du groupe en fichier VCF',
        category: 'group',
        use: '.vcf',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const metadata = await conn.groupMetadata(from);
            let vcf = '';
            metadata.participants.forEach((p, i) => {
                const num = p.id.split('@')[0];
                vcf += `BEGIN:VCARD\nVERSION:3.0\nFN:Membre ${i + 1}\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD\n`;
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
        desc: 'Créer un nouveau groupe',
        category: 'group',
        use: '.creategroup Nom|2376xx,2376yy',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            if (!q || !q.includes('|')) return reply('❌ Format: .creategroup Nom du groupe|2376xx,2376yy');
            const [name, numbersStr] = q.split('|');
            const numbers = numbersStr.split(',').map(n => n.trim().replace(/[^0-9]/g, '')).filter(Boolean);
            const jids = numbers.map(n => `${n}@s.whatsapp.net`);
            try {
                const group = await conn.groupCreate(name.trim(), jids);
                reply(`✅ Groupe "${name.trim()}" créé avec succès.`);
            } catch (e) { reply('⚠️ Échec de la création du groupe.'); }
        }
    },

    join: {
        pattern: 'join',
        desc: "Rejoindre un groupe via un lien d'invitation",
        category: 'group',
        use: '.join https://chat.whatsapp.com/xxxx',
        filename: __filename,
        execute: async (conn, message, m, { args, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const link = args[0];
            if (!link) return reply('❌ Fournis un lien d\'invitation.');
            const code = link.split('https://chat.whatsapp.com/')[1];
            if (!code) return reply('❌ Lien invalide.');
            try {
                await conn.groupAcceptInvite(code);
                reply('✅ Groupe rejoint avec succès.');
            } catch (e) { reply('⚠️ Échec, le lien est peut-être invalide ou expiré.'); }
        }
    },

    closegc: {
        pattern: 'closegc',
        desc: 'Verrouiller les infos du groupe (seuls les admins modifient)',
        category: 'group',
        use: '.closegc',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            try {
                await conn.groupSettingUpdate(from, 'locked');
                reply('🔒 Seuls les admins peuvent modifier les infos du groupe.');
            } catch (e) { reply('⚠️ Échec.'); }
        }
    },

    opengc: {
        pattern: 'opengc',
        desc: 'Déverrouiller les infos du groupe (tout le monde modifie)',
        category: 'group',
        use: '.opengc',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            try {
                await conn.groupSettingUpdate(from, 'unlocked');
                reply('🔓 Tout le monde peut modifier les infos du groupe.');
            } catch (e) { reply('⚠️ Échec.'); }
        }
    },

    warn: {
        pattern: 'warn',
        desc: 'Avertir un membre (3 avertissements = exclusion)',
        category: 'group',
        use: '.warn @user [raison]',
        filename: __filename,
        execute: async (conn, message, m, { q, from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            const count = store.addWarn(from, target);
            await conn.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} a reçu un avertissement (${count}/3)${q ? `\nRaison: ${q}` : ''}`, mentions: [target] }, { quoted: message });
            if (count >= 3) {
                try {
                    await conn.groupParticipantsUpdate(from, [target], 'remove');
                    store.resetWarn(from, target);
                    conn.sendMessage(from, { text: `👢 @${target.split('@')[0]} exclu après 3 avertissements.`, mentions: [target] });
                } catch (e) {}
            }
        }
    },

    warns: {
        pattern: 'warns',
        desc: "Voir les avertissements d'un membre",
        category: 'group',
        use: '.warns @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const target = getTarget(m);
            if (!target) {
                const all = store.getAllWarns(from);
                const keys = Object.keys(all);
                if (!keys.length) return reply('ℹ️ Aucun avertissement enregistré dans ce groupe.');
                let text = '⚠️ *Avertissements du groupe*\n\n';
                keys.forEach(k => { text += `• @${k.split('@')[0]} : ${all[k]}/3\n`; });
                return conn.sendMessage(from, { text, mentions: keys }, { quoted: message });
            }
            const count = store.getWarn(from, target);
            await conn.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} a ${count}/3 avertissement(s).`, mentions: [target] }, { quoted: message });
        }
    },

    resetwarn: {
        pattern: 'resetwarn',
        desc: "Réinitialiser les avertissements d'un membre",
        category: 'group',
        use: '.resetwarn @user',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
            if (!isGroup) return reply('❌ Commande disponible uniquement dans les groupes.');
            const { isAdmin } = await isGroupAdmin(conn, from, sender);
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            store.resetWarn(from, target);
            await conn.sendMessage(from, { text: `♻️ Avertissements de @${target.split('@')[0]} réinitialisés.`, mentions: [target] }, { quoted: message });
        }
    },

    // ═══════════════════ WELCOME / GOODBYE ═══════════════════

    welcome: {
        pattern: 'welcome',
        desc: 'Activer/désactiver le message de bienvenue',
        category: 'group',
        react: '🖤',
        use: '.welcome on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
            const { isAdmin } = isGroup ? await isGroupAdmin(conn, from, sender) : { isAdmin: false };
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins ou au propriétaire.');
            if (!q) return reply(`⚙️ Utilise .welcome on / .welcome off\n📡 Statut : *${process.env.WELCOME_ENABLED === 'false' ? 'OFF ❌' : 'ON ✅'}*`);
            process.env.WELCOME_ENABLED = q.toLowerCase() === 'on' ? 'true' : 'false';
            reply(process.env.WELCOME_ENABLED === 'true' ? '✅ Messages de bienvenue activés.' : '❌ Messages de bienvenue désactivés.');
        }
    },

    goodbye: {
        pattern: 'goodbye',
        desc: 'Activer/désactiver le message d\'au revoir',
        category: 'group',
        react: '🖤',
        use: '.goodbye on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
            const { isAdmin } = isGroup ? await isGroupAdmin(conn, from, sender) : { isAdmin: false };
            if (!isAdmin && !isPrimaryOwner(conn, sender)) return reply('❌ Réservé aux admins ou au propriétaire.');
            if (!q) return reply(`⚙️ Utilise .goodbye on / .goodbye off\n📡 Statut : *${process.env.GOODBYE_ENABLED === 'false' ? 'OFF ❌' : 'ON ✅'}*`);
            process.env.GOODBYE_ENABLED = q.toLowerCase() === 'on' ? 'true' : 'false';
            reply(process.env.GOODBYE_ENABLED === 'true' ? '✅ Messages d\'au revoir activés.' : '❌ Messages d\'au revoir désactivés.');
        }
    },

    // ═══════════════════ COMMANDES OWNER / BOT ═══════════════════

    owner: {
        pattern: 'owner',
        desc: 'Contact du propriétaire',
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
        desc: 'Lien du dépôt / code source',
        category: 'owner',
        use: '.repo',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            reply(`📦 Dépôt : ${process.env.REPO_LINK || 'https://github.com'}`);
        }
    },

    getpp: {
        pattern: 'getpp',
        desc: "Récupérer la photo de profil d'un utilisateur ou du groupe",
        category: 'owner',
        use: '.getpp [@user] (ou seul dans un groupe pour la photo du groupe)',
        filename: __filename,
        execute: async (conn, message, m, { from, isGroup, reply }) => {
            const target = getTarget(m) || (!isGroup ? from : null) || from;
            try {
                const url = await conn.profilePictureUrl(target, 'image');
                await conn.sendMessage(message.key.remoteJid, { image: { url }, caption: `🖼️ Photo de profil` }, { quoted: message });
            } catch (e) {
                reply('❌ Impossible de récupérer cette photo de profil (peut-être aucune photo définie).');
            }
        }
    },

    setprefix: {
        pattern: 'setprefix',
        desc: 'Changer le préfixe des commandes',
        category: 'owner',
        use: '.setprefix !',
        filename: __filename,
        execute: async (conn, message, m, { args, reply, sender, sessionId }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const newPrefix = args[0];
            if (!newPrefix) return reply('❌ Fournis un nouveau préfixe. Exemple: .setprefix !');
            store.setPrefix(sessionId, newPrefix);
            reply(`✅ Préfixe changé en : ${newPrefix}`);
        }
    },

    restart: {
        pattern: 'restart',
        desc: 'Redémarrer le bot',
        category: 'owner',
        use: '.restart',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            await reply('🔄 Redémarrage...');
            setTimeout(() => process.exit(0), 1000);
        }
    },

    eval: {
        pattern: 'eval',
        desc: 'Exécuter du code JS (propriétaire uniquement, débogage)',
        category: 'owner',
        use: '.eval <code>',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            if (!q) return reply('❌ Fournis du code à exécuter.');
            try {
                let result = eval(q);
                if (typeof result !== 'string') result = require('util').inspect(result);
                reply('```\n' + result + '\n```');
            } catch (e) { reply('⚠️ Erreur: ' + e.message); }
        }
    },

    ban: {
        pattern: 'ban',
        desc: 'Bannir un utilisateur (le bot ignorera ses commandes)',
        category: 'owner',
        use: '.ban @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Réservé au propriétaire/sudo.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            store.ban(jidBase(target));
            await conn.sendMessage(message.key.remoteJid, { text: `🚫 @${target.split('@')[0]} banni.`, mentions: [target] }, { quoted: message });
        }
    },

    unban: {
        pattern: 'unban',
        desc: 'Débannir un utilisateur',
        category: 'owner',
        use: '.unban @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Réservé au propriétaire/sudo.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            store.unban(jidBase(target));
            await conn.sendMessage(message.key.remoteJid, { text: `✅ @${target.split('@')[0]} débanni.`, mentions: [target] }, { quoted: message });
        }
    },

    self: {
        pattern: 'self',
        desc: 'Mode privé : le bot ne répond qu\'au propriétaire',
        category: 'owner',
        use: '.self',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Réservé au propriétaire/sudo.');
            store.setMode('self');
            reply('🔒 Mode SELF activé : seul le propriétaire peut utiliser le bot.');
        }
    },

    public: {
        pattern: 'public',
        desc: 'Mode public : tout le monde peut utiliser le bot',
        category: 'owner',
        use: '.public',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isOwnerOrSudo(conn, sender)) return reply('❌ Réservé au propriétaire/sudo.');
            store.setMode('public');
            reply('🌍 Mode PUBLIC activé : tout le monde peut utiliser le bot.');
        }
    },

    mode: {
        pattern: 'mode',
        desc: 'Afficher le mode actuel du bot',
        category: 'owner',
        use: '.mode',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            reply(`⚙️ Mode actuel : *${store.getMode().toUpperCase()}*`);
        }
    },

    autoread: {
        pattern: 'autoread',
        desc: 'Activer/désactiver la lecture automatique des messages',
        category: 'owner',
        use: '.autoread on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            if (!q) return reply(`📡 autoread : *${store.getToggle('autoread') ? 'ON' : 'OFF'}*`);
            store.setToggle('autoread', q.toLowerCase() === 'on');
            reply(`✅ autoread ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    autobio: {
        pattern: 'autobio',
        desc: 'Mettre à jour automatiquement le statut/bio du bot',
        category: 'owner',
        use: '.autobio on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            if (!q) return reply(`📡 autobio : *${store.getToggle('autobio') ? 'ON' : 'OFF'}*`);
            store.setToggle('autobio', q.toLowerCase() === 'on');
            reply(`✅ autobio ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    autorecording: {
        pattern: 'autorecording',
        desc: 'Simuler un enregistrement audio en continu',
        category: 'owner',
        use: '.autorecording on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            if (!q) return reply(`📡 autorecording : *${store.getToggle('autorecording') ? 'ON' : 'OFF'}*`);
            store.setToggle('autorecording', q.toLowerCase() === 'on');
            if (q.toLowerCase() === 'on') store.setToggle('autotyping', false);
            reply(`✅ autorecording ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    autotyping: {
        pattern: 'autotyping',
        desc: 'Simuler une frappe en continu',
        category: 'owner',
        use: '.autotyping on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            if (!q) return reply(`📡 autotyping : *${store.getToggle('autotyping') ? 'ON' : 'OFF'}*`);
            store.setToggle('autotyping', q.toLowerCase() === 'on');
            if (q.toLowerCase() === 'on') store.setToggle('autorecording', false);
            reply(`✅ autotyping ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    autoviewstatus: {
        pattern: 'autoviewstatus',
        desc: 'Voir automatiquement les statuts des contacts',
        category: 'owner',
        use: '.autoviewstatus on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            if (!q) return reply(`📡 autoviewstatus : *${store.getToggle('autoviewstatus') ? 'ON' : 'OFF'}*`);
            store.setToggle('autoviewstatus', q.toLowerCase() === 'on');
            reply(`✅ autoviewstatus ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    autoreact: {
        pattern: 'autoreact',
        desc: 'Réagir automatiquement aux messages reçus',
        category: 'owner',
        use: '.autoreact on/off',
        filename: __filename,
        execute: async (conn, message, m, { q, reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            if (!q) return reply(`📡 autoreact : *${store.getToggle('autoreact') ? 'ON' : 'OFF'}*`);
            store.setToggle('autoreact', q.toLowerCase() === 'on');
            reply(`✅ autoreact ${q.toLowerCase() === 'on' ? 'activé' : 'désactivé'}.`);
        }
    },

    block: {
        pattern: 'block',
        desc: 'Bloquer un contact WhatsApp',
        category: 'owner',
        use: '.block @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            try { await conn.updateBlockStatus(target, 'block'); reply(`🚫 @${target.split('@')[0]} bloqué.`); }
            catch (e) { reply('⚠️ Échec du blocage.'); }
        }
    },

    unblock: {
        pattern: 'unblock',
        desc: 'Débloquer un contact WhatsApp',
        category: 'owner',
        use: '.unblock @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            try { await conn.updateBlockStatus(target, 'unblock'); reply(`✅ @${target.split('@')[0]} débloqué.`); }
            catch (e) { reply('⚠️ Échec du déblocage.'); }
        }
    },

    delete: {
        pattern: 'delete',
        desc: 'Supprimer un message du bot (répondre au message)',
        category: 'owner',
        use: '.delete (en réponse à un message du bot)',
        filename: __filename,
        execute: async (conn, message, m, { from, reply, sender }) => {
            const ctx = message.message?.extendedTextMessage?.contextInfo;
            if (!ctx || !ctx.quotedMessage) return reply('❌ Réponds au message à supprimer.');
            try {
                await conn.sendMessage(from, { delete: { remoteJid: from, fromMe: true, id: ctx.stanzaId, participant: ctx.participant } });
            } catch (e) { reply('⚠️ Échec de la suppression.'); }
        }
    },

    addsudo: {
        pattern: 'addsudo',
        desc: "Ajouter un utilisateur de confiance (sudo)",
        category: 'owner',
        use: '.addsudo @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            store.addSudo(jidBase(target));
            reply(`✅ @${target.split('@')[0]} ajouté comme sudo.`);
        }
    },

    delsudo: {
        pattern: 'delsudo',
        desc: 'Retirer un utilisateur sudo',
        category: 'owner',
        use: '.delsudo @user',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const target = getTarget(m);
            if (!target) return reply('❌ Mentionne ou réponds à un utilisateur.');
            store.delSudo(jidBase(target));
            reply(`✅ @${target.split('@')[0]} retiré des sudos.`);
        }
    },

    listsudo: {
        pattern: 'listsudo',
        desc: 'Lister les utilisateurs sudo',
        category: 'owner',
        use: '.listsudo',
        filename: __filename,
        execute: async (conn, message, m, { from, reply }) => {
            const sudos = store.getSudo();
            if (!sudos.length) return reply('ℹ️ Aucun sudo enregistré.');
            let text = '🛡️ *Utilisateurs sudo*\n\n';
            sudos.forEach(s => { text += `• @${s}\n`; });
            await conn.sendMessage(from, { text, mentions: sudos.map(s => `${s}@s.whatsapp.net`) }, { quoted: message });
        }
    },

    fixowner: {
        pattern: 'fixowner',
        desc: 'Réinitialiser le propriétaire sur le numéro du bot',
        category: 'owner',
        use: '.fixowner',
        filename: __filename,
        execute: async (conn, message, m, { reply, sender }) => {
            if (!isPrimaryOwner(conn, sender)) return reply('❌ Réservé au propriétaire du bot.');
            const botNumber = jidBase(conn.user.id);
            process.env.OWNER_NUMBER = botNumber;
            reply(`✅ Propriétaire réinitialisé sur +${botNumber}`);
        }
    },

    getbot: {
        pattern: 'getbot',
        desc: 'Informations techniques du bot',
        category: 'owner',
        use: '.getbot',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            const mem = process.memoryUsage();
            const text = `🤖 *Infos Bot*\n\n` +
                `📛 Nom : ${BOT_NAME()}\n` +
                `📞 Numéro : +${jidBase(conn.user.id)}\n` +
                `🟢 Node.js : ${process.version}\n` +
                `💾 RAM utilisée : ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
                `⚙️ Plateforme : ${process.platform}\n` +
                `⚙️ Mode : ${store.getMode().toUpperCase()}`;
            reply(text);
        }
    }
};
