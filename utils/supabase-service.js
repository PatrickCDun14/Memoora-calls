// utils/supabase-service.js
const supabase = require('../config/supabase');

class SupabaseService {
  constructor() {
    this.supabase = supabase;
  }

  /**
   * Create a new call record
   */
  async createCall(callData) {
    try {
      const { data, error } = await this.supabase
        .from('calls')
        .insert(callData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creating call:', error);
      throw error;
    }
  }

  /**
   * Get a call by ID and account ID
   */
  async getCall(callId, accountId) {
    try {
      const { data, error } = await this.supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .eq('account_id', accountId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching call:', error);
      return null;
    }
  }

  /**
   * Update call status
   */
  async updateCallStatus(callId, status, metadata = {}) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      // Add metadata if provided
      if (Object.keys(metadata).length > 0) {
        updateData.metadata = metadata;
      }

      const { data, error } = await this.supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;

      // Log call event
      await this.logCallEvent(callId, status, metadata);
      
      return data;
    } catch (error) {
      console.error('❌ Error updating call status:', error);
      throw error;
    }
  }

  /**
   * Update call with Twilio SID
   */
  async updateCallWithTwilioSid(callId, twilioSid) {
    try {
      const { data, error } = await this.supabase
        .from('calls')
        .update({
          twilio_call_sid: twilioSid,
          updated_at: new Date().toISOString()
        })
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating call with Twilio SID:', error);
      throw error;
    }
  }

  /**
   * Log call event
   */
  async logCallEvent(callId, eventType, eventData = {}) {
    try {
      const { error } = await this.supabase
        .from('call_events')
        .insert({
          call_id: callId,
          event_type: eventType,
          event_data: eventData,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error logging call event:', error);
      // Don't throw - event logging shouldn't break main flow
    }
  }

  /**
   * Get call events
   */
  async getCallEvents(callId) {
    try {
      const { data, error } = await this.supabase
        .from('call_events')
        .select('*')
        .eq('call_id', callId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching call events:', error);
      return [];
    }
  }

  /**
   * Get recording by filename
   */
  async getRecording(filename) {
    try {
      const { data, error } = await this.supabase
        .from('recordings')
        .select('*')
        .eq('filename', filename)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching recording:', error);
      return null;
    }
  }

  /**
   * Check account quotas
   */
  async checkAccountQuotas(accountId) {
    try {
      // Get account quotas
      const { data: quotas, error: quotaError } = await this.supabase
        .from('account_quotas')
        .select('*')
        .eq('account_id', accountId)
        .single();

      if (quotaError && quotaError.code !== 'PGRST116') {
        throw quotaError;
      }

      // Default quotas if none set
      const dailyLimit = quotas?.daily_call_limit || 100;
      const monthlyLimit = quotas?.monthly_call_limit || 3000;

      // Get current usage
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: dailyCalls, error: dailyError } = await this.supabase
        .from('calls')
        .select('id')
        .eq('account_id', accountId)
        .gte('created_at', startOfDay.toISOString());

      const { data: monthlyCalls, error: monthlyError } = await this.supabase
        .from('calls')
        .select('id')
        .eq('account_id', accountId)
        .gte('created_at', startOfMonth.toISOString());

      if (dailyError || monthlyError) {
        console.warn('⚠️ Could not check call quotas, allowing call');
        return { canMakeCall: true };
      }

      const dailyCount = dailyCalls?.length || 0;
      const monthlyCount = monthlyCalls?.length || 0;

      const canMakeCall = dailyCount < dailyLimit && monthlyCount < monthlyLimit;

      return {
        canMakeCall,
        message: canMakeCall ? 'Quota check passed' : 'Daily or monthly call limit exceeded',
        limits: {
          daily: { used: dailyCount, limit: dailyLimit, remaining: dailyLimit - dailyCount },
          monthly: { used: monthlyCount, limit: monthlyLimit, remaining: monthlyLimit - monthlyCount }
        }
      };

    } catch (error) {
      console.error('❌ Error checking quotas:', error);
      // If quota check fails, allow the call
      return { canMakeCall: true };
    }
  }

  /**
   * Check batch quotas
   */
  async checkBatchQuotas(accountId, batchSize) {
    try {
      const quotaCheck = await this.checkAccountQuotas(accountId);
      
      if (!quotaCheck.canMakeCall) {
        return quotaCheck;
      }

      // Check if batch size would exceed daily limit
      const dailyRemaining = quotaCheck.limits.daily.remaining;
      if (batchSize > dailyRemaining) {
        return {
          canMakeBatch: false,
          message: `Batch size (${batchSize}) exceeds daily remaining quota (${dailyRemaining})`,
          limits: quotaCheck.limits
        };
      }

      return {
        canMakeBatch: true,
        message: 'Batch quota check passed',
        limits: quotaCheck.limits
      };

    } catch (error) {
      console.error('❌ Error checking batch quotas:', error);
      return { canMakeBatch: true };
    }
  }

  /**
   * Queue call for processing
   */
  async queueCallForProcessing(callId) {
    try {
      // This could be enhanced with a proper job queue system
      // For now, we just log the event
      await this.logCallEvent(callId, 'queued_for_processing', {
        queuedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error queuing call:', error);
      // Don't throw - queuing shouldn't break main flow
    }
  }

  /**
   * Schedule call for future
   */
  async scheduleCall(callId, scheduledFor) {
    try {
      // This could be enhanced with a proper scheduling system
      // For now, we just log the event
      await this.logCallEvent(callId, 'scheduled', {
        scheduledFor,
        scheduledAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error scheduling call:', error);
      // Don't throw - scheduling shouldn't break main flow
    }
  }

  /**
   * Get batch calls
   */
  async getBatchCalls(batchId, accountId) {
    try {
      const { data, error } = await this.supabase
        .from('calls')
        .select('*')
        .eq('account_id', accountId)
        .contains('metadata', { batchId })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching batch calls:', error);
      return [];
    }
  }

  /**
   * Get account call statistics
   */
  async getAccountCallStats(accountId) {
    try {
      // Get basic stats
      const { data: calls, error: callsError } = await this.supabase
        .from('calls')
        .select('status, duration, call_cost, created_at')
        .eq('account_id', accountId);

      if (callsError) throw callsError;

      const stats = {
        totalCalls: calls.length,
        answeredCalls: calls.filter(c => c.status === 'completed').length,
        totalDuration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
        totalCost: calls.reduce((sum, c) => sum + (c.call_cost || 0), 0)
      };

      // Get quotas
      const { data: quotas, error: quotaError } = await this.supabase
        .from('account_quotas')
        .select('*')
        .eq('account_id', accountId)
        .single();

      // Get recent activity (last 10 calls)
      const { data: recentCalls, error: recentError } = await this.supabase
        .from('calls')
        .select('id, status, to_number, created_at, duration')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        ...stats,
        quotas: quotaError ? null : quotas,
        recentActivity: recentError ? [] : recentCalls
      };

    } catch (error) {
      console.error('❌ Error fetching account stats:', error);
      return {
        totalCalls: 0,
        answeredCalls: 0,
        totalDuration: 0,
        totalCost: 0,
        quotas: null,
        recentActivity: []
      };
    }
  }

  /**
   * Update call duration and cost
   */
  async updateCallMetrics(callId, duration, cost = null) {
    try {
      const updateData = {
        duration,
        updated_at: new Date().toISOString()
      };

      if (cost !== null) {
        updateData.call_cost = cost;
      }

      const { data, error } = await this.supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating call metrics:', error);
      throw error;
    }
  }

  /**
   * Get calls by status
   */
  async getCallsByStatus(accountId, status, limit = 100) {
    try {
      const { data, error } = await this.supabase
        .from('calls')
        .select('*')
        .eq('account_id', accountId)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching calls by status:', error);
      return [];
    }
  }

  /**
   * Search calls
   */
  async searchCalls(accountId, searchParams) {
    try {
      let query = this.supabase
        .from('calls')
        .select('*')
        .eq('account_id', accountId);

      // Add search filters
      if (searchParams.phoneNumber) {
        query = query.ilike('to_number', `%${searchParams.phoneNumber}%`);
      }

      if (searchParams.status) {
        query = query.eq('status', searchParams.status);
      }

      if (searchParams.dateFrom) {
        query = query.gte('created_at', searchParams.dateFrom);
      }

      if (searchParams.dateTo) {
        query = query.lte('created_at', searchParams.dateTo);
      }

      // Add ordering and pagination
      query = query.order('created_at', { ascending: false });

      if (searchParams.limit) {
        query = query.limit(searchParams.limit);
      }

      if (searchParams.offset) {
        query = query.range(searchParams.offset, searchParams.offset + (searchParams.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error searching calls:', error);
      return [];
    }
  }

  /**
   * Clean up old call data (for maintenance)
   */
  async cleanupOldCalls(accountId, daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await this.supabase
        .from('calls')
        .select('id')
        .eq('account_id', accountId)
        .lt('created_at', cutoffDate.toISOString())
        .in('status', ['completed', 'failed', 'cancelled']);

      if (error) throw error;

      // Mark old calls as archived (soft delete)
      if (data && data.length > 0) {
        const callIds = data.map(c => c.id);
        
        const { error: updateError } = await this.supabase
          .from('calls')
          .update({ 
            metadata: { archived: true, archivedAt: new Date().toISOString() }
          })
          .in('id', callIds);

        if (updateError) throw updateError;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('❌ Error cleaning up old calls:', error);
      return 0;
    }
  }
}

module.exports = SupabaseService;
