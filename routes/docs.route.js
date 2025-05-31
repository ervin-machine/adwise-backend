const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require("path");
const swaggerDefinition = require('../docs/swaggerDef');

const router = express.Router();

const specs = swaggerJsdoc({
    swaggerDefinition,
    apis: [path.join(__dirname, "../routes/*.js"), path.join(__dirname, "../docs/*.yml")]
});

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, { explorer: true, }));

module.exports = router;