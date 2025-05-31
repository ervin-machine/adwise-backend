const { version } = require("../package.json")
const { PORT } = require("../config/dotenv")

const swaggerDef = {
    openapi: '3.1.0',
    info: {
        title: 'Task Manager Application API documentation',
        version
    },
    servers: [
        {
            url: `http://localhost:${PORT}/api`
        },
    ],
    components: {},
    paths: {}
};

module.exports = swaggerDef;