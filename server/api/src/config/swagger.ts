import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './environment';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartBasket API',
      version: '1.0.0',
      description: 'API documentation for SmartBasket shopping list application',
    },
    servers: [
      {
        url: env.NODE_ENV === 'production'
          ? 'https://your-api-domain.com/api'
          : `http://localhost:${env.PORT}/api`,
        description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            avatarColor: { type: 'string' },
            avatarEmoji: { type: 'string' },
            isAdmin: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        List: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            icon: { type: 'string' },
            color: { type: 'string' },
            isGroup: { type: 'boolean' },
            hasPassword: { type: 'boolean' },
            inviteCode: { type: 'string' },
            owner: { $ref: '#/components/schemas/User' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  isAdmin: { type: 'boolean' },
                  joinedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            products: {
              type: 'array',
              items: { $ref: '#/components/schemas/Product' },
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string', enum: ['יח׳', 'ק״ג', 'גרם', 'ליטר'] },
            category: { type: 'string' },
            isPurchased: { type: 'boolean' },
            addedBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            listId: { type: 'string' },
            listName: { type: 'string' },
            actorId: { type: 'string' },
            actorName: { type: 'string' },
            productId: { type: 'string' },
            productName: { type: 'string' },
            read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Lists', description: 'Shopping list management' },
      { name: 'Products', description: 'Product management within lists' },
      { name: 'Notifications', description: 'User notifications' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
