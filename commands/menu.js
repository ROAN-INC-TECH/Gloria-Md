// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
const store = require('../lib/store');
const { jidBase } = require('../lib/permissions');

const startTime = Date.now();

function getUptime() {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    return `${days}j ${hours}h ${minutes}m ${seconds}s`;
}

// Petites capitales stylisées (même esprit que le template fourni)
function smallCaps(text) {
    const map = { A:'𝙰',B:'𝙱',C:'𝙲',D:'𝙳',E:'𝙴',F:'𝙵',G:'𝙶',H:'𝙷',I:'𝙸',J:'𝙹',K:'𝙺',L:'𝙻',M:'𝙼',N:'𝙽',O:'𝙾',P:'𝙿',Q:'𝚀',R:'𝚁',S:'𝚂',T:'𝚃',U:'𝚄',V:'𝚅',W:'𝚆',X:'𝚇',Y:'𝚈',Z:'𝚉' };
    return text.toUpperCase().split('').map(c => map[c] || c).join('');
}

function buildMenu(commandsMap, userPrefix, botName, ownerName, senderName) {
    const header = `╭━━━〔 🌙 *${smallCaps(botName)}* 🌙 〕━━━╮\n` +
        `┃ 🦉 *${smallCaps('BOT NAME')} : ${botName}*\n` +
        `┃ 🦉 *${smallCaps('USER')} : ${senderName}*\n` +
        `┃ 🦉 *${smallCaps('VERSION')} : 1.0.0*\n` +
        `┃ 🦉 *${smallCaps('PREFIX')} : '${userPrefix}'*\n` +
        `┃ 🦉 *${smallCaps('OWNER')} : ${ownerName}*\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯\n`;

    const byCategory = {};
    for (const [, cmd] of commandsMap.entries()) {
        const cat = cmd.category || 'general';
        byCategory[cat] = byCategory[cat] || new Set();
        byCategory[cat].add(cmd.pattern);
    }

    const catLabels = { group: 'GROUPE', owner: 'PROPRIÉTAIRE', menu: 'MENU', general: 'GÉNÉRAL' };

    let body = '';
    for (const [cat, patterns] of Object.entries(byCategory)) {
        body += `\n╭─🕸️〔 *${catLabels[cat] || cat.toUpperCase()}* 〕🕸️\n`;
        [...patterns].sort().forEach(p => {
            body += `┃ 🕷️ ${userPrefix}${p}\n`;
        });
        body += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
    }

    return header + body + `\n✨ Propulsé par *${ownerName}* — ${botName}`;
}

module.exports = {

    menu: {
        pattern: 'menu',
        alias: ['help'],
        desc: 'Afficher le menu des commandes',
        category: 'menu',
        use: '.menu',
        filename: __filename,
        execute: async (conn, message, m, { reply, from, sender, allCommands, userPrefix }) => {
            const BOT_NAME = process.env.BOT_NAME || '𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗';
            const OWNER_NAME = process.env.OWNER_NAME || '𝗠𝗥 𝗥𝗢𝗔𝗡';
            let senderName = 'Utilisateur';
            try { senderName = (await conn.getName?.(sender)) || jidBase(sender); } catch { senderName = jidBase(sender); }
            const menuText = buildMenu(allCommands, userPrefix || '.', BOT_NAME, OWNER_NAME, senderName);
            await conn.sendMessage(from, { text: menuText }, { quoted: message });
        }
    },

    alive: {
        pattern: 'alive',
        desc: 'Vérifier si le bot est actif',
        category: 'menu',
        react: '🖤',
        use: '.alive',
        filename: __filename,
        execute: async (conn, message, m, { reply, from }) => {
            const BOT_NAME = process.env.BOT_NAME || '𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗';
            await conn.sendMessage(from, { react: { text: '🖤', key: message.key } });
            reply(`🖤 *${BOT_NAME}* 𝗲𝘀𝘁 𝗲𝗻 𝗹𝗶𝗴𝗻𝗲 𝗲𝘁 𝗳𝗼𝗻𝗰𝘁𝗶𝗼𝗻𝗻𝗲 𝗽𝗮𝗿𝗳𝗮𝗶𝘁𝗲𝗺𝗲𝗻𝘁 !\n⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲 : ${getUptime()}`);
        }
    },

    ping: {
        pattern: 'ping',
        desc: 'Tester la vitesse de réponse du bot',
        category: 'menu',
        react: '🏓',
        use: '.ping',
        filename: __filename,
        execute: async (conn, message, m, { reply, from }) => {
            const start = Date.now();
            const sent = await conn.sendMessage(from, { text: '🏓 𝗣𝗶𝗻𝗴...' }, { quoted: message });
            const speed = Date.now() - start;
            await conn.sendMessage(from, { text: `🏓 𝗣𝗼𝗻𝗴 ! *${speed}𝗺𝘀*` }, { quoted: message });
        }
    },

    runtime: {
        pattern: 'runtime',
        desc: 'Afficher la durée de fonctionnement du bot',
        category: 'menu',
        react: '🖤',
        use: '.runtime',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            reply(`🕐 *𝗨𝗽𝘁𝗶𝗺𝗲*\n\n⏱️ ${getUptime()}\n🚀 𝗗𝗲𝗺𝗮𝗿𝗿𝗲 𝗹𝗲 : ${new Date(startTime).toLocaleString()}`);
        }
    },

    devinfo: {
        pattern: 'devinfo',
        desc: 'Informations sur le développeur',
        category: 'menu',
        use: '.devinfo',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            const text = `👨‍💻 *𝗜𝗡𝗙𝗢 𝗗𝗘𝗩*\n\n` +
                `📛 𝗡𝗮𝗺𝗲 : ${process.env.DEV_NAME || '𝗠𝗥 𝗥𝗢𝗔𝗡'}\n` +
                `📧 𝗘𝗺𝗮𝗶𝗹 : ${process.env.DEV_EMAIL || 'mrroaninc@gmail.com'}\n` +
                `📢 𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 : @MrRoanInc\n\n` +
                `✨ 𝗧𝗵𝘅 𝗙𝗼𝗿 𝗨𝘀𝗶𝗻𝗴 *${process.env.BOT_NAME || '𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗'}* !`;
            reply(text);
        }
    }
};
