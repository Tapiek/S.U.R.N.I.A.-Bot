// commands/character.js

const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder 
} = require('discord.js');
const config = require('../config.json');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('character')
        .setDescription('Manage character profiles.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('Register a new character.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all registered characters.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a character.')
                .addStringOption(option =>
                    option.setName('identifier')
                        .setDescription('Character Name or ID')
                        .setRequired(true)
                )
        ),
    permissions: [config.roles.approvedCharacter],
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'register':
                await handleRegister(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'info':
                await handleInfo(interaction);
                break;
            default:
                await interaction.reply({ 
                    content: 'Unknown subcommand.', 
                    ephemeral: true 
                });
        }
    },
};

/**
 * Handles the /character register subcommand.
 * Opens a modal for the user to input character details.
 */
async function handleRegister(interaction) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId('characterRegisterModal')
        .setTitle('Register New Character');

    // Add components to the modal

    // Character Name
    const charNameInput = new TextInputBuilder()
        .setCustomId('characterName')
        .setLabel("Character Name")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter your character's name")
        .setRequired(true);

    // Character Age
    const charAgeInput = new TextInputBuilder()
        .setCustomId('characterAge')
        .setLabel("Character Age")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter your character's age")
        .setRequired(true);

    // Character Species
    const charSpeciesInput = new TextInputBuilder()
        .setCustomId('characterSpecies')
        .setLabel("Character Species")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter your character's species")
        .setRequired(true);

    // Character Position
    const charPositionInput = new TextInputBuilder()
        .setCustomId('characterPosition')
        .setLabel("Character Position")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter your character's position")
        .setRequired(true);

    // Character Summary
    const charSummaryInput = new TextInputBuilder()
        .setCustomId('characterSummary')
        .setLabel("Character Summary")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Provide a brief summary of your character")
        .setRequired(true);

    // Add inputs to action rows
    const firstRow = new ActionRowBuilder().addComponents(charNameInput);
    const secondRow = new ActionRowBuilder().addComponents(charAgeInput);
    const thirdRow = new ActionRowBuilder().addComponents(charSpeciesInput);
    const fourthRow = new ActionRowBuilder().addComponents(charPositionInput);
    const fifthRow = new ActionRowBuilder().addComponents(charSummaryInput);

    // Add all action rows to the modal
    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

    // Show the modal to the user
    await interaction.showModal(modal);
}

/**
 * Handles the /character list subcommand.
 * Lists all registered characters ordered by registration time.
 */
async function handleList(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const characters = await database.getAllCharacters();

        if (characters.length === 0) {
            return interaction.editReply({ content: 'No characters have been registered yet.' });
        }

        // Create a list of characters with their IDs and names
        let characterList = '';
        characters.forEach(char => {
            characterList += `**ID ${char.id}:** ${char.characterName}\n`;
        });

        // Create an embed to display the list
        const embed = new EmbedBuilder()
            .setTitle('Registered Characters')
            .setDescription(characterList)
            .setColor(0x00D26A)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error fetching characters:', error);
        await interaction.editReply({ 
            content: 'There was an error fetching the character list. Please try again later.', 
            ephemeral: true 
        });
    }
}

/**
 * Handles the /character info subcommand.
 * Displays detailed information about a specific character.
 */
async function handleInfo(interaction) {
    const identifier = interaction.options.getString('identifier');

    await interaction.deferReply({ ephemeral: false });

    try {
        // Determine if identifier is ID or Name
        const charId = parseInt(identifier);
        let character;
        if (!isNaN(charId)) {
            character = await database.getCharacterByIdentifier(charId);
        } else {
            character = await database.getCharacterByIdentifier(identifier);
        }

        if (!character) {
            return interaction.editReply({ 
                content: 'Character not found. Please ensure the name or ID is correct.', 
                ephemeral: true 
            });
        }

        // Create an embed with character details
        const embed = new EmbedBuilder()
            .setTitle(character.characterName)
            .setDescription(`__Age:__\n${character.characterAge}\n\n` +
                            `__Species:__\n ${character.characterSpecies}\n\n` +
                            `__Position:__\n ${character.characterPosition}\n\n` +
                            `__Summary:__\n${character.characterSummary}`)
            .setColor(0x000000)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error fetching character info:', error);
        await interaction.editReply({ 
            content: 'There was an error fetching the character information. Please try again later.', 
            ephemeral: true 
        });
    }
}
