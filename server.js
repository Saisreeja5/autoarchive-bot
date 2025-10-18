const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const serverDB = new Map(); // Anti-abuse tracker

client.once('ready', () => {
  console.log('AutoArchive Bot ready!');
  const command = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Clean dead channels!');
  client.application.commands.create(command);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'start') {
    await interaction.deferReply();

    const guild = interaction.guild;
    const deadChannels = guild.channels.cache.filter(
      c =>
        c.type === 0 &&
        c.lastMessageId === null &&
        Date.now() - c.createdTimestamp > 30 * 24 * 60 * 60 * 1000
    );

    // ANTI-ABUSE CHECK
    if (serverDB.get(guild.id)?.freeUsed && deadChannels.size <= 200) {
      return interaction.editReply(
        " **FREE 200 already used in this server!**\n **$5/month = UNLIMITED + AUTO-CLEAN**\n[Upgrade](YOUR_STRIPE_LINK)"
      );
    }

    const archiveCategory =
      guild.channels.cache.find(c => c.name === ' Archived Channels') ||
      (await guild.channels.create({ name: ' Archived Channels', type: 4 }));

    let archivedCount = 0;

    deadChannels.forEach(async channel => {
      if (archivedCount < 200 || serverDB.get(guild.id)?.paid) {
        await channel.setParent(archiveCategory);
        archivedCount++;
      }
    });

    // MARK FREE USED
    serverDB.set(guild.id, { freeUsed: true, paid: false, date: Date.now() });

    interaction.editReply(
      ` **${archivedCount} channels archived to folder!**\n Server CLEAN!\n **FREE 200 done! $5/mo = UNLIMITED + AUTO monthly**\n[Upgrade](YOUR_STRIPE_LINK)`
    );
  }
});

// DUMMY HTTP SERVER FOR RENDER PORT SCAN (IGNORED BY DISCORD)
app.get('/', (req, res) => res.send('Bot running!'));
app.listen(port, '0.0.0.0', () => console.log(`Dummy server on port ${port}`));



client.login(process.env.DISCORD_TOKEN);
