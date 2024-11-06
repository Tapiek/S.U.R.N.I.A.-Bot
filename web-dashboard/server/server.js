// web-dashboard/server/server.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Controllers
const rosterController = require('./controllers/rosterController');
const characterController = require('./controllers/characterController');
const auditController = require('./controllers/auditController');
const characterRoutes = require('./routes/character'); // Corrected require statement

// Initialize Discord client with all required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers
    ],
});

// Initialize Express app
const app = express();

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Adjust as needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Middleware to check Discord client status
app.use((req, res, next) => {
    if (!client.isReady()) {
        return res.status(503).json({ 
            error: 'Discord client not ready',
            details: 'The bot is still connecting to Discord'
        });
    }
    next();
});

// API Routes
app.use('/api/roster', rosterController);
app.use('/api/characters', characterController);
app.use('/api/audit', auditController);
app.use('/api/character', characterRoutes); // Corrected route setup

// Server stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        // Fetch full member list
        await guild.members.fetch();

        const stats = {
            totalMembers: guild.memberCount,
            onlineMembers: guild.members.cache.filter(member => 
                member.presence?.status === 'online' || 
                member.presence?.status === 'idle' || 
                member.presence?.status === 'dnd'
            ).size,
            offlineMembers: guild.members.cache.filter(member => 
                !member.presence || member.presence.status === 'offline'
            ).size,
            lastUpdated: new Date().toISOString()
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching server stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch server statistics',
            details: error.message 
        });
    }
});

// Route to get list of text channels
app.get('/api/channels', async (req, res) => {
    try {
        const guildId = process.env.GUILD_ID;
        if (!guildId) {
            return res.status(500).json({ 
                error: 'Guild ID not configured',
                details: 'GUILD_ID is missing in environment variables'
            });
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ 
                error: 'Guild not found',
                details: `Bot is not in guild with ID ${guildId}`
            });
        }

        // Get all text channels
        const channels = guild.channels.cache
            .filter(channel => channel.type === 0) // 0 is GUILD_TEXT
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                parent: channel.parent?.name || 'No Category',
                position: channel.position,
                permissions: channel.permissionsFor(client.user)?.has('SendMessages')
            }))
            .sort((a, b) => {
                // Sort by category first, then by position
                if (a.parent !== b.parent) {
                    return a.parent.localeCompare(b.parent);
                }
                return a.position - b.position;
            });

        res.json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ 
            error: 'Failed to fetch channels',
            details: error.message
        });
    }
});

// Route to send an embed message
app.post('/api/sendEmbed', async (req, res) => {
    const { channelId, embedData } = req.body;

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            return res.status(404).json({ 
                error: 'Channel not found',
                details: 'The specified channel does not exist'
            });
        }

        // Check bot permissions in the channel
        const permissions = channel.permissionsFor(client.user);
        if (!permissions?.has('SendMessages') || !permissions.has('EmbedLinks')) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                details: 'Bot does not have permission to send messages or embeds in this channel'
            });
        }

        // Convert hex color to integer
        const colorInt = embedData.color ? parseInt(embedData.color.replace('#', ''), 16) : 0x0099ff;

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(embedData.title || '')
            .setDescription(embedData.description || '')
            .setColor(colorInt);

        // Add author if provided
        if (embedData.author) {
            embed.setAuthor({
                name: embedData.author,
                iconURL: embedData.authorImage || undefined
            });
        }

        // Add footer if provided
        if (embedData.footer) {
            embed.setFooter({ text: embedData.footer });
        }

        // Add timestamp if enabled
        if (embedData.timestamp) {
            embed.setTimestamp();
        }

        // Add thumbnail if provided
        if (embedData.thumbnail) {
            embed.setThumbnail(embedData.thumbnail);
        }

        // Add image if provided
        if (embedData.image) {
            embed.setImage(embedData.image);
        }

        // Add fields if provided
        if (Array.isArray(embedData.fields)) {
            embedData.fields.forEach(field => {
                if (field.name && field.value) {
                    embed.addFields({
                        name: field.name,
                        value: field.value,
                        inline: !!field.inline
                    });
                }
            });
        }

        // Send the embed
        const message = await channel.send({ embeds: [embed] });
        
        res.json({ 
            message: 'Embed sent successfully',
            messageId: message.id,
            channelId: channel.id
        });
    } catch (error) {
        console.error('Error sending embed:', error);
        res.status(500).json({ 
            error: 'Failed to send embed',
            details: error.message
        });
    }
});

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Discord Dashboard API',
        version: '1.0.0',
        status: 'operational'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        discord: client.isReady() ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: err.message,
        path: req.path,
        method: req.method
    });
});

// Discord client event handlers
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{
            name: 'https://discord.gg/jTdqcs74bP | U.S.S. Surnia - NX-2526',
            type: 3 // WATCHING
        }],
        status: 'online'
    });
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Start server only after Discord client is ready
client.login(process.env.DISCORD_TOKEN).then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Backend server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
    });
}).catch(error => {
    console.error('Failed to login to Discord:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    client.destroy();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.set('discordClient', client);
