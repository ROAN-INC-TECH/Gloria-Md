// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
const store = require('../lib/store');
const { jidBase, isPrimaryOwner } = require('../lib/permissions');

const defaultProfilePics = [
  'https://files.catbox.moe/bq7v3f.jpg',
  'https://files.catbox.moe/1g7ue4.jpg',
  'https://files.catbox.moe/p8uyfj.jpg',
];

// Newsletter context (for forwarded-style look)
const getContextInfo = (mentionedJids) => ({
  mentionedJid: mentionedJids,
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363427946378181@newsletter',
    newsletterName: "༄𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗༆",
    serverMessageId: 200,
  },
});

module.exports = async (conn, update) => {
  try {
    const { id, participants, action, author } = update;
    // FIX: isJidGroup peut être absent/instable selon la version de Baileys,
    // ce qui faisait échouer silencieusement tout le welcome/goodbye.
    if (!id || !id.endsWith('@g.us') || !participants) return;

    const botBase = jidBase(conn?.user?.id);
    const authorBase = author ? jidBase(author) : null;
    const actionIsFromBotOrOwner = authorBase && (authorBase === botBase || isPrimaryOwner(conn, author));

    // === AUTOPROMOTE : promouvoir automatiquement les nouveaux membres ===
    if (action === 'add' && store.getGroupToggle(id, 'autopromote')) {
      for (const participant of participants) {
        try { await conn.groupParticipantsUpdate(id, [participant], 'promote'); } catch (e) {}
      }
    }

    // === ANTIDEMOTE : protège le bot et le propriétaire contre une rétrogradation ===
    if (action === 'demote' && store.getGroupToggle(id, 'antidemote') && !actionIsFromBotOrOwner) {
      const ownerNumbers = (process.env.OWNER_NUMBER || '').split(',').map(n => n.trim()).filter(Boolean);
      const protectedTargets = participants.filter(p => jidBase(p) === botBase || ownerNumbers.includes(jidBase(p)));
      for (const target of protectedTargets) {
        try {
          await conn.groupParticipantsUpdate(id, [target], 'promote');
          await conn.sendMessage(id, { text: `🛡️ Anti-demote : @${target.split('@')[0]} a été re-promu automatiquement.`, mentions: [target] });
        } catch (e) {}
      }
    }

    const groupMetadata = await conn.groupMetadata(id);
    const groupName = groupMetadata.subject || "Group";
    const desc = groupMetadata.desc || "No Description available.";
    const groupMembersCount = groupMetadata.participants?.length || 0;
    const timestamp = new Date().toLocaleString();

    for (const participant of participants) {
      const userName = participant.split("@")[0];

      // Try to fetch profile picture
      let userPpUrl;
      try {
        userPpUrl = await conn.profilePictureUrl(participant, "image");
      } catch {
        userPpUrl = defaultProfilePics[Math.floor(Math.random() * defaultProfilePics.length)];
      }

      // === WELCOME ===
      if (action === "add" && process.env.WELCOME_ENABLED !== "false") {
        const welcomeText = `
╭───❖ 🎒 *𝗪𝗲𝗹𝗰𝗼𝗺𝗲 𝗛𝗼𝗺𝗲* ❖───
│ 👋 𝗛𝗶 @${userName}!
│ 🏠 𝗪𝗲𝗹𝗰𝗼𝗺𝗲 𝗧𝗼: *${groupName}*
│ 🔢 𝗠𝗲𝗺𝗯𝗲𝗿 : *${groupMembersCount}*
│ 🕒 𝗧𝗶𝗺𝗲 𝗝𝗼𝗶𝗻𝗲𝗱: *${timestamp}*
│ 
│ 📝 𝗚𝗿𝗼𝘂𝗽 𝗗𝗲𝘀𝗰:
│ ${desc}
│ 
╰❖ 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗚𝗟𝗢𝗥𝗜𝗔 -  𝗠𝗗  ❖─
        `.trim();

        await conn.sendMessage(id, {
          image: { url: userPpUrl },
          caption: welcomeText,
          mentions: [participant],
          contextInfo: getContextInfo([participant]),
        });
      }

      // === GOODBYE ===
      else if (action === "remove" && process.env.GOODBYE_ENABLED !== "false") {
        const goodbyeText = `
╭───❖ 😢 *𝗚𝗢𝗢𝗗𝗕𝗬𝗘* ❖───
│ 👋 𝗕𝘆𝗲 @${userName}!
│ 🏠 𝗬𝗼𝘂 𝗟𝗲𝗳𝘁 : *${groupName}*
│ 🕒 𝗧𝗶𝗺𝗲: *${timestamp}*
│ 
╰❖ 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗 ❖─
        `.trim();

        await conn.sendMessage(id, {
          image: { url: userPpUrl },
          caption: goodbyeText,
          mentions: [participant],
          contextInfo: getContextInfo([participant]),
        });
      }
    }
  } catch (err) {
    console.error("GroupEvents error:", err);
  }
};
