const { Client, GatewayIntentBits, SlashCommandBuilder, ChannelType } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const serverDB = new Map(); // Anti-abuse tracker

client.once('ready', async () => {
  console.log('✅ AutoArchive Bot is online!');

  const command = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Clean dead (inactive) text channels!');
  await client.application.commands.create(command);

  console.log('💬 Slash command /start registered.');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'start') return;

  await interaction.deferReply();

  const guild = interaction.guild;
  const allTextChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

  // Channels older than 1 minute (for testing)
  const oldChannels = allTextChannels.filter(
    c => Date.now() - c.createdTimestamp > 1 * 60 * 1000
  );

  const trulyDead = [];

  console.log(`🔍 Checking ${oldChannels.size} text channels in ${guild.name}...`);

  // Determine if each is inactive
  for (const [id, channel] of oldChannels) {
    try {
      const msgs = await channel.messages.fetch({ limit: 1 });
      const lastMsg = msgs.first();
      const lastActive = lastMsg ? lastMsg.createdTimestamp : channel.createdTimestamp;
      const inactiveFor = Date.now() - lastActive;

      // If inactive for more than 1 minute (for testing)
      if (inactiveFor > 1 * 60 * 1000) {
        trulyDead.push(channel);
        console.log(`💀 Marked #${channel.name} as inactive`);
      }
    } catch (err) {
      console.log(`⚠️ Could not check #${channel.name}: ${err.message}`);
    }
  }

  // Anti-abuse check
  if (serverDB.get(guild.id)?.freeUsed && trulyDead.length <= 200) {
    return interaction.editReply(
      "⚠️ **FREE 200 already used in this server!**\n💎 **$5/month = UNLIMITED + AUTO-CLEAN**\n[Upgrade](YOUR_STRIPE_LINK)"
    );
  }

  // Find or create archive category
  let archiveCategory =
    guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name === 'Archived Channels'
    );

  if (!archiveCategory) {
    archiveCategory = await guild.channels.create({
      name: 'Archived Channels',
      type: ChannelType.GuildCategory
    });
  }

  // Move channels
  let archivedCount = 0;
  for (const channel of trulyDead) {
    if (archivedCount < 200 || serverDB.get(guild.id)?.paid) {
      await channel.setParent(archiveCategory).catch(() => {});
      archivedCount++;
    }
  }

  serverDB.set(guild.id, { freeUsed: true, paid: false, date: Date.now() });

  await interaction.editReply(
    `✅ **${archivedCount} channels archived to folder!**\n🎉 Server CLEAN!\n💡 200 free archives remaining! $5/mo = UNLIMITED + AUTO monthly\n[Upgrade](YOUR_STRIPE_LINK)`
  );

  console.log(`✅ Archived ${archivedCount} channels in ${guild.name}`);
});

// Keep-alive server (for Render)
app.get('/', (req, res) => res.send('Bot running!'));
app.listen(port, '0.0.0.0', () => console.log(`🌐 Dummy server on port ${port}`));

client.login(process.env.DISCORD_TOKEN);
