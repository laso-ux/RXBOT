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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

const commands = [
    { name: 'claim', description: 'Richiedi il tuo premio!' },
    { name: 'quiz-pro', description: 'Mettiti alla prova con il quiz pro!' },
    { name: 'vero-falso', description: 'Mettiti alla prova con il gioco rapido Vero o Falso!' },
    { name: 'ticket-setup', description: 'Crea il pannello dei ticket nel canale' }
];

// Registrazione immediata dei comandi tramite REST
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Inizio registrazione dei comandi slash...');
        
        // METTI QUI IL TUO ID SERVER TRA GLI APICI (es: '123456789012345678')
        const GUILD_ID = 'IL_TUO_ID_SERVER_VERO'; 
        const CLIENT_ID = client.user ? client.user.id : process.env.CLIENT_ID; // O usa il tuo Client ID se preferisci

        await rest.put(
            Routes.applicationGuildCommands('1416805822606540864', 'IL_TUO_ID_SERVER_VERO'), // Metti qui l'ID del client del bot e l'ID del server
            { body: commands },
        );
        
        console.log('✅ Comandi slash registrati con successo nel server!');
    } catch (error) {
        console.error('❌ Errore durante la registrazione dei comandi:', error);
    }
})();

client.once('ready', () => {
    console.log(`🤖 RX Bot attivo e online come: ${client.user.tag}`);
});

    if (!process.env.DISCORD_TOKEN) {
        console.error("❌ ERRORE: DISCORD_TOKEN non trovato nelle variabili d'ambiente!");
        return;
    }

    
    try {
        console.log('In corso la registrazione dei comandi slash per il server...');
        
        // ⚠️ INSERISCI QUI SOTTO L'ID DEL TUO SERVER TRA GLI APICI!
        const GUILD_ID = '1555944851856433165'; 

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands },
        );
        console.log('✅ Comandi slash registrati istantaneamente nel server!');
    } catch (error) {
        console.error('❌ Errore durante la registrazione dei comandi:', error);
    };

// Gestione Benvenuto Nuovi Utenti
client.on('guildMemberAdd', async (member) => {
    try {
        // Assegnazione automatica del ruolo community se configurato
        const roleId = process.env.COMMUNITY_ROLE_ID;
        if (roleId) {
            await member.roles.add(roleId).catch(err => console.error('Impossibile assegnare il ruolo:', err));
        }

        // Invio messaggio nel canale di benvenuto se configurato
        const channelId = process.env.WELCOME_CHANNEL_ID;
        if (channelId) {
            const channel = member.guild.channels.cache.get(channelId);
            if (channel) {
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('👋 Benvenuto nel server!')
                    .setDescription(`Ciao ${member}, benvenuto in **${member.guild.name}**! Siamo felici di averti qui con noi. 🚀`)
                    .setColor(0x00FF00)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await channel.send({ embeds: [welcomeEmbed] });
            }
        }
    } catch (err) {
        console.error('Errore nel sistema di benvenuto:', err);
    }
});

// Gestione interazioni (Comandi Slash e Ticket)
client.on('interactionCreate', async (interaction) => {
    try {
        // Gestione Comandi Slash
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'claim') {
                await interaction.reply({ content: '🎁 Ecco il tuo premio richiesto con successo!', ephemeral: true });
            }
            if (interaction.commandName === 'quiz-pro') {
                await interaction.reply({ content: '🧠 Quiz Pro avviato!', ephemeral: true });
            }
            if (interaction.commandName === 'vero-falso') {
                await interaction.reply({ content: '⚖️ Vero o Falso avviato!', ephemeral: true });
            }
            if (interaction.commandName === 'ticket-setup') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: '❌ Non hai i permessi per usare questo comando.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🎫 Supporto & Ticket')
                    .setDescription('Seleziona un opzione dal menu sottostante per aprire un ticket con lo staff.')
                    .setColor(0x00AE86);

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('create_ticket')
                        .setPlaceholder('Seleziona il motivo...')
                        .addOptions([
                            { label: 'Assistenza Generale', value: 'gen_ticket', description: 'Richiedi aiuto generico' },
                            { label: 'Segnalazione / Report', value: 'rep_ticket', description: 'Segnala un utente o un problema' }
                        ])
                );

                await interaction.reply({ embeds: [embed], components: [row] });
            }
        }

        // Gestione Apertura Ticket (Menu a tendina)
        if (interaction.isStringSelectMenu() && interaction.customId === 'create_ticket') {
            const guild = interaction.guild;
            const categoryId = process.env.TICKET_CATEGORY_ID;

            const channelName = `ticket-${interaction.user.username}`.toLowerCase();
            
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId || null,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                ],
            });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Chiudi Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await ticketChannel.send({
                content: `Benvenuto ${interaction.user}! Lo staff ti assisterà il prima possibile.`,
                components: [closeRow]
            });

            await interaction.reply({ content: `✅ Ticket creato con successo: ${ticketChannel}`, ephemeral: true });
        }

        // Gestione Chiusura Ticket (Bottone)
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await interaction.reply({ content: '🔒 Il canale verrà eliminato tra 5 secondi...' });
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error('Impossibile eliminare il canale del ticket:', err);
                }
            }, 5000);
        }

    } catch (err) {
        console.error('Errore nell\'interazione:', err);
    }
});

// Server HTTP per Render 24/7
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('RJEXTV Bot is active!\n');
});
server.listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);