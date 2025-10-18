const { Client, GatewayIntentBits, SlashCommandBuilder, ChannelType } = require('discord.js');
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

const serverDB = new Map(); // Anti-abuse tracker

client.once('ready', async () => {
  console.log('✅ AutoArchive Bot is online as', client.user.tag);

  // Register slash command
  const command = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Clean dead (inactive) text channels!');
  await client.application.commands.create(command);

  console.log('💬 Slash command /start registered globally.');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'start') return;

  console.log(`🚀 /start triggered by ${interaction.user.tag} in ${interaction.guild.name}`);
  await interaction.deferReply();

  const guild = interaction.guild;
  console.log(`🔍 Scanning guild: ${guild.name} (${guild.id})`);

  // Find all text channels
  const allTextChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  console.log(`📦 Found ${allTextChannels.size} text channels.`);

  // Only consider channels older than 1 minute (for testing)
  const oldChannels = allTextChannels.filter(
    c => Date.now() - c.createdTimestamp > 1 * 60 * 1000
  );
  console.log(`⏳ ${oldChannels.size} channels are older than 1 minute.`);

  const trulyDead = [];

  // Check which are inactive
  for (const [id, channel] of oldChannels) {
    console.log(`🔹 Checking #${channel.name} (${id})`);
    try {
      const msgs = await channel.messages.fetch({ limit: 1 });
      const lastMsg = msgs.first();
      const lastActive = lastMsg ? lastMsg.createdTimestamp : channel.createdTimestamp;
      const inactiveFor = Date.now() - lastActive;

      console.log(
        `   ↳ Last message: ${lastMsg ? new Date(lastMsg.createdTimestamp).toISOString() : 'none'}`
      );
      console.log(`   ↳ Inactive for: ${(inactiveFor / 1000).toFixed(0)} seconds`);

      if (inactiveFor > 1 * 60 * 1000) {
        trulyDead.push(channel);
        console.log(`   ✅ Marked as inactive`);
      } else {
        console.log(`   ❌ Still active`);
      }
    } catch (err) {
      console.log(`⚠️ Could not fetch messages for #${channel.name}: ${err.message}`);
    }
  }

  console.log(`📋 Inactive channels found: ${trulyDead.length}`);

  // Anti-abuse check
  if (serverDB.get(guild.id)?.freeUsed && trulyDead.length <= 200) {
    console.log('🚫 Free tier already used in this guild.');
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
    console.log('📁 Creating archive category...');
    archiveCategory = await guild.channels.create({
      name: 'Archived Channels',
      type: ChannelType.GuildCategory
    });
  } else {
    console.log('📁 Found existing archive category.');
  }

  // Move inactive channels
  let archivedCount = 0;
  for (const channel of trulyDead) {
    if (archivedCount < 200 || serverDB.get(guild.id)?.paid) {
      try {
        await channel.setParent(archiveCategory);
        archivedCount++;
        console.log(`📦 Archived #${channel.name}`);
      } catch (err) {
        console.log(`⚠️ Failed to move #${channel.name}: ${err.message}`);
      }
    }
  }

  // Record usage
  serverDB.set(guild.id, { freeUsed: true, paid: false, date: Date.now() });
  console.log(`✅ Archived ${archivedCount} channels.`);

  await interaction.editReply(
    `✅ **${archivedCount} channels archived to folder!**\n🎉 Server CLEAN!\n💡 200 free archives remaining! $5/mo = UNLIMITED + AUTO monthly\n[Upgrade](YOUR_STRIPE_LINK)`
  );
});

// Keep-alive server for Render
app.get('/', (req, res) => res.send('Bot running!'));
app.listen(port, '0.0.0.0', () => console.log(`🌐 Dummy server on port ${port}`));

// Login bot
client.login(process.env.DISCORD_TOKEN);
