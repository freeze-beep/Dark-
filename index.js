const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require('express');
const app = express();

// Serveur pour éviter que Render ne s'endorme
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Ayanokoji Bot Privé Actif'));
app.listen(port, () => console.log(`Serveur actif sur port ${port}`));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        // Identité Mac OS pour forcer la validation WhatsApp
        browser: ["Mac OS", "Safari", "10.15.7"]
    });

    // --- CONFIGURATION ---
    const MY_NUMBER = "243986860268@s.whatsapp.net"; 
    const phoneNumber = "243986860268"; 
    const IMAGE_AYANOKOJI = "https://files.catbox.moe/9f9p3p.jpg"; 

    // Demande du code de jumelage
    if (!sock.authState.creds.registered) {
        await delay(15000); // Pause de sécurité
        try {
            let code = await sock.requestPairingCode(phoneNumber);
            console.log("------------------------------------------");
            console.log(`VOTRE CODE DE JUMELAGE : ${code}`);
            console.log("------------------------------------------");
        } catch (e) { 
            console.log("Erreur de génération. Relancez le déploiement.");
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // SÉCURITÉ : Répond uniquement à TOI
        if (sender !== MY_NUMBER) return; 

        const type = Object.keys(msg.message)[0];
        const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : (type === 'imageMessage') ? msg.message.imageMessage.caption : (type === 'videoMessage') ? msg.message.videoMessage.caption : '';
        const prefix = ".";

        if (!body.startsWith(prefix)) return;
        const arg = body.slice(prefix.length).trim().split(/ +/g);
        const cmd = arg.shift().toLowerCase();

        switch (cmd) {
            case 'menu':
                const menuText = `
HEY MASTER, HOW CAN I HELP YOU?
「 BOT INFO 」
⚡ CREATOR: AYANOKOJI
⚡ STATUT: ACTIF
⚡ PREFIXE: [ . ]

「 OWNER MENU 」
⚡ SELF | PUBLIC | ALIVE | PING
⚡ REPO | OWNER | VV | PURGE

「 DOWNLOAD MENU 」
⚡ PLAY | VIDEO | APK | IMG
⚡ TIKTOK | YTSEARCH | FB

「 ANIME & FUN 」
⚡ WAIFU | AI | TRUTH | DARE
⚡ JOKE | MEME | QUOTE

「 STICKER MENU 」
⚡ STICKER | KISS | HUG | SLAP

*Kiyotaka Ayanokoji : Le bot parfait.*`;

                await sock.sendMessage(from, { 
                    image: { url: IMAGE_AYANOKOJI }, 
                    caption: menuText 
                }, { quoted: msg });
                break;

            case 'vv': // Anti-Vue Unique
                const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (!quotedMsg) return;
                const viewOnceMsg = quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessage?.message;
                if (!viewOnceMsg) return;
                const mediaType = Object.keys(viewOnceMsg)[0];
                const media = viewOnceMsg[mediaType];
                const stream = await downloadContentFromMessage(media, mediaType.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                if (mediaType === 'imageMessage') await sock.sendMessage(from, { image: buffer, caption: "✅ Purifié." });
                else await sock.sendMessage(from, { video: buffer, caption: "✅ Purifié." });
                break;

            case 'purge': // Commande Purge
                if (!from.endsWith('@g.us')) return;
                const groupMetadata = await sock.groupMetadata(from);
                const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const users = groupMetadata.participants.filter(p => p.id !== botNumber && p.id !== MY_NUMBER);
                await sock.sendMessage(from, { text: "🚀 *Début de la purification...*" });
                for (let user of users) {
                    await delay(800);
                    await sock.groupParticipantsUpdate(from, [user.id], "remove");
                }
                await sock.sendMessage(from, { text: "🧤 *Kiyotaka Ayanokoji vous a purifié.*" });
                break;

            case 'ping':
                await sock.sendMessage(from, { text: "⚡ *0.001ms* - Fluide." });
                break;
        }
    });
}

startBot();

