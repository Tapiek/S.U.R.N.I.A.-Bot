// web-dashboard/server/controllers/auditController.js

const express = require('express');
const router = express.Router();
const auditLogger = require('../../../utils/database_audit');

router.get('/', async (req, res) => {
    try {
        const filters = {
            userId: req.query.userId,
            commandName: req.query.commandName,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const logs = await auditLogger.getAuditLogs(filters);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;