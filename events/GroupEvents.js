// BOT NAME  ➳ GLORIA MD
// BOT DEV   ➳ MR ROAN
// CONTACT DEV ➳ +237689301479
const store = require('../lib/store');
const { jidBase, isPrimaryOwner } = require('../lib/permissions');
const { getBrandImage } = require('../lib/images');

// Newsletter context (for the forwarded-style look)
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
    // isJidGroup can be missing/unstable depending on the Baileys version,
    // which used to silently break the whole welcome/goodbye flow.
    if (!id || !id.endsWith('@g.us') || !participants) return;

    const botBase = jidBase(conn?.user?.id);
    const authorBase = author ? jidBase(author) : null;
    const actionIsFromBotOrOwner = authorBase && (authorBase === botBase || isPrimaryOwner(conn, author));

    // === AUTOPROMOTE: automatically promote new members ===
    if (action === 'add' && store.getGroupToggle(id, 'autopromote')) {
      for (const participant of participants) {
        try { await conn.groupParticipantsUpdate(id, [participant], 'promote'); } catch (e) {}
      }
    }

    // === ANTIPROMOTE ===
    // When active, ONLY the bot/owner or the group's real creator (superadmin)
    // are allowed to promote someone to admin.
    // If a regular admin tries to promote someone anyway: the promotion is
    // reverted (the target is demoted) AND the admin who tried to do it is
    // demoted as well.
    if (action === 'promote' && store.getGroupToggle(id, 'antipromote') && !actionIsFromBotOrOwner) {
      let actorIsGroupCreator = false;
      if (author) {
        try {
          const meta = await conn.groupMetadata(id);
          const actorEntry = meta.participants.find(p => jidBase(p.id) === authorBase);
          actorIsGroupCreator = actorEntry?.admin === 'superadmin';
        } catch (e) {}
      }

      if (!actorIsGroupCreator) {
        // Revert the promotion(s)
        for (const target of participants) {
          try { await conn.groupParticipantsUpdate(id, [target], 'demote'); } catch (e) {}
        }
        // Demote the person who attempted the unauthorized promotion
        if (author) {
          try { await conn.groupParticipantsUpdate(id, [author], 'demote'); } catch (e) {}
          try {
            await conn.sendMessage(id, {
              text: `🚫 Antipromote: @${author.split('@')[0]} tried to promote a member without permission and has been demoted, just like the member they tried to promote.`,
              mentions: [author, ...participants],
            });
          } catch (e) {}
        }
      }
    }

    // === ANTIDEMOTE ===
    // When active, if someone other than the bot/owner demotes an admin,
    // the person who did it is demoted as well (same fate as their target).
    if (action === 'demote' && store.getGroupToggle(id, 'antidemote') && !actionIsFromBotOrOwner) {
      if (author) {
        try { await conn.groupParticipantsUpdate(id, [author], 'demote'); } catch (e) {}
        try {
          await conn.sendMessage(id, {
            text: `🚫 Antidemote: @${author.split('@')[0]} tried to demote an admin and has been demoted as well.`,
            mentions: [author, ...participants],
          });
        } catch (e) {}
      }
    }

    const groupMetadata = await conn.groupMetadata(id);
    const groupName = groupMetadata.subject || "Group";
    const desc = groupMetadata.desc || "No Description available.";
    const groupMembersCount = groupMetadata.participants?.length || 0;
    const timestamp = new Date().toLocaleString();

    // Welcome/goodbye always use the fixed brand image (commands/Gloria.jpg),
    // never the member's own WhatsApp profile picture.
    const brandImage = getBrandImage();

    for (const participant of participants) {
      const userName = participant.split("@")[0];

      // === WELCOME ===
      if (action === "add" && process.env.WELCOME_ENABLED !== "false") {
        const welcomeText = `
╭───❖ 🎒 *𝗪𝗲𝗹𝗰𝗼𝗺𝗲 𝗛𝗼𝗺𝗲* ❖───
│ 👋 𝗛𝗶 @${userName}!
│ 🏠 𝗪𝗲𝗹𝗰𝗼𝗺𝗲 𝗧𝗼: *${groupName}*
│ 🔢 𝗠𝗲𝗺𝗯𝗲𝗿: *${groupMembersCount}*
│ 🕒 𝗧𝗶𝗺𝗲 𝗝𝗼𝗶𝗻𝗲𝗱: *${timestamp}*
│ 
│ 📝 𝗚𝗿𝗼𝘂𝗽 𝗗𝗲𝘀𝗰:
│ ${desc}
│ 
╰❖ 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗚𝗟𝗢𝗥𝗜𝗔 -  𝗠𝗗  ❖─
        `.trim();

        await conn.sendMessage(id, {
          image: brandImage,
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
│ 🏠 𝗬𝗼𝘂 𝗟𝗲𝗳𝘁: *${groupName}*
│ 🕒 𝗧𝗶𝗺𝗲: *${timestamp}*
│ 
╰❖ 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗 ❖─
        `.trim();

        await conn.sendMessage(id, {
          image: brandImage,
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
