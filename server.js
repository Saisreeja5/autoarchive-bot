// ADD THIS AT THE VERY TOP - BEFORE ANY IMPORTS
console.log('========================================');
console.log('🚀 SERVER.JS FILE STARTED');
console.log('📅 Time:', new Date().toISOString());
console.log('========================================\n');

const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');

console.log('✅ Imports loaded successfully\n');

const app = express();
const port = process.env.PORT || 10000;

console.log('🔍 Checking DISCORD_TOKEN...');
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ CRITICAL: DISCORD_TOKEN environment variable is NOT SET!');
  console.error('❌ Go to Render Dashboard → Environment → Add DISCORD_TOKEN');
  process.exit(1);
}

if (token.length < 50) {
  console.error('❌ CRITICAL: DISCORD_TOKEN seems invalid (too short)');
  console.error(`❌ Current length: ${token.length} characters`);
  console.error('❌ Expected: ~70+ characters');
  console.error(`❌ Token preview: ${token.substring(0, 20)}...`);
  process.exit(1);
}

console.log('✅ DISCORD_TOKEN found');
console.log(`   Length: ${token.length} chars`);
console.log(`   Preview: ${token.substring(0, 15)}...${token.substring(token.length - 5)}\n`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log('✅ Discord Client created\n');

const serverDB = new Map();

// Express server
console.log('🌐 Setting up Express routes...');

app.get('/', (req, res) => {
  console.log('🔔 Homepage accessed');
  res.send('Bot is running!');
});

app.get('/status', (req, res) => {
  const status = {
    expressRunning: true,
    discordReady: client.isReady(),
    botUser: client.user?.tag || 'Not logged in yet',
    guilds: client.guilds.cache.size,
    uptime: client.uptime ? Math.floor(client.uptime / 1000) + 's' : 'N/A',
    timestamp: new Date().toISOString()
  };
  console.log('📊 Status check:', status);
  res.json(status);
});

console.log('✅ Express routes configured');
console.log(`🌐 Starting Express on port ${port}...\n`);

app.listen(port, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`✅ EXPRESS SERVER RUNNING ON PORT ${port}`);
  console.log(`📍 URL: https://autoarchive-bot.onrender.com`);
  console.log('========================================\n');
});

// Discord event listeners
console.log('📝 Registering Discord event handlers...\n');

client.once('ready', async () => {
  console.log('\n🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
  console.log('✅✅✅ DISCORD BOT IS ONLINE AND READY! ✅✅✅');
  console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n');
  
  console.log(`👤 Bot User: ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log(`📅 Ready At: ${new Date().toISOString()}`);
  console.log(`🏠 Connected Servers: ${client.guilds.cache.size}\n`);
  
  if (client.guilds.cache.size === 0) {
    console.log('⚠️⚠️⚠️ WARNING: Bot is not in ANY servers! ⚠️⚠️⚠️');
    console.log('Invite URL: https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=16&scope=bot%20applications.commands\n');
  } else {
    console.log('📋 Server List:');
    client.guilds.cache.forEach(g => {
      console.log(`   - ${g.name} (${g.memberCount} members, ${g.channels.cache.size} channels)`);
    });
    console.log('');
  }
  
  // Register command
  const guild = client.guilds.cache.first();
  if (guild) {
    try {
      console.log(`🔧 Registering /start command in: ${guild.name}`);
      
      const command = new SlashCommandBuilder()
        .setName('start')
        .setDescription('Archive inactive channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
      
      const createdCommand = await guild.commands.create(command);
      console.log(`✅ Command registered! ID: ${createdCommand.id}\n`);
      
      // List all commands
      const commands = await guild.commands.fetch();
      console.log(`📋 All registered commands (${commands.size}):`);
      commands.forEach(cmd => {
        console.log(`   /${cmd.name} - ${cmd.description} (ID: ${cmd.id})`);
      });
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to register command: ${error.message}`);
      console.error(`   Error code: ${error.code}\n`);
    }
  }
  
  console.log('🎯 Bot is now listening for /start commands!\n');
});

client.on('interactionCreate', async interaction => {
  console.log('\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡');
  console.log('📥 INTERACTION RECEIVED!');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`   User: ${interaction.user.tag}`);
  console.log(`   Guild: ${interaction.guild?.name}`);
  console.log(`   Channel: ${interaction.channel?.name}`);
  console.log(`   Type: ${interaction.type}`);
  console.log(`   Is Command: ${interaction.isChatInputCommand()}`);
  console.log(`   Command Name: ${interaction.commandName || 'N/A'}`);
  console.log('⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n');
  
  if (!interaction.isChatInputCommand()) {
    console.log('⏭️ Not a slash command, ignoring\n');
    return;
  }
  
  if (interaction.commandName !== 'start') {
    console.log(`⏭️ Not /start command (got: ${interaction.commandName}), ignoring\n`);
    return;
  }
  
  console.log('✅ This is the /start command! Processing...\n');
  
  try {
    console.log('⏳ Step 1: Deferring reply...');
    await interaction.deferReply();
    console.log('✅ Reply deferred successfully\n');
    
    const guild = interaction.guild;
    const now = Date.now();
    const inactiveThreshold = 60 * 1000;
    
    console.log(`⚙️ Configuration:`);
    console.log(`   Inactive threshold: ${inactiveThreshold / 1000}s`);
    console.log(`   Current time: ${now}\n`);
    
    console.log('⏳ Step 2: Fetching text channels...');
    const allChannels = guild.channels.cache.filter(c => c.type === 0);
    console.log(`✅ Found ${allChannels.size} text channels:\n`);
    
    allChannels.forEach(ch => console.log(`   - #${ch.name} (ID: ${ch.id})`));
    console.log('');
    
    const deadChannels = [];
    
    console.log('⏳ Step 3: Checking each channel for activity...\n');
    
    for (const [id, channel] of allChannels) {
      console.log(`🔍 Checking #${channel.name}...`);
      
      let lastActivityTime;
      
      try {
        const messages = await channel.messages.fetch({ limit: 1 });
        
        if (messages.size > 0) {
          const msg = messages.first();
          lastActivityTime = msg.createdTimestamp;
          const secondsAgo = Math.round((now - lastActivityTime) / 1000);
          console.log(`   Last message: ${secondsAgo}s ago by ${msg.author.tag}`);
        } else {
          lastActivityTime = channel.createdTimestamp;
          const secondsAgo = Math.round((now - lastActivityTime) / 1000);
          console.log(`   No messages. Channel created ${secondsAgo}s ago`);
        }
      } catch (error) {
        console.log(`   ⚠️ Cannot fetch messages: ${error.message}`);
        lastActivityTime = channel.createdTimestamp;
      }
      
      const timeSinceActivity = now - lastActivityTime;
      const isInactive = timeSinceActivity > inactiveThreshold;
      
      console.log(`   Time since activity: ${Math.round(timeSinceActivity / 1000)}s`);
      console.log(`   Inactive (>${inactiveThreshold / 1000}s)? ${isInactive ? '✅ YES' : '❌ NO'}`);
      
      if (isInactive) {
        deadChannels.push(channel);
        console.log(`   ➕ Added to archive list`);
      }
      console.log('');
    }
    
    console.log(`📊 Result: ${deadChannels.length} channels will be archived\n`);
    
    if (deadChannels.length === 0) {
      console.log('⏳ Step 4: No channels to archive, sending success message...');
      await interaction.editReply('✅ 0 channels archived to folder! Server CLEAN! 200 free archives remaining! $5/mo = UNLIMITED + AUTO monthly');
      console.log('✅ Success message sent!\n');
      return;
    }
    
    console.log('⏳ Step 4: Finding/creating archive category...');
    let archiveCategory = guild.channels.cache.find(c => c.name === 'Archived Channels' && c.type === 4);
    
    if (!archiveCategory) {
      console.log('   Creating new category...');
      archiveCategory = await guild.channels.create({
        name: 'Archived Channels',
        type: 4
      });
      console.log(`   ✅ Created (ID: ${archiveCategory.id})`);
    } else {
      console.log(`   ✅ Found existing (ID: ${archiveCategory.id})`);
    }
    console.log('');
    
    console.log('⏳ Step 5: Archiving channels...\n');
    
    let archivedCount = 0;
    const freeLimit = 200;
    
    for (const channel of deadChannels) {
      if (archivedCount >= freeLimit) {
        console.log('⚠️ Free limit reached, stopping\n');
        break;
      }
      
      try {
        console.log(`   [${archivedCount + 1}/${deadChannels.length}] Moving #${channel.name}...`);
        await channel.setParent(archiveCategory.id);
        archivedCount++;
        console.log(`   ✅ Moved successfully`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
    
    const remaining = freeLimit - archivedCount;
    
    console.log(`\n⏳ Step 6: Sending final reply...`);
    console.log(`   Archived: ${archivedCount}`);
    console.log(`   Remaining: ${remaining}\n`);
    
    await interaction.editReply(
      `✅ ${archivedCount} channels archived to folder! Server CLEAN! ${remaining} free archives remaining! $5/mo = UNLIMITED + AUTO monthly\n[Upgrade](YOUR_STRIPE_LINK)`
    );
    
    console.log('✅✅✅ COMMAND COMPLETED SUCCESSFULLY! ✅✅✅\n');
    
  } catch (error) {
    console.error('\n❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
    console.error('FATAL ERROR IN INTERACTION HANDLER!');
    console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
    console.error('Stack trace:', error.stack);
    console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
    
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ An error occurred! Check bot permissions and Render logs.');
      } else {
        await interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
      }
    } catch (replyError) {
      console.error('❌ Could not send error reply:', replyError.message, '\n');
    }
  }
});

client.on('error', error => {
  console.error('\n❌ Discord.js Client Error:', error.message);
  console.error('   Stack:', error.stack, '\n');
});

client.on('warn', info => {
  console.warn('\n⚠️ Discord.js Warning:', info, '\n');
});

client.on('shardError', error => {
  console.error('\n❌ Shard Error:', error.message, '\n');
});

// CRITICAL: Login attempt
console.log('========================================');
console.log('🔐 ATTEMPTING TO LOGIN TO DISCORD...');
console.log('========================================\n');

client.login(token)
  .then(() => {
    console.log('✅ Login call successful! Waiting for ready event...\n');
  })
  .catch(error => {
    console.error('\n❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
    console.error('CRITICAL: DISCORD LOGIN FAILED!');
    console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('\nCommon causes:');
    console.error('1. Invalid/expired token');
    console.error('2. Token not properly saved in Render');
    console.error('3. Missing privileged intents in Discord Developer Portal');
    console.error('4. Bot application was deleted');
    console.error('\nDouble-check:');
    console.error('- Render Dashboard → Environment → DISCORD_TOKEN');
    console.error('- Discord Developer Portal → Bot → Token');
    console.error('- Discord Developer Portal → Bot → Privileged Gateway Intents (enable MESSAGE CONTENT)');
    console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
    process.exit(1);
  });

console.log('📝 Script execution completed. Waiting for events...\n');
