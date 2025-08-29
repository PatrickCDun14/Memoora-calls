const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { createWriteStream } = require('fs');

class SimpleRecordingService {
  constructor() {
    this.recordingsDir = path.join(process.cwd(), 'recordings');
    this.ensureRecordingsDirectory();
    
    // Check Twilio credentials
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    
    console.log('🎵 Simple Recording Service initialized');
    console.log(`🔐 Twilio Credentials Check:`);
    console.log(`   Account SID: ${twilioAccountSid ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Auth Token: ${twilioAuthToken ? '✅ Set' : '❌ Missing'}`);
    
    if (!twilioAccountSid || !twilioAuthToken) {
      console.warn('⚠️  WARNING: Twilio credentials missing - recording downloads will fail!');
    }
  }

  async ensureRecordingsDirectory() {
    try {
      await fs.access(this.recordingsDir);
    } catch (error) {
      await fs.mkdir(this.recordingsDir, { recursive: true });
      console.log(`📁 Created recordings directory: ${this.recordingsDir}`);
    }
  }

  async downloadRecording(recordingUrl, callId, recordingSid) {
    try {
      console.log(`🎵 Downloading recording from: ${recordingUrl}`);
      console.log(`🎵 Call ID: ${callId}, Recording SID: ${recordingSid}`);
      
      // Create filename with timestamp and call info
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}_${callId}_${recordingSid}.mp3`;
      const filepath = path.join(this.recordingsDir, filename);
      
      console.log(`🎵 Target filename: ${filename}`);
      console.log(`🎵 Target filepath: ${filepath}`);
      
      // Download the recording
      await this.downloadFile(recordingUrl, filepath);
      
      // Verify the file was downloaded
      const fileSize = await this.getFileSize(filepath);
      console.log(`🎵 Download completed. File size: ${fileSize} bytes`);
      
      if (fileSize === 0) {
        throw new Error('Downloaded file is empty (0 bytes)');
      }
      
      console.log(`✅ Recording saved successfully: ${filename}`);
      
      return {
        success: true,
        filename,
        filepath,
        recordingUrl,
        recordingSid,
        callId,
        timestamp: new Date().toISOString(),
        size: fileSize
      };
      
    } catch (error) {
      console.error('❌ Error downloading recording:', error.message);
      throw new Error(`Failed to download recording: ${error.message}`);
    }
  }

  downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(filepath);
      
      // Check if this is a Twilio URL that needs authentication
      if (url.includes('api.twilio.com')) {
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        
        console.log(`🔐 Twilio Auth Debug:`);
        console.log(`   Account SID: ${twilioAccountSid ? '✅ Set' : '❌ Missing'}`);
        console.log(`   Auth Token: ${twilioAuthToken ? '✅ Set' : '❌ Missing'}`);
        console.log(`   URL: ${url}`);
        
        if (!twilioAccountSid || !twilioAuthToken) {
          reject(new Error('Twilio credentials not configured for recording download'));
          return;
        }
        
        // Create Basic Auth header for Twilio
        const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
        console.log(`   Auth Header: Basic ${auth.substring(0, 20)}...`);
        
        const options = {
          headers: {
            'Authorization': `Basic ${auth}`,
            'User-Agent': 'Memoora-Recording-Service/1.0'
          }
        };
        
        https.get(url, options, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            resolve();
          });
          
          file.on('error', (error) => {
            fs.unlink(filepath).catch(() => {}); // Clean up on error
            reject(error);
          });
        }).on('error', (error) => {
          reject(error);
        });
      } else {
        // Regular HTTPS download without auth
        https.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            resolve();
          });
          
          file.on('error', (error) => {
            fs.unlink(filepath).catch(() => {}); // Clean up on error
            reject(error);
          });
        }).on('error', (error) => {
          reject(error);
        });
      }
    });
  }

  async getFileSize(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  async listRecordings() {
    try {
      const files = await fs.readdir(this.recordingsDir);
      const recordings = [];
      
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const filepath = path.join(this.recordingsDir, file);
          const stats = await fs.stat(filepath);
          
          // Parse filename: timestamp_callId_recordingSid.mp3
          const parts = file.replace('.mp3', '').split('_');
          const timestamp = parts.slice(0, 3).join('_'); // Date part
          const callId = parts[3];
          const recordingSid = parts[4];
          
          recordings.push({
            filename: file,
            filepath,
            callId,
            recordingSid,
            timestamp: timestamp.replace(/-/g, ':').replace('T', ' ').replace('Z', ''),
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      }
      
      // Sort by creation time (newest first)
      recordings.sort((a, b) => b.createdAt - a.createdAt);
      
      return recordings;
      
    } catch (error) {
      console.error('❌ Error listing recordings:', error.message);
      return [];
    }
  }

  async getRecording(filename) {
    try {
      const filepath = path.join(this.recordingsDir, filename);
      const stats = await fs.stat(filepath);
      
      return {
        filename,
        filepath,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
      
    } catch (error) {
      console.error('❌ Error getting recording:', error.message);
      return null;
    }
  }

  async deleteRecording(filename) {
    try {
      const filepath = path.join(this.recordingsDir, filename);
      await fs.unlink(filepath);
      console.log(`🗑️  Recording deleted: ${filename}`);
      return { success: true, message: `Recording ${filename} deleted successfully` };
      
    } catch (error) {
      console.error('❌ Error deleting recording:', error.message);
      throw new Error(`Failed to delete recording: ${error.message}`);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getRecordingsStats() {
    try {
      const recordings = await this.listRecordings();
      const totalSize = recordings.reduce((sum, rec) => sum + rec.size, 0);
      
      return {
        totalRecordings: recordings.length,
        totalSize: totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
        averageSize: recordings.length > 0 ? totalSize / recordings.length : 0,
        averageSizeFormatted: recordings.length > 0 ? this.formatFileSize(totalSize / recordings.length) : '0 Bytes',
        oldestRecording: recordings.length > 0 ? recordings[recordings.length - 1].timestamp : null,
        newestRecording: recordings.length > 0 ? recordings[0].timestamp : null
      };
      
    } catch (error) {
      console.error('❌ Error getting recording stats:', error.message);
      return {
        totalRecordings: 0,
        totalSize: 0,
        totalSizeFormatted: '0 Bytes',
        averageSize: 0,
        averageSizeFormatted: '0 Bytes',
        oldestRecording: null,
        newestRecording: null
      };
    }
  }
}

module.exports = SimpleRecordingService;
