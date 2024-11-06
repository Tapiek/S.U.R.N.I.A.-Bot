// index.js

const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionsBitField, 
    ActionRowBuilder, 
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { hasRoleById } = require('./utils/permissions');
const auditLogger = require('./utils/database_audit');
const config = require('./config.json');
const database = require('./utils/database');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

// Initialize Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
});

// Command collection setup
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load commands
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Client ready event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
        activities: [{
            name: 'https://discord.gg/jTdqcs74bP | U.S.S. Surnia - NX-2526',
            type: 'PLAYING'
        }],
        status: 'dnd'
    });
    console.log('Bot status set successfully.');
});

// Main interaction handler
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            await handleCommandInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        } else if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        await handleInteractionError(interaction, error);
    }
});

// Command interaction handler
async function handleCommandInteraction(interaction) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Permission check
    if (command.permissions) {
        const requiredRoleIDs = command.permissions;
        if (!interaction.guild) {
            await auditLogger.logCommand(interaction, 'error', 'Command used outside server');
            return interaction.reply({
                content: 'This command can only be used within a server.',
                ephemeral: true
            });
        }
        
        if (!hasRoleById(interaction.member, requiredRoleIDs)) {
            await auditLogger.logCommand(interaction, 'denied', 'Insufficient permissions');
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }
    }

    try {
        await command.execute(interaction);
        await auditLogger.logCommand(interaction, 'success');
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        await auditLogger.logCommand(interaction, 'error', error.message);
        await handleInteractionError(interaction, error);
    }
}

// Modal submit handler
async function handleModalSubmit(interaction) {
    try {
        if (interaction.customId === 'padd_modal') {
            await handlePaddModalSubmit(interaction);
        } else if (interaction.customId === 'characterRegisterModal') {
            await handleCharacterRegisterModal(interaction);
        } else if (interaction.customId.includes('_ticket')) {
            const ticketCommand = require('./commands/tickets');
            await ticketCommand.handleModalSubmit(interaction);
        } else if (interaction.customId.startsWith('log_')) {
            const logCommand = require('./commands/logs');
            await logCommand.handleLogModal(interaction);
        } else if (interaction.customId.startsWith('rank_select_')) {
            await handleRankSelection(interaction);
        } else if (interaction.customId.startsWith('reject_reason_')) {
            await handleCharacterRejection(interaction);
        }

        await auditLogger.logCommand(interaction, 'success', null, 'modal_submit');
    } catch (error) {
        console.error('Error handling modal submit:', error);
        await auditLogger.logCommand(interaction, 'error', error.message, 'modal_submit');
        await handleInteractionError(interaction, error);
    }
}

// Button interaction handler
async function handleButtonInteraction(interaction) {
    const [action, characterId] = interaction.customId.split('_');

    try {
        switch (action) {
            case 'approve':
                await handleApproveButton(interaction, characterId);
                break;
            case 'revise':
                await handleReviseButton(interaction, characterId);
                break;
            case 'reject':
                await handleRejectButton(interaction, characterId);
                break;
            case 'close':
                const ticketCommand = require('./commands/tickets');
                await ticketCommand.handleCloseButton(interaction);
                break;
            case 'roleplay':
            case 'server':
                const ticketHandler = require('./commands/tickets');
                await ticketHandler.handleButtonInteraction(interaction);
                break;
            case 'rescan':
            case 'analyze':
                const sensorCommand = client.commands.get('sensor');
                if (sensorCommand?.handleButton) {
                    await sensorCommand.handleButton(interaction);
                }
                break;
        }

        await auditLogger.logCommand(interaction, 'success', null, 'button_click');
    } catch (error) {
        console.error('Error handling button interaction:', error);
        await auditLogger.logCommand(interaction, 'error', error.message, 'button_click');
        await handleInteractionError(interaction, error);
    }
}

// Character approval handling
async function handleApproveButton(interaction, characterId) {
    if (!interaction.member.roles.cache.has(config.roles.gameMaster)) {
        return interaction.reply({
            content: 'You do not have permission to approve characters.',
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`rank_select_${characterId}`)
        .setTitle('Select Character Rank');

    const rankInput = new TextInputBuilder()
        .setCustomId('rank')
        .setLabel('Choose Rank')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Lieutenant, Ensign')
        .setRequired(true);

    const positionInput = new TextInputBuilder()
        .setCustomId('position')
        .setLabel('Position (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Department Head, Acting')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(rankInput),
        new ActionRowBuilder().addComponents(positionInput)
    );

    await interaction.showModal(modal);
}

// Character revision handling
async function handleReviseButton(interaction, characterId) {
    try {
        const character = await database.getCharacterById(characterId);
        const revisionChannel = await interaction.guild.channels.fetch('1261972651971444788');
        
        const thread = await revisionChannel.threads.create({
            name: `Revision - ${character.characterName}`,
            type: 'GUILD_PRIVATE_THREAD'
        });

        await thread.members.add(character.userId);
        
        await thread.send({
            content: `Character revision discussion for ${character.characterName}\n` +
                     `<@${character.userId}>, please work with the staff to revise your character.`
        });

        // Update original message
        const reviseEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#FFA500')
            .addFields({ name: 'Status', value: 'Under Revision' });

        await interaction.message.edit({
            embeds: [reviseEmbed],
            components: []
        });

        await interaction.reply({
            content: `Revision thread created: ${thread}`,
            ephemeral: true
        });
    } catch (error) {
        throw new Error(`Error creating revision thread: ${error.message}`);
    }
}

// Character rejection handling
async function handleRejectButton(interaction, characterId) {
    const modal = new ModalBuilder()
        .setCustomId(`reject_reason_${characterId}`)
        .setTitle('Reject Character');

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason for rejection')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    
    await interaction.showModal(modal);
}

// PADD message handling
async function handlePaddModalSubmit(interaction) {
    try {
        const to = interaction.fields.getTextInputValue('to');
        const cc = interaction.fields.getTextInputValue('cc') || 'None';
        const from = interaction.fields.getTextInputValue('from');
        const body = interaction.fields.getTextInputValue('body');
        const imageUrl = interaction.fields.getTextInputValue('image_url') || null;

        const embed = new EmbedBuilder()
            .setTitle('—— PADD MESSAGING ——')
            .setDescription(
                `**To:** __${to}__\n` +
                `> *cc: ${cc}*\n\n` +
                `**From:** __${from}__\n\n` +
                `${body}`
            )
            .setColor(0x00ADEF)
            .setTimestamp();

        if (imageUrl) embed.setImage(imageUrl);

        const channel = interaction.guild.channels.cache.get('1257259932328132630');
        if (channel) {
            await channel.send({ embeds: [embed] });
            await interaction.reply({
                content: 'PADD message sent successfully!',
                ephemeral: true
            });
        } else {
            throw new Error('PADD channel not found');
        }
    } catch (error) {
        throw new Error(`Error processing PADD message: ${error.message}`);
    }
}

// Character registration handling
async function handleCharacterRegisterModal(interaction) {
    try {
        const characterData = {
            name: interaction.fields.getTextInputValue('characterName'),
            age: interaction.fields.getTextInputValue('characterAge'),
            species: interaction.fields.getTextInputValue('characterSpecies'),
            position: interaction.fields.getTextInputValue('characterPosition'),
            summary: interaction.fields.getTextInputValue('characterSummary')
        };

        const newCharId = await database.addCharacter(
            interaction.user.id,
            characterData.name,
            characterData.age,
            characterData.species,
            characterData.position,
            characterData.summary
        );

        const embed = new EmbedBuilder()
            .setTitle('Character Registered Successfully')
            .addFields(
                { name: 'ID', value: `${newCharId}`, inline: false },
                { name: 'Name', value: characterData.name, inline: false },
                { name: 'Age', value: characterData.age, inline: false },
                { name: 'Species', value: characterData.species, inline: false },
                { name: 'Position', value: characterData.position, inline: false },
                { name: 'Summary', value: characterData.summary, inline: false }
            )
            .setColor(0x00D26A)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        throw new Error(`Error registering character: ${error.message}`);
    }
}

// Rank selection handling
async function handleRankSelection(interaction) {
    try {
        const [, , characterId] = interaction.customId.split('_');
        const rank = interaction.fields.getTextInputValue('rank');
        const position = interaction.fields.getTextInputValue('position');
        
        const character = await database.getCharacterById(characterId);
        const member = await interaction.guild.members.fetch(character.userId);

        // Assign roles
        const departmentRole = config.departments[character.department?.toLowerCase()?.replace(/\s+/g, '')];
        const rankRole = config.ranks[rank.toLowerCase().replace(/\s+/g, '')];
        const divisionRole = getDivisionRole(character.department);
        const positionRole = position ? config.positions[position.toLowerCase().replace(/\s+/g, '')] : null;

        const rolesToAdd = [departmentRole, rankRole, divisionRole].filter(Boolean);
        if (positionRole) rolesToAdd.push(positionRole);

        await member.roles.add(rolesToAdd);

        // Update message
        const approveEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#00FF00')
            .addFields(
                { name: 'Status', value: 'Approved', inline: true },
                { name: 'Rank', value: rank, inline: true }
            );

        if (position) {
            approveEmbed.addFields({ name: 'Position', value: position, inline: true });
        }

        await interaction.message.edit({
            embeds: [approveEmbed],
            components: []
        });

        await interaction.reply({
            content: `Approved character with rank ${rank}${position ? ` and position ${position}` : ''}`,
            ephemeral: true
        });
    } catch (error) {
        throw new Error(`Error processing rank selection: ${error.message}`);
    }
}

// Character rejection handling
async function handleCharacterRejection(interaction) {
    try {
        const [, , characterId] = interaction.customId.split('_');
        const reason = interaction.fields.getTextInputValue('reason');
        
        const character = await database.getCharacterById(characterId);
        const user = await client.users.fetch(character.userId);

        // Send DM to user
        const dmEmbed = new EmbedBuilder()
            .setTitle('Character Submission Rejected')
            .setDescription(`Your character "${character.characterName}" has been rejected.`)
            .addFields({ name: 'Reason', value: reason })
            .setColor('#FF0000')
            .setTimestamp();

        await user.send({ embeds: [dmEmbed] });

        // Update original message
        const rejectEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#FF0000')
            .addFields(
                { name: 'Status', value: 'Rejected', inline: true },
                { name: 'Reason', value: reason }
            );

        await interaction.message.edit({
            embeds: [rejectEmbed],
            components: []
        });

        await interaction.reply({
            content: 'Character rejected and user notified.',
            ephemeral: true
        });
    } catch (error) {
        throw new Error(`Error processing character rejection: ${error.message}`);
    }
}

// Generic error handler for interactions
async function handleInteractionError(interaction, error) {
    console.error('Interaction error:', error);
    
    const errorMessage = 'There was an error processing your request. Please try again later.';
    
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: errorMessage,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: errorMessage,
                ephemeral: true
            });
        }
    } catch (followUpError) {
        console.error('Error sending error message:', followUpError);
    }
}

// Utility function to get division role based on department
function getDivisionRole(department) {
    const divisions = {
        'Command': ['Command', 'Tactical', 'Intelligence', 'Diplomatic Corps'],
        'Science': ['Science', 'Medical', 'Research & Development'],
        'Operations': ['Operations', 'Engineering', 'Security']
    };

    for (const [division, departments] of Object.entries(divisions)) {
        if (departments.includes(department)) {
            return config.divisions[division.toLowerCase()];
        }
    }
    return null;
}

// PADD channel message handler
client.on('messageCreate', async (message) => {
    const paddChannelId = '1257259932328132630';
    if (message.channel.id === paddChannelId && !message.author.bot) {
        if (!message.content.startsWith('/padd')) {
            try {
                await message.delete();
                await message.author.send('Execute /padd to engage in PADD conversations.');
            } catch (error) {
                console.error('Error handling PADD channel message:', error);
            }
        }
    }
});

// Error handlers
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // Optionally restart the bot or perform cleanup
    process.exit(1);
});

// Cleanup on shutdown
function cleanup() {
    console.log('Performing cleanup before shutdown...');
    client.destroy();
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the bot
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Bot successfully logged in');
    })
    .catch(error => {
        console.error('Error logging in:', error);
        process.exit(1);
    });

module.exports = {
    client,
    cleanup
};