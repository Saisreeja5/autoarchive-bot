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

// Start Express server BEFORE Discord client
app.get('/', (req, res) => res.send('Bot running!'));

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
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'start') return;
  
  await interaction.deferReply();
  const guild = interaction.guild;
  
  console.log(`🚀 /start triggered by ${interaction.user.tag} in ${guild.name}`);
  
  const now = Date.now();
  const oneMinute = 60 * 1000; // 1 MINUTE (change this to test)
  
  const deadChannels = [];
  
  for (const [id, channel] of guild.channels.cache) {
    // Only process text channels
    if (channel.type !== 0) continue;
    
    let lastActivityTime;
    
    try {
      // Try to fetch last message
      const messages = await channel.messages.fetch({ limit: 1 });
      if (messages.size > 0) {
        lastActivityTime = messages.first().createdTimestamp;
      } else {
        // No messages, use channel creation time
        lastActivityTime = channel.createdTimestamp;
      }
    } catch (error) {
      console.error(`❌ Error fetching messages from #${channel.name}:`, error.message);
      // Fallback to creation time
      lastActivityTime = channel.createdTimestamp;
    }
    
    const timeSinceActivity = now - lastActivityTime;
    const isInactive = timeSinceActivity > oneMinute;
    
    console.log(`📝 Channel: #${channel.name} | Last activity: ${Math.round(timeSinceActivity / 1000)}s ago | Inactive: ${isInactive}`);
    
    if (isInactive) {
      deadChannels.push(channel);
    }
  }
  
  console.log(`📊 Found ${deadChannels.length} inactive channels.`);
  
  if (deadChannels.length === 0) {
    return interaction.editReply('✅ 0 channels archived to folder! Server CLEAN! 200 free archives remaining! $5/mo = UNLIMITED + AUTO monthly');
  }
  
  // Create or find archive category
  let archiveCategory = guild.channels.cache.find(c => c.name === 'Archived Channels' && c.type === 4);
  
  if (!archiveCategory) {
    archiveCategory = await guild.channels.create({
      name: 'Archived Channels',
      type: 4 // Category
    });
    console.log(`📁 Created archive category`);
  }
  
  let archivedCount = 0;
  const freeLimit = 200;
  const isPaid = serverDB.get(guild.id)?.paid || false;
  
  for (const channel of deadChannels) {
    if (archivedCount >= freeLimit && !isPaid) {
      console.log(`⚠️ Free limit (${freeLimit}) reached`);
      break;
    }
    
    try {
      await channel.setParent(archiveCategory.id);
      archivedCount++;
      console.log(`📦 Archived #${channel.name}`);
    } catch (error) {
      console.error(`❌ Failed to archive #${channel.name}:`, error.message);
    }
  }
  
  serverDB.set(guild.id, { freeUsed: true, paid: false, date: Date.now() });
  
  const remaining = freeLimit - archivedCount;
  
  interaction.editReply(
    `✅ ${archivedCount} channels archived to folder! Server CLEAN! ${remaining} free archives remaining! $5/mo = UNLIMITED + AUTO monthly`
  );
});

app.listen(port, '0.0.0.0', () => console.log(`🌐 Dummy server on port ${port}`));


client.login(process.env.DISCORD_TOKEN);
