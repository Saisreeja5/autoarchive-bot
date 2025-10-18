const { Client, GatewayIntentBits, SlashCommandBuilder, ChannelType } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;

// Dummy HTTP server for Render
app.get('/', (req, res) => res.send('Bot running!'));
app.listen(port, '0.0.0.0', () => console.log(`🌐 Dummy server running on port ${port}`));

// Discord client with required intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
  console.log(`✅ Bot online as ${client.user.tag}`);

  // Register /start command in first guild for instant testing
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.log('⚠️ Bot is not in any guilds!');
    return;
  }

  const startCommand = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Test: count channels');
  
  await guild.commands.create(startCommand);
  console.log(`💬 /start command registered in guild: ${guild.name}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'start') return;

  const guild = interaction.guild;
  const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

  console.log(`📊 Guild ${guild.name} has ${textChannels.size} text channels.`);
  await interaction.reply(`📊 This server has ${textChannels.size} text channels.`);
});

// Login bot
client.login(process.env.TOKEN);
