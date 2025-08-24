const supabase = require('../config/supabase');

class VoiceModularityService {
  constructor() {
    this.supabase = supabase;
  }

  /**
   * Create a new voice snippet
   */
  async createVoiceSnippet(accountId, snippetData) {
    try {
      const { data, error } = await this.supabase
        .from('voice_snippets')
        .insert({
          account_id: accountId,
          snippet_name: snippetData.name,
          snippet_type: snippetData.type,
          audio_file_path: snippetData.audioPath,
          audio_file_size: snippetData.fileSize,
          duration: snippetData.duration,
          mime_type: snippetData.mimeType || 'audio/mpeg',
          storage_bucket: snippetData.storageBucket || 'voice-snippets',
          storage_path: snippetData.storagePath,
          metadata: snippetData.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creating voice snippet:', error);
      throw error;
    }
  }

  /**
   * Get all voice snippets for an account
   */
  async getVoiceSnippets(accountId) {
    try {
      const { data, error } = await this.supabase
        .from('voice_snippets')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('snippet_name');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching voice snippets:', error);
      throw error;
    }
  }

  /**
   * Create a voice template from snippet names
   */
  async createVoiceTemplate(accountId, templateName, snippetNames, description = '') {
    try {
      // First, get the snippet IDs
      const { data: snippets, error: snippetsError } = await this.supabase
        .from('voice_snippets')
        .select('id, snippet_name')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .in('snippet_name', snippetNames);

      if (snippetsError) throw snippetsError;

      // Build snippet sequence
      const snippetSequence = snippetNames.map(name => {
        const snippet = snippets.find(s => s.snippet_name === name);
        return snippet ? snippet.id : null;
      }).filter(id => id !== null);

      // Calculate total duration
      const totalDuration = snippets.reduce((sum, snippet) => sum + (snippet.duration || 0), 0);

      // Create template
      const { data, error } = await this.supabase
        .from('voice_templates')
        .insert({
          account_id: accountId,
          template_name: templateName,
          template_description: description,
          snippet_sequence: snippetSequence,
          total_duration: totalDuration
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creating voice template:', error);
      throw error;
    }
  }

  /**
   * Get voice template with assembled audio
   */
  async getVoiceTemplateAudio(templateId) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_voice_template_audio', { template_uuid: templateId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching voice template audio:', error);
      throw error;
    }
  }

  /**
   * Create a voice configuration
   */
  async createVoiceConfiguration(accountId, templateId, configName, targetName, customVariables = {}) {
    try {
      const { data, error } = await this.supabase
        .from('voice_configurations')
        .insert({
          account_id: accountId,
          template_id: templateId,
          config_name: configName,
          target_name: targetName,
          custom_variables: customVariables
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creating voice configuration:', error);
      throw error;
    }
  }

  /**
   * Get voice configuration by name
   */
  async getVoiceConfiguration(accountId, configName) {
    try {
      const { data, error } = await this.supabase
        .from('voice_configurations')
        .select(`
          *,
          voice_templates (
            *,
            voice_snippets (
              id,
              snippet_name,
              audio_file_path,
              duration
            )
          )
        `)
        .eq('account_id', accountId)
        .eq('config_name', configName)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching voice configuration:', error);
      throw error;
    }
  }

  /**
   * Log voice usage for a call
   */
  async logVoiceUsage(callId, configurationId, templateId, metadata = {}) {
    try {
      const { data, error } = await this.supabase
        .from('voice_usage')
        .insert({
          call_id: callId,
          configuration_id: configurationId,
          template_id: templateId,
          metadata: metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error logging voice usage:', error);
      throw error;
    }
  }

  /**
   * Generate TwiML for a voice configuration
   */
  async generateTwiMLForConfiguration(configName, accountId) {
    try {
      const config = await this.getVoiceConfiguration(accountId, configName);
      if (!config) {
        throw new Error(`Voice configuration '${configName}' not found`);
      }

      // Build TwiML with all snippets in sequence
      const twiml = [];
      for (const snippet of config.voice_templates.voice_snippets) {
        twiml.push(`<Play>${snippet.audio_file_path}</Play>`);
      }

      return twiml.join('\n');
    } catch (error) {
      console.error('❌ Error generating TwiML:', error);
      throw error;
    }
  }

  /**
   * Get all voice configurations for an account
   */
  async getVoiceConfigurations(accountId) {
    try {
      const { data, error } = await this.supabase
        .from('voice_configurations')
        .select(`
          *,
          voice_templates (
            template_name,
            template_description
          )
        `)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('config_name');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching voice configurations:', error);
      throw error;
    }
  }

  /**
   * Update voice snippet
   */
  async updateVoiceSnippet(snippetId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('voice_snippets')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', snippetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating voice snippet:', error);
      throw error;
    }
  }

  /**
   * Delete voice snippet (soft delete)
   */
  async deleteVoiceSnippet(snippetId) {
    try {
      const { data, error } = await this.supabase
        .from('voice_snippets')
        .update({ is_active: false })
        .eq('id', snippetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error deleting voice snippet:', error);
      throw error;
    }
  }
}

module.exports = VoiceModularityService;
