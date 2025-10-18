const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages
  ] 
});

const serverDB = new Map();

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
    const deadChannels = guild.channels.cache.filter(c => 
      c.type === 0 && c.lastMessageId === null && Date.now() - c.createdTimestamp > 30*24*60*60*1000
    );
    
    const serverData = serverDB.get(guild.id) || { totalArchived: 0, paid: false, date: null };
    
    if (serverData.totalArchived >= 200 && !serverData.paid) {
      return interaction.editReply("⚠️ **FREE 200 already used in this server!**\n💎 **$5/month = UNLIMITED + AUTO-CLEAN**\n[Upgrade](YOUR_STRIPE_LINK)");
    }
    
    const archiveCategory = guild.channels.cache.find(c => c.name === '📦 Archived Channels') || 
      await guild.channels.create({ name: '📦 Archived Channels', type: 4 });
    
    let archivedCount = 0;
    const channelsToArchive = Array.from(deadChannels.values());
    
    for (const channel of channelsToArchive) {
      if (serverData.paid || serverData.totalArchived + archivedCount < 200) {
        await channel.setParent(archiveCategory);
        archivedCount++;
      }
    }
    
    serverData.totalArchived += archivedCount;
    serverData.date = Date.now();
    serverDB.set(guild.id, serverData);
    
    const remainingFree = serverData.paid ? 'UNLIMITED' : Math.max(0, 200 - serverData.totalArchived);
    const upgradeMessage = serverData.paid ? '' : `\n💡 **${remainingFree} free archives remaining! $5/mo = UNLIMITED + AUTO monthly**\n[Upgrade](YOUR_STRIPE_LINK)`;
    
    interaction.editReply(`✅ **${archivedCount} channels archived to folder!**\n🎉 Server CLEAN!${upgradeMessage}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
