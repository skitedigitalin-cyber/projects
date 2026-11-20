const mongoose = require('mongoose');

const sourceConfigSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    sourceName: {
        type: String,
        required: true
    },
    proposalMessage: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('SourceConfig', sourceConfigSchema);
