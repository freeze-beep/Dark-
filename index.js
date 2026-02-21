    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const from = msg.key.remoteJid;
        // On récupère l'ID de celui qui envoie le message proprement
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // --- LOG POUR DEBUG ---
        // Cette ligne va afficher dans Render exactement qui écrit.
        console.log(`Message reçu de : ${sender} | Contenu : ${JSON.stringify(msg.message).slice(0, 50)}`);

        const type = Object.keys(msg.message)[0];
        const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : (type === 'imageMessage') ? msg.message.imageMessage.caption : (type === 'videoMessage') ? msg.message.videoMessage.caption : '';
        const prefix = ".";

        if (!body.startsWith(prefix)) return;
        
        // --- SÉCURITÉ SOUPLE ---
        // On vérifie si le numéro est contenu dans l'ID de l'envoyeur
        const isMe = sender.includes("243986860268");
        if (!isMe) return; 

        const arg = body.slice(prefix.length).trim().split(/ +/g);
        const cmd = arg.shift().toLowerCase();

        switch (cmd) {
            case 'ping':
                await sock.sendMessage(from, { text: "⚡ *0.001ms* - Je suis bien actif, Master." }, { quoted: msg });
                break;

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

*Kiyotaka Ayanokoji*`;

                await sock.sendMessage(from, { 
                    image: { url: "https://files.catbox.moe/9f9p3p.jpg" }, 
                    caption: menuText 
                }, { quoted: msg });
                break;

            case 'vv':
                try {
                    const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quotedMsg) return;
                    const viewOnceMsg = quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessage?.message;
                    if (!viewOnceMsg) return;
                    const mediaType = Object.keys(viewOnceMsg)[0];
                    const media = viewOnceMsg[mediaType];
                    const stream = await downloadContentFromMessage(media, mediaType.replace('Message', ''));
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                    if (mediaType === 'imageMessage') await sock.sendMessage(from, { image: buffer, caption: "✅ Image purifiée." });
                    else await sock.sendMessage(from, { video: buffer, caption: "✅ Vidéo purifiée." });
                } catch (e) {
                    console.log("Erreur VV:", e);
                }
                break;
        }
    });
