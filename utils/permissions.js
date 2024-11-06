// utils/permissions.js

/**
 * Checks if a member has at least one of the required roles by ID.
 * @param {GuildMember} member - The guild member to check.
 * @param {Array<string>} requiredRoleIDs - Array of role IDs required.
 * @returns {boolean} - True if the member has one of the roles, else false.
 */
function hasRoleById(member, requiredRoleIDs) {
    return requiredRoleIDs.some(roleId => member.roles.cache.has(roleId));
}

module.exports = { hasRoleById };
