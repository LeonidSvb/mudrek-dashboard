#!/usr/bin/env node

const https = require('https');

// HubSpot API configuration
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;

if (!HUBSPOT_API_KEY) {
  console.error('Error: HUBSPOT_API_KEY environment variable is required');
  process.exit(1);
}

// MCP Protocol Implementation
class HubSpotMCPServer {
  constructor() {
    this.tools = [
      {
        name: 'hubspot_get_contacts',
        description: 'Get list of contacts from HubSpot',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of contacts to retrieve', default: 10 }
          }
        }
      },
      {
        name: 'hubspot_get_deals',
        description: 'Get list of deals from HubSpot',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of deals to retrieve', default: 10 }
          }
        }
      },
      {
        name: 'hubspot_search',
        description: 'Search for records in HubSpot',
        inputSchema: {
          type: 'object',
          properties: {
            objectType: { type: 'string', description: 'Object type (contacts, deals, companies)', enum: ['contacts', 'deals', 'companies'] },
            query: { type: 'string', description: 'Search query' }
          },
          required: ['objectType', 'query']
        }
      },
      {
        name: 'hubspot_get_properties',
        description: 'Get properties for HubSpot object',
        inputSchema: {
          type: 'object',
          properties: {
            objectType: { type: 'string', description: 'Object type (contacts, deals, companies)', enum: ['contacts', 'deals', 'companies'] }
          },
          required: ['objectType']
        }
      }
    ];
  }

  async makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.hubapi.com',
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  async handleToolCall(name, args) {
    switch (name) {
      case 'hubspot_get_contacts':
        const contacts = await this.makeRequest(`/crm/v3/objects/contacts?limit=${args.limit || 10}`);
        return { content: [{ type: 'text', text: JSON.stringify(contacts, null, 2) }] };

      case 'hubspot_get_deals':
        const deals = await this.makeRequest(`/crm/v3/objects/deals?limit=${args.limit || 10}`);
        return { content: [{ type: 'text', text: JSON.stringify(deals, null, 2) }] };

      case 'hubspot_search':
        const searchBody = {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'CONTAINS_TOKEN',
              value: args.query
            }]
          }]
        };
        const searchResults = await this.makeRequest(`/crm/v3/objects/${args.objectType}/search`, 'POST', searchBody);
        return { content: [{ type: 'text', text: JSON.stringify(searchResults, null, 2) }] };

      case 'hubspot_get_properties':
        const properties = await this.makeRequest(`/crm/v3/properties/${args.objectType}`);
        return { content: [{ type: 'text', text: JSON.stringify(properties, null, 2) }] };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async handleMessage(message) {
    const { method, params } = message;

    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'hubspot-mcp-server',
            version: '1.0.0'
          }
        };

      case 'tools/list':
        return { tools: this.tools };

      case 'tools/call':
        return await this.handleToolCall(params.name, params.arguments || {});

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  async start() {
    process.stdin.setEncoding('utf8');

    let buffer = '';

    process.stdin.on('data', async (chunk) => {
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const message = JSON.parse(line);
          const response = await this.handleMessage(message);

          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: response
          }) + '\n');
        } catch (error) {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32603,
              message: error.message
            }
          }) + '\n');
        }
      }
    });
  }
}

const server = new HubSpotMCPServer();
server.start();
