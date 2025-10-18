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

// Start Express server
app.get('/', (req, res) => res.send('Bot running!'));
app.listen(port, '0.0.0.0', () => console.log(`🌐 Dummy server on port ${port}`));

client.once('ready', async () => {
  console.log(`✅ AutoArchive Bot is online as ${client.user.tag}`);
  console.log(`📅 Bot started at: ${new Date().toISOString()}`);
  
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
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 /start triggered by ${interaction.user.tag} in ${guild.name}`);
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  console.log(`⏰ Timestamp: ${Date.now()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const now = Date.now();
  const inactiveThreshold = 60 * 1000; // 1 MINUTE
  
  console.log(`⚙️ Inactive threshold: ${inactiveThreshold / 1000} seconds (${inactiveThreshold / 60000} minutes)`);
  
  // Get all text channels
  const allChannels = guild.channels.cache.filter(c => c.type === 0);
  console.log(`📋 Total text channels found: ${allChannels.size}`);
  
  const deadChannels = [];
  let channelIndex = 0;
  
  for (const [id, channel] of allChannels) {
    channelIndex++;
    console.log(`\n--- Channel ${channelIndex}/${allChannels.size}: #${channel.name} (ID: ${id}) ---`);
    
    let lastActivityTime;
    let activitySource = '';
    
    try {
      // Try to fetch last message
      console.log(`  🔍 Fetching messages...`);
      const messages = await channel.messages.fetch({ limit: 1 });
      
      if (messages.size > 0) {
        const lastMsg = messages.first();
        lastActivityTime = lastMsg.createdTimestamp;
        activitySource = `last message by ${lastMsg.author.tag}`;
        console.log(`  ✅ Last message: "${lastMsg.content?.substring(0, 50) || '[no content]'}" by ${lastMsg.author.tag}`);
        console.log(`  📅 Message time: ${new Date(lastActivityTime).toISOString()}`);
      } else {
        // No messages, use channel creation time
        lastActivityTime = channel.createdTimestamp;
        activitySource = 'channel creation (no messages)';
        console.log(`  ⚠️ No messages found in channel`);
        console.log(`  📅 Channel created: ${new Date(lastActivityTime).toISOString()}`);
      }
    } catch (error) {
      console.error(`  ❌ Error fetching messages: ${error.message}`);
      // Fallback to creation time
      lastActivityTime = channel.createdTimestamp;
      activitySource = 'channel creation (fetch error)';
      console.log(`  📅 Fallback to creation time: ${new Date(lastActivityTime).toISOString()}`);
    }
    
    const timeSinceActivity = now - lastActivityTime;
    const secondsAgo = Math.round(timeSinceActivity / 1000);
    const minutesAgo = Math.round(timeSinceActivity / 60000);
    const isInactive = timeSinceActivity > inactiveThreshold;
    
    console.log(`  ⏱️ Time since activity: ${secondsAgo}s (${minutesAgo}m) - ${activitySource}`);
    console.log(`  📊 Inactive? ${isInactive ? '✅ YES' : '❌ NO'} (threshold: ${inactiveThreshold / 1000}s)`);
    
    if (isInactive) {
      deadChannels.push(channel);
      console.log(`  ➕ Added to archive list`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 SUMMARY: Found ${deadChannels.length} inactive channels out of ${allChannels.size} total`);
  console.log(`${'='.repeat(60)}\n`);
  
  if (deadChannels.length === 0) {
    console.log(`✅ No channels to archive. Sending success message.`);
    return interaction.editReply('✅ 0 channels archived to folder! Server CLEAN! 200 free archives remaining! $5/mo = UNLIMITED + AUTO monthly');
  }
  
  // Create or find archive category
  console.log(`📁 Looking for archive category...`);
  let archiveCategory = guild.channels.cache.find(c => c.name === 'Archived Channels' && c.type === 4);
  
  if (!archiveCategory) {
    console.log(`📁 Archive category not found. Creating new one...`);
    archiveCategory = await guild.channels.create({
      name: 'Archived Channels',
      type: 4
    });
    console.log(`✅ Created archive category (ID: ${archiveCategory.id})`);
  } else {
    console.log(`✅ Found existing archive category (ID: ${archiveCategory.id})`);
  }
  
  let archivedCount = 0;
  const freeLimit = 200;
  const isPaid = serverDB.get(guild.id)?.paid || false;
  
  console.log(`\n🔄 Starting to archive ${deadChannels.length} channels...`);
  
  for (const channel of deadChannels) {
    if (archivedCount >= freeLimit && !isPaid) {
      console.log(`⚠️ Free limit (${freeLimit}) reached. Stopping.`);
      break;
    }
    
    try {
      console.log(`  📦 Archiving #${channel.name}...`);
      await channel.setParent(archiveCategory.id);
      archivedCount++;
      console.log(`  ✅ Successfully archived #${channel.name} (${archivedCount}/${deadChannels.length})`);
    } catch (error) {
      console.error(`  ❌ Failed to archive #${channel.name}: ${error.message}`);
    }
  }
  
  serverDB.set(guild.id, { freeUsed: true, paid: false, date: Date.now() });
  
  const remaining = freeLimit - archivedCount;
  
  console.log(`\n✅ Archive complete! ${archivedCount} channels archived.`);
  console.log(`${'='.repeat(60)}\n`);
  
  interaction.editReply(
    `✅ ${archivedCount} channels archived to folder! Server CLEAN! ${remaining} free archives remaining! $5/mo = UNLIMITED + AUTO monthly`
  );
});

client.login(process.env.DISCORD_TOKEN);
```

---

## 🧪 What This Will Show You

Now when you run `/start`, you'll see in Render logs:
```
🚀 /start triggered by YourName in YourServer
📅 Current time: 2025-10-18T15:38:00.000Z
⏰ Timestamp: 1729266000000

⚙️ Inactive threshold: 60 seconds (1 minutes)
📋 Total text channels found: 5

--- Channel 1/5: #general (ID: 123456789) ---
  🔍 Fetching messages...
  ✅ Last message: "/start" by YourBot#1234
  📅 Message time: 2025-10-18T15:37:55.000Z
  ⏱️ Time since activity: 5s (0m) - last message by YourBot#1234
  📊 Inactive? ❌ NO (threshold: 60s)
