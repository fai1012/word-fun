import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Word Fun Backend API',
            version: '1.0.0',
            description: 'API documentation for the Word Fun Game Backend',
        },
        servers: [
            {
                url: 'http://localhost:8080',
                description: 'Local server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/types.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
