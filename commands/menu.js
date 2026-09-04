// BOT NAME  ➳ GLORIA MD
// BOT DEV   ➳ MR ROAN
// CONTACT DEV ➳ +237689301479
const store = require('../lib/store');
const { jidBase } = require('../lib/permissions');
const { getMenuImage, getBrandImage } = require('../lib/images');

const startTime = Date.now();

function getUptime() {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Small-caps stylized text (same style as the original template)
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
    const seen = new Set();
    for (const [, cmd] of commandsMap.entries()) {
        // Hidden commands (e.g. .vvset) are intentionally left out of the menu.
        if (cmd.hidden) continue;
        if (seen.has(cmd.pattern)) continue;
        seen.add(cmd.pattern);
        const cat = cmd.category || 'general';
        byCategory[cat] = byCategory[cat] || new Set();
        byCategory[cat].add(cmd.pattern);
    }

    const catLabels = { group: 'GROUP', owner: 'OWNER', menu: 'MENU', general: 'GENERAL' };

    let body = '';
    for (const [cat, patterns] of Object.entries(byCategory)) {
        body += `\n╭─🕸️〔 *${catLabels[cat] || cat.toUpperCase()}* 〕🕸️\n`;
        [...patterns].sort().forEach(p => {
            body += `┃ 🕷️ ${userPrefix}${p}\n`;
        });
        body += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
    }

    return header + body + `\n𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 *${ownerName}* — ${botName}`;
}

module.exports = {

    menu: {
        pattern: 'menu',
        alias: ['help'],
        desc: 'Show the commands menu',
        category: 'menu',
        use: '.menu',
        filename: __filename,
        execute: async (conn, message, m, { from, sender, allCommands, userPrefix }) => {
            const BOT_NAME = process.env.BOT_NAME || '𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗';
            const OWNER_NAME = process.env.OWNER_NAME || '𝗠𝗥 𝗥𝗢𝗔𝗡';
            // conn.getName doesn't exist in Baileys -> use the WhatsApp pushName
            // already provided on the incoming message instead.
            const senderName = message.pushName || jidBase(sender);
            const menuText = buildMenu(allCommands, userPrefix || '.', BOT_NAME, OWNER_NAME, senderName);

            // .menu always ships with the image located at commands/gloria.jpg
            await conn.sendMessage(from, { image: getMenuImage(), caption: menuText }, { quoted: message });
        }
    },

    alive: {
        pattern: 'alive',
        desc: 'Check whether the bot is online',
        category: 'menu',
        react: '🖤',
        use: '.alive',
        filename: __filename,
        execute: async (conn, message, m, { from }) => {
            const BOT_NAME = process.env.BOT_NAME || '𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗';
            await conn.sendMessage(from, { react: { text: '🖤', key: message.key } });
            const text = `🖤 *${BOT_NAME}* 𝗶𝘀 𝗼𝗻𝗹𝗶𝗻𝗲 𝗮𝗻𝗱 𝗿𝘂𝗻𝗻𝗶𝗻𝗴 𝗽𝗲𝗿𝗳𝗲𝗰𝘁𝗹𝘆!\n⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲: ${getUptime()}`;
            // alive always ships with the fixed image commands/Gloria.jpg
            await conn.sendMessage(from, { image: getBrandImage(), caption: text }, { quoted: message });
        }
    },

    ping: {
        pattern: 'ping',
        desc: 'Test the bot response speed',
        category: 'menu',
        react: '🏓',
        use: '.ping',
        filename: __filename,
        execute: async (conn, message, m, { reply, from }) => {
            const start = Date.now();
            await conn.sendMessage(from, { text: '🏓 𝗣𝗶𝗻𝗴...' }, { quoted: message });
            const speed = Date.now() - start;
            await conn.sendMessage(from, { text: `🏓 𝗣𝗼𝗻𝗴! *${speed}𝗺𝘀*` }, { quoted: message });
        }
    },

    runtime: {
        pattern: 'runtime',
        desc: 'Show how long the bot has been running',
        category: 'menu',
        react: '🖤',
        use: '.runtime',
        filename: __filename,
        execute: async (conn, message, m, { reply }) => {
            reply(`🕐 *𝗨𝗽𝘁𝗶𝗺𝗲*\n\n⏱️ ${getUptime()}\n🚀 𝗦𝘁𝗮𝗿𝘁𝗲𝗱 𝗮𝘁: ${new Date(startTime).toLocaleString()}`);
        }
    },

    devinfo: {
        pattern: 'devinfo',
        desc: 'Information about the developer',
        category: 'menu',
        use: '.devinfo',
        filename: __filename,
        execute: async (conn, message, m, { from }) => {
            const text = `👨‍💻 *𝗗𝗘𝗩 𝗜𝗡𝗙𝗢*\n\n` +
                `📛 𝗡𝗮𝗺𝗲: ${process.env.DEV_NAME || '𝗠𝗥 𝗥𝗢𝗔𝗡'}\n` +
                `📧 𝗘𝗺𝗮𝗶𝗹: ${process.env.DEV_EMAIL || 'mrroaninc@gmail.com'}\n` +
                `📢 𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺: t.me/MrRoanInc\n\n` +
                `✨ 𝗧𝗵𝘅 𝗳𝗼𝗿 𝘂𝘀𝗶𝗻𝗴 *${process.env.BOT_NAME || '𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗'}*!`;
            // devinfo always ships with the fixed image commands/Gloria.jpg
            await conn.sendMessage(from, { image: getBrandImage(), caption: text }, { quoted: message });
        }
    }
};
