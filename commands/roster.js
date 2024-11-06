// commands/roster.js

const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    PermissionsBitField, 
    EmbedBuilder 
} = require('discord.js');
const { createCanvas, registerFont } = require('canvas');
const path = require('path');
const rosterDB = require('../utils/database_roster');
const config = require('../config.json');

// Register fonts
const fontsDir = path.join(__dirname, '..', 'fonts');
try {
    registerFont(path.join(fontsDir, 'Arvo-Regular.ttf'), { 
        family: 'Arvo',
        weight: 'normal',
        style: 'normal'
    });
    registerFont(path.join(fontsDir, 'Orbitron-Bold.ttf'), { 
        family: 'Orbitron',
        weight: 'bold',
        style: 'normal'
    });
    console.log('Fonts successfully registered.');
} catch (error) {
    console.error('Error registering fonts:', error);
}

// Department configurations
const DEPARTMENTS = [
    { name: 'Command', color: '#b22222', textColor: '#FFFFFF', order: 0 },
    { name: 'Tactical', color: '#8b0000', textColor: '#FFFFFF', order: 1 },
    { name: 'Intelligence', color: '#222222', textColor: '#FFFFFF', order: 2 },
    { name: 'Diplomatic Corps', color: '#7f00ab', textColor: '#FFFFFF', order: 3 },
    { name: 'Science', color: '#1f75fe', textColor: '#FFFFFF', order: 4 },
    { name: 'Medical', color: '#3199ba', textColor: '#FFFFFF', order: 5 },
    { name: 'Research & Development', color: '#4682b4', textColor: '#FFFFFF', order: 6 },
    { name: 'Operations', color: '#ffd700', textColor: '#000000', order: 7 },
    { name: 'Engineering', color: '#daa520', textColor: '#000000', order: 8 },
    { name: 'Security', color: '#ffa500', textColor: '#000000', order: 9 }
];

const HIERARCHY = [
    'Commodore', 'Captain', 'Commander', 'Lieutenant Commander',
    'Lieutenant', 'Lieutenant Junior Grade', 'Ensign', 'Enlisted'
];

// Abbreviated ranks mapping
const RANK_ABBREVIATIONS = {
    'Lieutenant Junior Grade': 'Lt. JG.',
    'Lieutenant Commander': 'Lt. Cmdr.'
};

// Divisions and their corresponding departments
const DIVISIONS = {
    'Command': ['Command', 'Tactical', 'Intelligence', 'Diplomatic Corps'],
    'Science': ['Science', 'Medical', 'Research & Development'],
    'Operations': ['Operations', 'Engineering', 'Security']
};

// Canvas settings
const CANVAS_SETTINGS = {
    MAX_HEIGHT: 10000,
    PADDING: 40,
    BOTTOM_PADDING: 100, // Added extra bottom padding
    ROW_HEIGHT: 35,
    HEADER_HEIGHT: 60,
    DEPT_HEADER_HEIGHT: 45,
    HEADERS: ['Name', 'Player', 'Rank', 'Position', 'Age', 'Species'],
    COLUMN_WIDTHS: [200, 160, 170, 220, 80, 180],
    FONTS: {
        TITLE: 'bold 36px "Orbitron"',
        DEPARTMENT: 'bold 28px "Orbitron"',
        HEADER: 'bold 16px "Arvo"',
        ROW: '16px "Arvo"'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster')
        .setDescription('Roster management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a character to the roster')
                .addStringOption(option => 
                    option.setName('name')
                          .setDescription('Character Name')
                          .setRequired(true))
                .addUserOption(option => 
                    option.setName('player')
                          .setDescription('Player Discord Username')
                          .setRequired(true))
                .addStringOption(option =>
                    option.setName('department')
                          .setDescription('Character Department')
                          .setRequired(true)
                          .addChoices(...DEPARTMENTS.map(dept => 
                              ({ name: dept.name, value: dept.name }))))
                .addStringOption(option =>
                    option.setName('rank')
                          .setDescription('Character Rank')
                          .setRequired(true)
                          .addChoices(...HIERARCHY.map(rank => 
                              ({ name: rank, value: rank }))))
                .addStringOption(option => 
                    option.setName('position')
                          .setDescription('Character Position (Free Text)')
                          .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('age')
                          .setDescription('Character Age')
                          .setRequired(true))
                .addStringOption(option => 
                    option.setName('species')
                          .setDescription('Character Species')
                          .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the roster')
                .addStringOption(option =>
                    option.setName('division')
                          .setDescription('Division to view')
                          .setRequired(false)
                          .addChoices(
                              { name: 'Command', value: 'Command' },
                              { name: 'Science', value: 'Science' },
                              { name: 'Operations', value: 'Operations' }
                          )
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await handleAddCommand(interaction);
        } else if (subcommand === 'view') {
            await handleViewCommand(interaction);
        }
    }
};

async function handleAddCommand(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.has(config.roles.gameMaster)) {
        return interaction.reply({
            content: 'You do not have permission to use this command.',
            ephemeral: true
        });
    }

    const name = interaction.options.getString('name');
    const player = interaction.options.getUser('player');
    const department = interaction.options.getString('department');
    const rank = interaction.options.getString('rank');
    const position = interaction.options.getString('position');
    const age = interaction.options.getInteger('age');
    const species = interaction.options.getString('species');

    try {
        const rosterId = await rosterDB.addRosterEntry(
            name,
            department,
            player.id,
            rank,
            position,
            age.toString(),
            species
        );

        const member = await interaction.guild.members.fetch(player.id);
        const departmentRoleId = getDepartmentRoleId(department);
        const rankRoleId = getRankRoleId(rank);
        const division = getDivisionByDepartment(department);
        const divisionRoleId = getDivisionRoleId(division);

        const rolesToAssign = [];
        if (departmentRoleId) rolesToAssign.push(departmentRoleId);
        if (rankRoleId) rolesToAssign.push(rankRoleId);
        if (divisionRoleId) rolesToAssign.push(divisionRoleId);

        if (rolesToAssign.length > 0) {
            await member.roles.add(rolesToAssign);
        }

        const embed = new EmbedBuilder()
            .setTitle('Character Added')
            .setColor(0x00D26A)
            .addFields(
                { name: 'Name', value: name, inline: true },
                { name: 'Player', value: `<@${player.id}>`, inline: true },
                { name: 'Department', value: department, inline: true },
                { name: 'Division', value: division, inline: true },
                { name: 'Rank', value: rank, inline: true },
                { name: 'Position', value: position, inline: true },
                { name: 'Age', value: age.toString(), inline: true },
                { name: 'Species', value: species, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        if (config.channels.rosterLogChannel) {
            const logChannel = interaction.guild.channels.cache.get(config.channels.rosterLogChannel);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('Error adding roster entry:', error);
        await interaction.reply({
            content: 'Failed to add character to roster. Please try again.',
            ephemeral: true
        });
    }
}

async function handleViewCommand(interaction) {
    await interaction.deferReply();

    const selectedDivision = interaction.options.getString('division');

    try {
        let characters = await rosterDB.getRosterEntries();

        if (!characters.length) {
            return interaction.editReply('No characters found in the roster.');
        }

        if (selectedDivision) {
            characters = characters.filter(char => {
                const division = getDivisionByDepartment(char.department);
                return division && division.toLowerCase() === selectedDivision.toLowerCase();
            });

            if (!characters.length) {
                return interaction.editReply(`No characters found in the ${selectedDivision} division.`);
            }
        }

        const pages = preparePages(characters);

        for (let i = 0; i < pages.length; i++) {
            const { canvas, content } = await renderPage(interaction, pages[i], i + 1, pages.length, selectedDivision);
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: `roster_page_${i + 1}.png` });

            if (i === 0) {
                await interaction.editReply({ files: [attachment], content });
            } else {
                await interaction.followUp({ files: [attachment], content });
            }
        }

    } catch (error) {
        console.error('Error generating roster:', error);
        await interaction.editReply('Failed to generate roster. Please try again.');
    }
}

function getDepartmentRoleId(department) {
    const key = department.replace(/ & /g, 'And').replace(/ /g, '').toLowerCase();
    return config.departments[key] || null;
}

function getRankRoleId(rank) {
    const key = rank.replace(/ /g, '').toLowerCase();
    return config.ranks[key] || null;
}

function getDivisionRoleId(division) {
    if (!division) return null;
    const key = division.toLowerCase();
    return config.divisions[key] || null;
}

function getDivisionByDepartment(department) {
    for (const [division, departments] of Object.entries(DIVISIONS)) {
        if (departments.includes(department)) {
            return division;
        }
    }
    return null;
}

function preparePages(characters) {
    const pages = [];
    let currentPage = [];
    let currentPageHeight = CANVAS_SETTINGS.HEADER_HEIGHT + CANVAS_SETTINGS.PADDING * 2;

    const departments = groupCharactersByDepartment(characters);

    const sortedDepartments = Object.keys(departments).sort((a, b) => {
        const orderA = DEPARTMENTS.find(d => d.name === a)?.order ?? 999;
        const orderB = DEPARTMENTS.find(d => d.name === b)?.order ?? 999;
        return orderA - orderB;
    });

    sortedDepartments.forEach(dept => {
        const chars = departments[dept];
        const deptHeight = calculateDepartmentHeight(chars.length);

        if (currentPageHeight + deptHeight > CANVAS_SETTINGS.MAX_HEIGHT) {
            pages.push(currentPage);
            currentPage = [];
            currentPageHeight = CANVAS_SETTINGS.HEADER_HEIGHT + CANVAS_SETTINGS.PADDING * 2;
        }

        currentPage.push({ department: dept, characters: chars });
        currentPageHeight += deptHeight;
    });

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages;
}

function groupCharactersByDepartment(characters) {
    const departments = {};
    characters.forEach(char => {
        if (!departments[char.department]) {
            departments[char.department] = [];
        }
        departments[char.department].push(char);
    });
    return departments;
}

function calculateDepartmentHeight(numCharacters) {
    return CANVAS_SETTINGS.DEPT_HEADER_HEIGHT +
        CANVAS_SETTINGS.ROW_HEIGHT +
        numCharacters * (CANVAS_SETTINGS.ROW_HEIGHT + 5) +
        20;
}

async function renderPage(interaction, pageData, currentPage, totalPages, selectedDivision = null) {
    const width = CANVAS_SETTINGS.COLUMN_WIDTHS.reduce((a, b) => a + b, 0) + CANVAS_SETTINGS.PADDING * 3;
    const height = calculatePageHeight(pageData);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.textBaseline = 'middle';
    ctx.antialias = 'subpixel';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.font = CANVAS_SETTINGS.FONTS.TITLE;
    ctx.fillStyle = '#2C3E50';
    ctx.textAlign = 'center';
    ctx.fillText('Character Roster', width / 2, CANVAS_SETTINGS.PADDING + 30);

    let yOffset = CANVAS_SETTINGS.PADDING + CANVAS_SETTINGS.HEADER_HEIGHT;

    for (const section of pageData) {
        const dept = section.department;
        const chars = section.characters;
        const deptInfo = DEPARTMENTS.find(d => d.name === dept);

        const gradient = ctx.createLinearGradient(
            CANVAS_SETTINGS.PADDING, 
            yOffset, 
            width - CANVAS_SETTINGS.PADDING, 
            yOffset + CANVAS_SETTINGS.DEPT_HEADER_HEIGHT
        );
        gradient.addColorStop(0, deptInfo.color);
        gradient.addColorStop(1, adjustColor(deptInfo.color, -20));
        
        ctx.fillStyle = gradient;
        roundRect(
            ctx,
            CANVAS_SETTINGS.PADDING,
            yOffset,
            width - CANVAS_SETTINGS.PADDING * 2,
            CANVAS_SETTINGS.DEPT_HEADER_HEIGHT,
            10
        );
        ctx.fill();

        ctx.fillStyle = deptInfo.textColor;
        ctx.font = CANVAS_SETTINGS.FONTS.DEPARTMENT;
        ctx.textAlign = 'center';
        ctx.fillText(
            dept,
            width / 2,
            yOffset + CANVAS_SETTINGS.DEPT_HEADER_HEIGHT / 2
        );

        yOffset += CANVAS_SETTINGS.DEPT_HEADER_HEIGHT + 10;

        ctx.textAlign = 'left';

        createTableRow(
            ctx,
            CANVAS_SETTINGS.PADDING,
            yOffset,
            width - CANVAS_SETTINGS.PADDING * 2,
            CANVAS_SETTINGS.ROW_HEIGHT,
            true
        );

        let xOffset = CANVAS_SETTINGS.PADDING + 20;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = CANVAS_SETTINGS.FONTS.HEADER;
        ctx.textAlign = 'left';

        CANVAS_SETTINGS.HEADERS.forEach((header, i) => {
            ctx.fillText(header, xOffset, yOffset + CANVAS_SETTINGS.ROW_HEIGHT / 2);
            xOffset += CANVAS_SETTINGS.COLUMN_WIDTHS[i];
        });

        yOffset += CANVAS_SETTINGS.ROW_HEIGHT + 5;

        chars.sort((a, b) => {
            const rankOrder = HIERARCHY.indexOf(a.rank) - HIERARCHY.indexOf(b.rank);
            return rankOrder !== 0 ? rankOrder : a.characterName.localeCompare(b.characterName);
        });

        for (const char of chars) {
            createTableRow(
                ctx,
                CANVAS_SETTINGS.PADDING,
                yOffset,
                width - CANVAS_SETTINGS.PADDING * 2,
                CANVAS_SETTINGS.ROW_HEIGHT
            );

            xOffset = CANVAS_SETTINGS.PADDING + 20;
            ctx.fillStyle = '#2C3E50';
            ctx.font = CANVAS_SETTINGS.FONTS.ROW;

            let playerName = 'Unknown User';
            try {
                let member = interaction.guild.members.cache.get(char.userId);
                if (!member) {
                    member = await interaction.guild.members.fetch(char.userId);
                }
                if (member) {
                    playerName = member.user.username;
                }
            } catch (err) {
                console.warn(`Member with ID ${char.userId} not found.`);
            }

            const rankDisplay = RANK_ABBREVIATIONS[char.rank] || char.rank;

            const rowData = [
                char.characterName,
                playerName,
                rankDisplay,
                char.position,
                char.age,
                char.species
            ];

            rowData.forEach((text, i) => {
                const maxWidth = CANVAS_SETTINGS.COLUMN_WIDTHS[i] - (i === 5 ? 20 : 40);
                let displayText = text;
                if (ctx.measureText(text).width > maxWidth) {
                    displayText = truncateText(ctx, text, maxWidth);
                }
                
                ctx.fillText(displayText, xOffset, yOffset + CANVAS_SETTINGS.ROW_HEIGHT / 2);
                xOffset += CANVAS_SETTINGS.COLUMN_WIDTHS[i];
            });

            yOffset += CANVAS_SETTINGS.ROW_HEIGHT + 5;
        }

        yOffset += 20;
    }

    const content = selectedDivision
        ? `Current Character Roster - ${selectedDivision} Division (Page ${currentPage}/${totalPages})`
        : `Current Character Roster (Page ${currentPage}/${totalPages})`;

    return { canvas, content };
}

function calculatePageHeight(pageData) {
    let height = CANVAS_SETTINGS.PADDING * 2 +
                 CANVAS_SETTINGS.HEADER_HEIGHT +
                 CANVAS_SETTINGS.BOTTOM_PADDING; // Added bottom padding

    pageData.forEach(section => {
        const numChars = section.characters.length;
        height += CANVAS_SETTINGS.DEPT_HEADER_HEIGHT +
                  CANVAS_SETTINGS.ROW_HEIGHT +
                  numChars * (CANVAS_SETTINGS.ROW_HEIGHT + 5) +
                  20;
    });

    return Math.min(height, CANVAS_SETTINGS.MAX_HEIGHT);
}

function createTableRow(ctx, x, y, width, height, isHeader = false) {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    if (isHeader) {
        gradient.addColorStop(0, '#2C3E50');
        gradient.addColorStop(1, '#34495E');
        ctx.fillStyle = gradient;
    } else {
        gradient.addColorStop(0, '#F8F9FA');
        gradient.addColorStop(1, '#F1F3F5');
        ctx.fillStyle = gradient;
    }
    
    roundRect(ctx, x, y, width, height, 5);
    ctx.fill();
    
    ctx.strokeStyle = isHeader ? '#2C3E50' : '#E9ECEF';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function truncateText(ctx, text, maxWidth) {
    let truncated = text;
    const ellipsis = '...';
    
    while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
    }
    
    return truncated.length < text.length ? truncated + ellipsis : text;
}

function adjustColor(hex, percent) {
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(hex)) {
        console.error(`Invalid hex color: ${hex}`);
        return hex;
    }
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}