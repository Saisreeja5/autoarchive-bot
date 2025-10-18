const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const serverDB = new Map();

client.once('ready', async () => {
  console.log(`✅ AutoArchive Bot is online as ${client.user.tag}`);

  const command = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Clean inactive text channels!');

  const guild = client.guilds.cache.first();
  if (guild) {
    await guild.commands.create(command);
    console.log(`💬 Registered /start for guild: ${guild.name}`);
  }

  app.get('/', (req, res) => res.send('Bot running!'));
  app.listen(port, '0.0.0.0', () => console.log(`🌐 Dummy server on port ${port}`));
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'start') return;

  await interaction.deferReply();
  const guild = interaction.guild;

  console.log(`🚀 /start triggered by ${interaction.user.tag} in ${guild.name}`);

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const deadChannels = guild.channels.cache.filter(c => {
    if (c.type !== 0) return false; // text channels only
    const lastMsg = c.lastMessage?.createdTimestamp || c.createdTimestamp;
    const inactive = now - lastMsg > sevenDays;
    return inactive;
  });

  console.log(`📊 Found ${deadChannels.size} inactive channels.`);

  if (deadChannels.size === 0) {
    return interaction.editReply('✅ 0 inactive channels found! 🎉');
  }

  const archiveCategory =
    guild.channels.cache.find(c => c.name === 'Archived Channels' && c.type === 4) ||
    (await guild.channels.create({ name: 'Archived Channels', type: 4 }));

  let archivedCount = 0;

  for (const [id, channel] of deadChannels) {
    if (archivedCount >= 200 && !serverDB.get(guild.id)?.paid) break;
    await channel.setParent(archiveCategory);
    archivedCount++;
    console.log(`📦 Archived #${channel.name}`);
  }

  serverDB.set(guild.id, { freeUsed: true, paid: false, date: Date.now() });

  interaction.editReply(
    `✅ ${archivedCount} inactive channels archived!\n🎉 Server CLEAN!\n💡 200 free archives done! $5/mo = UNLIMITED + AUTO monthly\n[Upgrade](YOUR_STRIPE_LINK)`
  );
});

client.login(process.env.DISCORD_TOKEN);
