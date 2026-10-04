const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits,
    REST,
    Routes 
} = require('discord.js');

// 1. Creazione del client del bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

// 2. Definizione dei comandi slash da registrare su Discord
const commands = [
    {
        name: 'claim',
        description: 'Richiedi il tuo premio!',
    },
    {
        name: 'quiz-pro',
        description: 'Mettiti alla prova con il quiz pro!',
    },
    {
        name: 'vero-falso',
        description: 'Mettiti alla prova con il gioco rapido Vero o Falso!',
    }
];

// 3. Evento di avvio e registrazione comandi mirata per il server
client.once('clientReady', async () => {
    console.log(`🤖 RX Bot attivo e online come: ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('In corso la registrazione dei comandi slash per il server...');
        
        // Incolla qui l'ID del tuo server tra gli apici
        const GUILD_ID = '1555944851856433165'; 

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands },
        );
        console.log('Comandi slash registrati istantaneamente nel server!');
    } catch (error) {
        console.error('Errore durante la registrazione dei comandi:', error);
    }
});

// Link del logo GIF
const LOGO_GIF_URL = 'https://cdn.discordapp.com/attachments/1555947304689602700/default_logo.gif';

// 4. Evento: Benvenuto e Autorole
client.on('guildMemberAdd', async (member) => {
    try {
        const roleId = process.env.COMMUNITY_ROLE_ID;
        const role = member.guild.roles.cache.get(roleId);

        if (role) {
            await member.roles.add(role);
            console.log(`[AUTOROLE] Ruolo ${role.name} assegnato a ${member.user.tag}`);
        }

        const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

        if (welcomeChannel) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle(`👋 Benvenuto su RJEXTV, ${member.user.username}!`)
                .setDescription(
                    `Ciao ${member}, benvenuto nella community ufficiale di **RJEXTV**! \n\n` +
                    `✅ Ti è stato assegnato automaticamente il ruolo <@&${roleId}>.`
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'RJEXTV • Community Bot', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await welcomeChannel.send({ embeds: [welcomeEmbed] });
        }
    } catch (error) {
        console.error('Errore benvenuto:', error);
    }
});

// 5. Comando per inviare il pannello dei Ticket (!setup-ticket)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!setup-ticket') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Solo gli amministratori possono usare questo comando.');
        }

        const ticketEmbed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('🎫 Ticket di Supporto')
            .setDescription(
                'Seleziona una categoria qui sotto per ricevere assistenza.\n\n' +
                '**Seleziona qui sotto:**'
            )
            .setThumbnail('https://media.discordapp.net/attachments/144724076146626632/1556042204659585125/download_1.gif?ex=6ac2b8bb&is=6ac1673b&hm=2b7ebce03f6982635314f8c137d15...')
            .setFooter({ text: 'rx tickets', iconURL: client.user.displayAvatarURL() });

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_ticket_category')
                .setPlaceholder('Seleziona una categoria ticket')
                .addOptions([
                    {
                        label: 'Supporto Generale',
                        description: 'Richiedi assistenza generale sul server',
                        value: 'supporto_generale',
                        emoji: '📥'
                    },
                    {
                        label: 'Supporto Tecnico',
                        description: 'Problemi tecnici o di configurazione',
                        value: 'supporto_tecnico',
                        emoji: '💻'
                    },
                    {
                        label: 'Ticket RJEX',
                        description: 'Richieste e informazioni dedicate a RJEX',
                        value: 'ticket_rjex',
                        emoji: '💜'
                    }
                ])
        );

        await message.channel.send({ embeds: [ticketEmbed], components: [selectMenu] });
        await message.delete().catch(() => {});
    }
});

// 6. Gestione delle Interazioni (Menu a Tendina, Bottoni, Ticket e Quiz)
client.on('interactionCreate', async (interaction) => {
    
    // Gestione Menu a tendina Ticket
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_category') {
        const guild = interaction.guild;
        const user = interaction.user;
        const selectedValue = interaction.values[0];

        let categoryName = 'Supporto';
        if (selectedValue === 'supporto_generale') categoryName = 'Supporto Generale';
        if (selectedValue === 'supporto_tecnico') categoryName = 'Supporto Tecnico';
        if (selectedValue === 'ticket_rjex') categoryName = 'Ticket RJEX';

        const channelName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');

        const existingChannel = guild.channels.cache.find(c => c.name === channelName);
        if (existingChannel) {
            return interaction.reply({ content: `❌ Hai già un ticket aperto: ${existingChannel}`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const parentId = process.env.TICKET_CATEGORY_ID;
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: (parentId && parentId.length > 10) ? parentId : null,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
                    },
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle(`🎫 Ticket: ${categoryName}`)
                .setDescription(`Ciao ${user}, benvenuto nel tuo ticket per **${categoryName}**.\n\nDescrivi la tua richiesta in dettaglio e uno staffer ti risponderà al più presto.`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'RJEXTV Support' })
                .setTimestamp();

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Chiudi Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `${user}`, embeds: [welcomeEmbed], components: [closeRow] });
            await interaction.editReply({ content: `✅ Ticket creato con successo: ${ticketChannel}` });

        } catch (error) {
            console.error('Errore creazione ticket:', error);
            await interaction.editReply({ content: '❌ Si è verificato un errore durante la creazione del ticket.' });
        }
    }

    // Chiusura Ticket tramite Bottone
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Il ticket verrà eliminato tra 5 secondi...', ephemeral: true });
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }

    // Comando Slash: /claim
    if (interaction.isChatInputCommand() && interaction.commandName === 'claim') {
        await interaction.reply({ content: '🎁 Ecco il tuo premio richiesto con successo!', ephemeral: true });
    }

    // Comando Slash: /quiz-pro
    if (interaction.isChatInputCommand() && interaction.commandName === 'quiz-pro') {
        const quizDatabase = [
            { domanda: "In quale anno è stata fondata ufficialmente la Sony PlayStation originale sul mercato giapponese?", corretta: "1994", opzioni: ["1998", "1994", "2001", "1990"] },
            { domanda: "Qual è il nome del creatore di Minecraft?", corretta: "Notch", opzioni: ["Gabe Newell", "Notch", "Hideo Kojima", "Miyazaki"] },
            { domanda: "Quale linguaggio di programmazione condivide il nome con un serpente?", corretta: "Python", opzioni: ["Java", "C++", "Python", "Ruby"] },
            { domanda: "In quale anno è uscito il primo capitolo di The Legend of Zelda su NES?", corretta: "1986", opzioni: ["1980", "1986", "1992", "1984"] },
            { domanda: "Come si chiama la celebre valuta digitale decentralizzata creata da Satoshi Nakamoto?", corretta: "Bitcoin", opzioni: ["Ethereum", "Bitcoin", "Ripple", "Litecoin"] },
            { domanda: "Qual è la software house che ha sviluppato la saga di Dark Souls e Elden Ring?", corretta: "FromSoftware", opzioni: ["Ubisoft", "EA Games", "FromSoftware", "Square Enix"] }
        ];

        const q = quizDatabase[Math.floor(Math.random() * quizDatabase.length)];
        const shuffledOptions = [...q.opzioni].sort(() => Math.random() - 0.5);

        const row = new ActionRowBuilder();
        shuffledOptions.forEach(opt => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(opt === q.corretta ? 'quiz_correct' : 'quiz_wrong')
                    .setLabel(opt)
                    .setStyle(ButtonStyle.Secondary)
            );
        });

        const response = await interaction.reply({
            content: `🧠 **QUIZ PRO:** ${q.domanda}`,
            components: [row],
            fetchReply: true,
        });

        const collector = response.createMessageComponentCollector({ time: 20000 });

        collector.on('collect', async i => {
            if (i.customId === 'quiz_correct') {
                await i.update({ content: `🎉 Geniale, **${i.user.username}**! Risposta esatta: **${q.corretta}** 🏆`, components: [] });
            } else {
                await i.update({ content: `❌ Errato, **${i.user.username}**! La risposta corretta era **${q.corretta}** 💀`, components: [] });
            }
        });
    }

    // Comando Slash: /vero-falso
    if (interaction.isChatInputCommand() && interaction.commandName === 'vero-falso') {
        const vfDatabase = [
            { affermazione: "Il linguaggio di programmazione JavaScript è stato creato originariamente in soli 10 giorni.", risposta: true },
            { affermazione: "I pinguini possono volare per brevi tratti quando fa molto freddo.", risposta: false },
            { affermazione: "Il monte Everest è la montagna più alta della Terra misurata dal livello del mare.", risposta: true },
            { affermazione: "Il personaggio di Mario (Super Mario) in origine si chiamava Jumpman.", risposta: true },
            { affermazione: "I cavalli sono in grado di respirare attraverso la bocca.", risposta: false },
            { affermazione: "La console Nintendo Switch è stata lanciata sul mercato nel 2017.", risposta: true }
        ];

        const item = vfDatabase[Math.floor(Math.random() * vfDatabase.length)];

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('vf_true').setLabel('VERO ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('vf_false').setLabel('FALSO ❌').setStyle(ButtonStyle.Danger)
            );

        const response = await interaction.reply({
            content: `⚖️ **VERO O FALSO:** ${item.affermazione}`,
            components: [row],
            fetchReply: true,
        });

        const collector = response.createMessageComponentCollector({ time: 20000 });

        collector.on('collect', async i => {
            const userChoice = i.customId === 'vf_true';
            if (userChoice === item.risposta) {
                await i.update({ content: `🎉 Corretto, **${i.user.username}**! L'affermazione era **${item.risposta ? 'VERA' : 'FALSA'}** 🏆`, components: [] });
            } else {
                await i.update({ content: `❌ Sbagliato, **${i.user.username}**! L'affermazione era **${item.risposta ? 'VERA' : 'FALSA'}** 💀`, components: [] });
            }
        });
    }
});

// 7. Server HTTP fittizio per mantenere attivo il bot 24h su 24 su Render
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('RJEXTV Bot is active!\n');
});
server.listen(process.env.PORT || 3000);

// 8. Login del bot con il token sicuro da Render
client.login(process.env.DISCORD_TOKEN);
