// examples/client-integration.js
// Example of how another application integrates with Memoora service

const axios = require('axios');

class MemooraClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.apiKey = null;
    this.apiInfo = null;
  }

  // Step 0: Discover the API (no authentication required)
  async discoverApi() {
    try {
      console.log('🔍 Discovering Memoora API...');
      
      const response = await axios.get(`${this.baseUrl}/api/v1/`);
      this.apiInfo = response.data;
      
      console.log('✅ API discovered successfully!');
      console.log(`📱 Service: ${this.apiInfo.service}`);
      console.log(`🔢 Version: ${this.apiInfo.version}`);
      console.log(`📚 Documentation: ${this.apiInfo.documentation}`);
      
      // Show available endpoints
      console.log('\n📋 Available endpoints:');
      Object.entries(this.apiInfo.endpoints).forEach(([endpoint, description]) => {
        console.log(`  ${endpoint}: ${description}`);
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to discover API:', error.response?.data || error.message);
      throw error;
    }
  }

  // Step 1: Generate an API key (no authentication required)
  async generateApiKey(clientName, email, description = '') {
    try {
      console.log('🔑 Generating API key...');
      
      const response = await axios.post(`${this.baseUrl}/api/v1/generate-api-key`, {
        clientName,
        email,
        description
      });

      const { apiKey, keyId, warning } = response.data;
      
      // Store the API key
      this.apiKey = apiKey;
      
      console.log('✅ API key generated successfully!');
      console.log(`🔑 Key ID: ${keyId}`);
      console.log(`⚠️  ${warning}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to generate API key:', error.response?.data || error.message);
      throw error;
    }
  }

  // Step 2: Use the API key for authenticated requests
  async initiateCall(phoneNumber, customMessage = '') {
    if (!this.apiKey) {
      throw new Error('No API key available. Call generateApiKey() first.');
    }

    try {
      console.log(`📞 Initiating call to ${phoneNumber}...`);
      
      const response = await axios.post(`${this.baseUrl}/api/v1/call`, {
        phoneNumber,
        customMessage
      }, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      console.log('✅ Call initiated successfully!');
      console.log(`📱 Call SID: ${response.data.sid}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to initiate call:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get list of recordings
  async getRecordings() {
    if (!this.apiKey) {
      throw new Error('No API key available. Call generateApiKey() first.');
    }

    try {
      console.log('📋 Fetching recordings...');
      
      const response = await axios.get(`${this.baseUrl}/api/v1/recordings`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      console.log(`✅ Found ${response.data.recordings.length} recordings`);
      return response.data.recordings;
    } catch (error) {
      console.error('❌ Failed to get recordings:', error.response?.data || error.message);
      throw error;
    }
  }

  // Download a specific recording
  async downloadRecording(filename, savePath) {
    if (!this.apiKey) {
      throw new Error('No API key available. Call generateApiKey() first.');
    }

    try {
      console.log(`⬇️ Downloading recording: ${filename}`);
      
      const response = await axios.get(`${this.baseUrl}/api/v1/recordings/${filename}`, {
        headers: {
          'x-api-key': this.apiKey
        },
        responseType: 'stream'
      });

      // Save the file
      const fs = require('fs');
      const writer = fs.createWriteStream(savePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Recording saved to: ${savePath}`);
          resolve(savePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Failed to download recording:', error.response?.data || error.message);
      throw error;
    }
  }

  // Check service health
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      console.log('🏥 Service health:', response.data.status);
      return response.data;
    } catch (error) {
      console.error('❌ Service health check failed:', error.message);
      throw error;
    }
  }

  // Get OpenAPI specification
  async getOpenApiSpec() {
    try {
      console.log('📖 Fetching OpenAPI specification...');
      
      const response = await axios.get(`${this.baseUrl}/api/v1/openapi.json`);
      console.log('✅ OpenAPI spec retrieved successfully');
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get OpenAPI spec:', error.response?.data || error.message);
      throw error;
    }
  }

  // Show API information
  showApiInfo() {
    if (!this.apiInfo) {
      console.log('❌ No API info available. Call discoverApi() first.');
      return;
    }

    console.log('\n📊 API Information:');
    console.log(`  Service: ${this.apiInfo.service}`);
    console.log(`  Version: ${this.apiInfo.version}`);
    console.log(`  Description: ${this.apiInfo.description}`);
    
    console.log('\n🔐 Authentication:');
    console.log(`  Method: ${this.apiInfo.authentication.method}`);
    console.log(`  Header: ${this.apiInfo.authentication.header}`);
    console.log(`  Note: ${this.apiInfo.authentication.note}`);
    
    console.log('\n⏱️ Rate Limits:');
    Object.entries(this.apiInfo.rateLimits).forEach(([endpoint, limit]) => {
      console.log(`  ${endpoint}: ${limit}`);
    });
    
    console.log('\n📚 Support:');
    console.log(`  Documentation: ${this.apiInfo.support.documentation}`);
    console.log(`  Health Check: ${this.apiInfo.support.health}`);
    console.log(`  Contact: ${this.apiInfo.support.contact}`);
  }
}

// Example usage
async function exampleUsage() {
  const client = new MemooraClient('http://localhost:5000');
  
  try {
    // Step 0: Discover the API (no auth required)
    await client.discoverApi();
    client.showApiInfo();
    
    // Step 1: Check if service is running
    await client.checkHealth();
    
    // Step 2: Generate an API key (first time only)
    await client.generateApiKey(
      'My Application',
      'dev@mycompany.com',
      'Production API key for call recording service'
    );
    
    // Step 3: Use the service with your API key
    await client.initiateCall('+1234567890', 'Please share your story!');
    
    // Step 4: Get recordings
    const recordings = await client.getRecordings();
    console.log('Available recordings:', recordings);
    
    // Step 5: Download a recording (if any exist)
    if (recordings.length > 0) {
      const firstRecording = recordings[0];
      await client.downloadRecording(
        firstRecording.filename, 
        `./downloads/${firstRecording.filename}`
      );
    }
    
    // Step 6: Get OpenAPI specification for integration
    await client.getOpenApiSpec();
    
  } catch (error) {
    console.error('Example failed:', error.message);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}

module.exports = MemooraClient; 