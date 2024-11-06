const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config.json');
const rosterDB = require('../utils/database_roster');

// Initialize database
const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'logs.db'));

// Create logs table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        characterName TEXT NOT NULL,
        logType TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        stardate TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        isPrivate BOOLEAN DEFAULT 0,
        departmentId TEXT
    )`);
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log')
        .setDescription('Ship\'s Log Management System')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new log entry')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of log entry')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Personal Log', value: 'personal' },
                            { name: 'Captain\'s Log', value: 'captain' },
                            { name: 'Mission Log', value: 'mission' },
                            { name: 'Department Log', value: 'department' },
                            { name: 'Medical Log', value: 'medical' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View log entries')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of logs to view')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Personal Logs', value: 'personal' },
                            { name: 'Captain\'s Logs', value: 'captain' },
                            { name: 'Mission Logs', value: 'mission' },
                            { name: 'Department Logs', value: 'department' },
                            { name: 'Medical Logs', value: 'medical' }
                        ))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('View logs from a specific user (optional)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search log entries')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Search term')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Filter logs by user (optional)')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreateLog(interaction);
                break;
            case 'view':
                await handleViewLogs(interaction);
                break;
            case 'search':
                await handleSearchLogs(interaction);
                break;
        }
    },

    async handleLogModal(interaction) {
        try {
            const logType = interaction.customId.split('_')[1];
            const title = interaction.fields.getTextInputValue('title');
            const content = interaction.fields.getTextInputValue('content');
            const isPrivate = interaction.fields.getTextInputValue('privacy') === 'true';
            
            const now = DateTime.now();
            const stardate = `${now.year - 2323}.${now.month}${now.day.toString().padStart(2, '0')}`;

            const characterName = await getCharacterName(interaction.user.id);
            
            const sql = `INSERT INTO logs (userId, characterName, logType, title, content, stardate, isPrivate)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            db.run(sql, [
                interaction.user.id,
                characterName,
                logType,
                title,
                content,
                stardate,
                isPrivate ? 1 : 0
            ], async function(err) {
                if (err) {
                    console.error('Error creating log:', err);
                    await interaction.reply({
                        content: 'There was an error creating your log entry.',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${capitalizeFirstLetter(logType)} Log: ${title}`)
                    .setDescription(content)
                    .addFields(
                        { name: 'Stardate', value: stardate, inline: true },
                        { name: 'Author', value: characterName, inline: true }
                    )
                    .setColor(getLogTypeColor(logType))
                    .setTimestamp();

                if (!isPrivate) {
                    const logChannelId = getLogChannelId(logType);
                    if (logChannelId) {
                        const channel = interaction.guild.channels.cache.get(logChannelId);
                        if (channel) {
                            await channel.send({ embeds: [embed] });
                        }
                    }
                }

                await interaction.reply({
                    content: 'Log entry created successfully!',
                    ephemeral: true
                });
            });

        } catch (error) {
            console.error('Error handling log modal:', error);
            await interaction.reply({
                content: 'There was an error processing your log entry.',
                ephemeral: true
            });
        }
    }
};

async function handleCreateLog(interaction) {
    const logType = interaction.options.getString('type');
    
    if (!await hasPermissionForLogType(interaction.member, logType)) {
        return interaction.reply({
            content: `You don't have permission to create ${logType} logs.`,
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`log_${logType}`)
        .setTitle(`Create ${capitalizeFirstLetter(logType)} Log`);

    const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Log Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const contentInput = new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Log Content')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(4000);

    const privacyInput = new TextInputBuilder()
        .setCustomId('privacy')
        .setLabel('Private Log? (true/false)')
        .setStyle(TextInputStyle.Short)
        .setValue('false')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(contentInput),
        new ActionRowBuilder().addComponents(privacyInput)
    );

    await interaction.showModal(modal);
}

async function handleViewLogs(interaction) {
    const logType = interaction.options.getString('type');
    const targetUser = interaction.options.getUser('user');
    const page = interaction.options.getInteger('page') || 1;
    const logsPerPage = 5;

    try {
        let countSql, params;

        if (targetUser) {
            countSql = `SELECT COUNT(*) as count FROM logs 
                       WHERE logType = ? AND userId = ? AND
                       (isPrivate = 0 OR (isPrivate = 1 AND userId = ?))`;
            params = [logType, targetUser.id, interaction.user.id];
        } else {
            countSql = `SELECT COUNT(*) as count FROM logs 
                       WHERE logType = ? AND
                       (isPrivate = 0 OR (isPrivate = 1 AND userId = ?))`;
            params = [logType, interaction.user.id];
        }
        
        db.get(countSql, params, async (err, row) => {
            if (err) throw err;

            const totalLogs = row.count;
            const totalPages = Math.ceil(totalLogs / logsPerPage);

            if (page > totalPages) {
                return interaction.reply({
                    content: `Invalid page number. There are only ${totalPages} pages of logs.`,
                    ephemeral: true
                });
            }

            const offset = (page - 1) * logsPerPage;
            let sql, queryParams;

            if (targetUser) {
                sql = `SELECT * FROM logs 
                      WHERE logType = ? AND userId = ? AND
                      (isPrivate = 0 OR (isPrivate = 1 AND userId = ?))
                      ORDER BY timestamp DESC 
                      LIMIT ? OFFSET ?`;
                queryParams = [logType, targetUser.id, interaction.user.id, logsPerPage, offset];
            } else {
                sql = `SELECT * FROM logs 
                      WHERE logType = ? AND
                      (isPrivate = 0 OR (isPrivate = 1 AND userId = ?))
                      ORDER BY timestamp DESC 
                      LIMIT ? OFFSET ?`;
                queryParams = [logType, interaction.user.id, logsPerPage, offset];
            }

            db.all(sql, queryParams, async (err, logs) => {
                if (err) throw err;

                const embed = new EmbedBuilder()
                    .setTitle(`${capitalizeFirstLetter(logType)} Logs${targetUser ? ` - ${targetUser.username}` : ''}`)
                    .setColor(getLogTypeColor(logType))
                    .setFooter({ text: `Page ${page}/${totalPages}` });

                logs.forEach(log => {
                    embed.addFields({
                        name: `${log.title} (Stardate ${log.stardate})${log.isPrivate ? ' 🔒' : ''}`,
                        value: truncateText(log.content, 100)
                    });
                });

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            });
        });
    } catch (error) {
        console.error('Error viewing logs:', error);
        await interaction.reply({
            content: 'There was an error retrieving the logs.',
            ephemeral: true
        });
    }
}

async function handleSearchLogs(interaction) {
    const query = interaction.options.getString('query');
    const targetUser = interaction.options.getUser('user');

    try {
        let sql, params;
        const searchPattern = `%${query}%`;

        if (targetUser) {
            sql = `SELECT l.*, r.characterName as authorName 
                   FROM logs l
                   LEFT JOIN roster r ON l.userId = r.userId
                   WHERE (l.title LIKE ? OR l.content LIKE ?) 
                   AND l.userId = ?
                   AND (l.isPrivate = 0 OR (l.isPrivate = 1 AND l.userId = ?))
                   ORDER BY l.timestamp DESC 
                   LIMIT 5`;
            params = [searchPattern, searchPattern, targetUser.id, interaction.user.id];
        } else {
            sql = `SELECT l.*, r.characterName as authorName 
                   FROM logs l
                   LEFT JOIN roster r ON l.userId = r.userId
                   WHERE (l.title LIKE ? OR l.content LIKE ?) 
                   AND (l.isPrivate = 0 OR (l.isPrivate = 1 AND l.userId = ?))
                   ORDER BY l.timestamp DESC 
                   LIMIT 5`;
            params = [searchPattern, searchPattern, interaction.user.id];
        }
        
        db.all(sql, params, async (err, logs) => {
            if (err) throw err;

            if (logs.length === 0) {
                return interaction.reply({
                    content: 'No logs found matching your search criteria.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Search Results for "${query}"${targetUser ? ` - ${targetUser.username}` : ''}`)
                .setColor('#00FFFF')
                .setDescription(`Found ${logs.length} matching logs:`);

            logs.forEach(log => {
                embed.addFields({
                    name: `${capitalizeFirstLetter(log.logType)} Log: ${log.title}${log.isPrivate ? ' 🔒' : ''}`,
                    value: `By: ${log.authorName}\nStardate: ${log.stardate}\n${truncateText(log.content, 100)}`
                });
            });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        });
    } catch (error) {
        console.error('Error searching logs:', error);
        await interaction.reply({
            content: 'There was an error searching the logs.',
            ephemeral: true
        });
    }
}

async function getCharacterName(userId) {
    try {
        const entries = await rosterDB.getRosterEntries();
        const userEntry = entries.find(entry => entry.userId === userId);
        return userEntry ? userEntry.characterName : 'Unknown Character';
    } catch (error) {
        console.error('Error getting character name:', error);
        return 'Unknown Character';
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

function getLogTypeColor(logType) {
    const colors = {
        personal: '#4287f5',   // Blue
        captain: '#f54242',    // Red
        mission: '#42f554',    // Green
        department: '#f5a742', // Orange
        medical: '#42f5f5'     // Cyan
    };
    return colors[logType] || '#ffffff';
}

async function hasPermissionForLogType(member, logType) {
    switch (logType) {
        case 'captain':
            return member.roles.cache.has(config.roles.seniorStaff);
        case 'medical':
            return member.roles.cache.has(config.departments.medical);
        case 'department':
            return member.roles.cache.some(role => 
                Object.values(config.departments).includes(role.id));
        default:
            return true;
    }
}

function getLogChannelId(logType) {
    // Add these to your config.json
    const channels = {
        captain: config.channels.captainsLogChannel,
        mission: config.channels.missionLogChannel,
        department: config.channels.departmentLogChannel,
        medical: config.channels.medicalLogChannel
    };
    return channels[logType];
}