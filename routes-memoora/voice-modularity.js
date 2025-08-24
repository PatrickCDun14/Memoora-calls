const express = require('express');
const router = express.Router();
const VoiceModularityService = require('../utils/voice-modularity-service');
const { validateApiKey } = require('../utils/security');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const voiceService = new VoiceModularityService();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './audio/snippets';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Apply security middleware to all routes
router.use(validateApiKey);

// 🎙️ Route 1: Upload voice snippet
router.post('/snippets', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { snippetName, snippetType, description } = req.body;
    
    if (!snippetName || !snippetType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['snippetName', 'snippetType']
      });
    }

    // Get file stats for duration and size
    const filePath = req.file.path;
    const stats = fs.statSync(filePath);
    
    // For now, we'll estimate duration (you could use ffmpeg to get exact duration)
    const estimatedDuration = Math.ceil(stats.size / (32000)); // Rough estimate based on file size

    const snippetData = {
      name: snippetName,
      type: snippetType,
      audioPath: `/api/v1/voice/snippets/${req.file.filename}`,
      fileSize: stats.size,
      duration: estimatedDuration,
      mimeType: req.file.mimetype,
      storagePath: filePath,
      metadata: { description, originalName: req.file.originalname }
    };

    const snippet = await voiceService.createVoiceSnippet(req.apiKeyInfo.accountId, snippetData);

    res.status(201).json({
      message: 'Voice snippet created successfully',
      snippet: {
        id: snippet.id,
        name: snippet.snippet_name,
        type: snippet.snippet_type,
        audioPath: snippet.audio_file_path,
        duration: snippet.duration
      }
    });

  } catch (error) {
    console.error('❌ Error creating voice snippet:', error);
    res.status(500).json({ 
      error: 'Failed to create voice snippet',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🎙️ Route 2: Get all voice snippets for account
router.get('/snippets', async (req, res) => {
  try {
    const snippets = await voiceService.getVoiceSnippets(req.apiKeyInfo.accountId);
    
    res.json({
      snippets: snippets.map(snippet => ({
        id: snippet.id,
        name: snippet.snippet_name,
        type: snippet.snippet_type,
        audioPath: snippet.audio_file_path,
        duration: snippet.duration,
        createdAt: snippet.created_at
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching voice snippets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voice snippets',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🎙️ Route 3: Create voice template
router.post('/templates', async (req, res) => {
  try {
    const { templateName, snippetNames, description } = req.body;
    
    if (!templateName || !snippetNames || !Array.isArray(snippetNames)) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['templateName', 'snippetNames (array)']
      });
    }

    const template = await voiceService.createVoiceTemplate(
      req.apiKeyInfo.accountId, 
      templateName, 
      snippetNames, 
      description
    );

    res.status(201).json({
      message: 'Voice template created successfully',
      template: {
        id: template.id,
        name: template.template_name,
        description: template.template_description,
        snippetCount: template.snippet_sequence.length,
        totalDuration: template.total_duration
      }
    });

  } catch (error) {
    console.error('❌ Error creating voice template:', error);
    res.status(500).json({ 
      error: 'Failed to create voice template',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🎙️ Route 4: Get voice template audio
router.get('/templates/:templateId/audio', async (req, res) => {
  try {
    const { templateId } = req.params;
    const audioData = await voiceService.getVoiceTemplateAudio(templateId);
    
    res.json({
      templateId,
      snippets: audioData.map(snippet => ({
        order: snippet.snippet_order,
        name: snippet.snippet_name,
        audioPath: snippet.audio_file_path,
        duration: snippet.duration
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching template audio:', error);
    res.status(500).json({ 
      error: 'Failed to fetch template audio',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🎙️ Route 5: Create voice configuration
router.post('/configurations', async (req, res) => {
  try {
    const { templateId, configName, targetName, customVariables } = req.body;
    
    if (!templateId || !configName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['templateId', 'configName']
      });
    }

    const config = await voiceService.createVoiceConfiguration(
      req.apiKeyInfo.accountId,
      templateId,
      configName,
      targetName,
      customVariables
    );

    res.status(201).json({
      message: 'Voice configuration created successfully',
      configuration: {
        id: config.id,
        name: config.config_name,
        targetName: config.target_name,
        templateId: config.template_id
      }
    });

  } catch (error) {
    console.error('❌ Error creating voice configuration:', error);
    res.status(500).json({ 
      error: 'Failed to create voice configuration',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🎙️ Route 6: Get voice configuration by name
router.get('/configurations/:configName', async (req, res) => {
  try {
    const { configName } = req.params;
    const config = await voiceService.getVoiceConfiguration(req.apiKeyInfo.accountId, configName);
    
    if (!config) {
      return res.status(404).json({ error: 'Voice configuration not found' });
    }

    res.json({
      configuration: {
        id: config.id,
        name: config.config_name,
        targetName: config.target_name,
        template: {
          id: config.voice_templates.id,
          name: config.voice_templates.template_name,
          description: config.voice_templates.template_description
        },
        snippets: config.voice_templates.voice_snippets.map(snippet => ({
          name: snippet.snippet_name,
          audioPath: snippet.audio_file_path,
          duration: snippet.duration
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching voice configuration:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voice configuration',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🎙️ Route 7: Get all voice configurations
router.get('/configurations', async (req, res) => {
  try {
    const configs = await voiceService.getVoiceConfigurations(req.apiKeyInfo.accountId);
    
    res.json({
      configurations: configs.map(config => ({
        id: config.id,
        name: config.config_name,
        targetName: config.target_name,
        template: {
          name: config.voice_templates.template_name,
          description: config.voice_templates.template_description
        }
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching voice configurations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voice configurations',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🎙️ Route 8: Serve audio snippet files
router.get('/snippets/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '..', 'audio', 'snippets', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Audio snippet not found' });
    }
    
    res.sendFile(filepath);
  } catch (error) {
    console.error('❌ Error serving audio snippet:', error);
    res.status(500).json({ error: 'Failed to serve audio snippet' });
  }
});

// 🎙️ Route 9: Delete voice snippet (soft delete)
router.delete('/snippets/:snippetId', async (req, res) => {
  try {
    const { snippetId } = req.params;
    await voiceService.deleteVoiceSnippet(snippetId);
    
    res.json({ message: 'Voice snippet deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting voice snippet:', error);
    res.status(500).json({ 
      error: 'Failed to delete voice snippet',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
