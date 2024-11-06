// web-dashboard/server/utils/permissions.js

const { PermissionsBitField } = require('discord.js');

/**
 * Check if a member has a specific role
 * @param {GuildMember} member - Discord guild member
 * @param {string} roleId - Role ID to check
 * @returns {boolean} - True if member has the role
 */
function hasRole(member, roleId) {
    return member.roles.cache.has(roleId);
}

/**
 * Check if a member has any of the specified roles
 * @param {GuildMember} member - Discord guild member
 * @param {string[]} roleIds - Array of role IDs to check
 * @returns {boolean} - True if member has any of the roles
 */
function hasRoleById(member, roleIds) {
    if (!Array.isArray(roleIds)) {
        roleIds = [roleIds];
    }
    return roleIds.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Check if a member has all required permissions
 * @param {GuildMember} member - Discord guild member
 * @param {PermissionsBitField} permissions - Required permissions
 * @returns {boolean} - True if member has all permissions
 */
function hasPermissions(member, permissions) {
    return member.permissions.has(permissions);
}

/**
 * Check if a member is a game master
 * @param {GuildMember} member - Discord guild member
 * @param {string} gameMasterRoleId - Game master role ID
 * @returns {boolean} - True if member is a game master
 */
function isGameMaster(member, gameMasterRoleId) {
    return hasRole(member, gameMasterRoleId);
}

module.exports = {
    hasRole,
    hasRoleById,
    hasPermissions,
    isGameMaster
};