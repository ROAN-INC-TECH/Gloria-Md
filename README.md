# 𝗚𝗟𝗢𝗥𝗜𝗔-𝗠𝗗

Bot WhatsApp (web pairing) basé sur Baileys, avec toutes les commandes rassemblées
dans `commands/inc.js`, et le menu séparé dans `commands/menu.js`.

## Installation

```bash
npm install
cp .env.example .env
# éditer .env : OWNER_NUMBER, BOT_NAME, OWNER_NAME...
npm start
```

Ouvre `http://localhost:3000`, entre ton numéro pour obtenir le code de pairing
et connecte WhatsApp.

## Structure des commandes

- `commands/inc.js` → toutes les commandes groupe + propriétaire :
  `tagall, hidetag, tagadmins, promote, demote, kick, add, mute, unmute, left,
  grouplink, resetlink, kickadmins, kickall, listadmins, listonline, opentime,
  closetime, antilink, vcf, creategroup, join, closegc, opengc, warn, warns,
  resetwarn, welcome, goodbye, owner, repo, setpp, setprefix, restart, eval,
  ban, unban, self, public, autoread, autobio, autorecording, autotyping,
  autoviewstatus, autoreact, block, unblock, delete, addsudo, delsudo,
  listsudo, fixowner, getbot, mode`

- `commands/menu.js` → `menu` (alias `help`), `alive`, `ping`, `runtime`, `devinfo`

- `lib/store.js` → stockage JSON local (`data/store.json`) : sudo, bannis,
  avertissements, antilink, mode self/public, préfixe, réglages auto,
  programmation horaire des groupes.

- `lib/permissions.js` → vérifications propriétaire / sudo / admin.

- `lib/presence.js` → petit cache de présence utilisé par `.listonline`.

## Notes

- `eval`, `restart`, `setpp`, `setprefix`, `fixowner`, `creategroup`, `join`,
  `left`, `kickall`, `kickadmins` sont réservés au propriétaire principal du bot.
- `.self` / `.public` changent le mode de réponse global du bot.
- `.antilink on` supprime les messages contenant un lien (sauf admins/propriétaire)
  et avertit l'auteur (exclusion automatique après 3 avertissements).
- `.opentime HH:MM` / `.closetime HH:MM` programment l'ouverture/fermeture
  quotidienne automatique d'un groupe.
