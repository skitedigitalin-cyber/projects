const express = require('express');
const router = express.Router();
const {
    getFixedTemplates,
    createFixedTemplate,
    updateFixedTemplate,
    deleteFixedTemplate
} = require('../controllers/fixedTemplateController');

router.get('/', getFixedTemplates);
router.post('/', createFixedTemplate);
router.put('/:id', updateFixedTemplate);
router.delete('/:id', deleteFixedTemplate);

module.exports = router;
