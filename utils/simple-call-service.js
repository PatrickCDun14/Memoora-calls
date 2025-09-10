class SimpleCallService {
  constructor() {
    // In-memory storage for calls
    this.calls = new Map();
    this.callCounter = 0;
    
    console.log('📞 Simple Call Service initialized (in-memory storage)');
  }

  // Generate a unique call ID
  generateCallId() {
    this.callCounter++;
    return `call_${Date.now()}_${this.callCounter}`;
  }

  // Create a new call record
  createCall(callData) {
    const {
      phoneNumber,
      customMessage,
      storytellerId,
      familyMemberId,
      scheduledCallId,
      callType,
      recordingType,
      interactive,
      apiKeyInfo
    } = callData;

    const callId = this.generateCallId();
    const now = new Date().toISOString();

    const callRecord = {
      id: callId,
      phoneNumber,
      customMessage,
      storytellerId: storytellerId || null,
      familyMemberId: familyMemberId || null,
      scheduledCallId: scheduledCallId || null,
      callType: callType || 'storytelling',
      recordingType: recordingType || 'phone_call',
      interactive: interactive || false,
      status: 'initiated',
      apiKeyId: apiKeyInfo.id,
      clientName: apiKeyInfo.clientName,
      createdAt: now,
      updatedAt: now,
      metadata: {
        question: customMessage,
        callType: callType || 'storytelling',
        recordingType: recordingType || 'phone_call',
        initiatedAt: now,
        apiKeyUsed: apiKeyInfo.id
      }
    };

    // Store the call
    this.calls.set(callId, callRecord);
    
    console.log(`📞 New call created: ${callId} to ${phoneNumber}`);
    console.log(`📞 Call details:`, {
      id: callId,
      phoneNumber,
      callType,
      interactive,
      clientName: apiKeyInfo.clientName
    });

    return callRecord;
  }

  // Get a call by ID
  getCall(callId) {
    return this.calls.get(callId);
  }

  // Get all calls for an API key
  getCallsByApiKey(apiKeyId) {
    const calls = [];
    for (const [id, call] of this.calls) {
      if (call.apiKeyId === apiKeyId) {
        calls.push(call);
      }
    }
    return calls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Update call status
  updateCallStatus(callId, status, additionalData = {}) {
    const call = this.calls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    call.status = status;
    call.updatedAt = new Date().toISOString();
    
    // Merge additional data
    if (additionalData.metadata) {
      call.metadata = { ...call.metadata, ...additionalData.metadata };
    }
    
    // Add specific fields if provided
    if (additionalData.recording) {
      call.recording = { ...call.recording, ...additionalData.recording };
    }
    
    if (additionalData.twilioSid) {
      call.twilioSid = additionalData.twilioSid;
    }
    
    if (additionalData.duration) {
      call.duration = additionalData.duration;
    }
    
    if (additionalData.recordingUrl) {
      call.recordingUrl = additionalData.recordingUrl;
    }
    if (additionalData.completedAt) call.completedAt = additionalData.completedAt;

    console.log(`📞 Call ${callId} status updated to: ${status}`);
    
    return call;
  }

  // Add recording information to a call
  addRecordingToCall(callId, recordingData) {
    const call = this.calls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    call.recording = {
      ...call.recording,
      ...recordingData,
      addedAt: new Date().toISOString()
    };

    call.updatedAt = new Date().toISOString();
    
    console.log(`🎵 Recording added to call ${callId}:`, recordingData.filename);
    
    return call;
  }

  // Simulate call completion (for testing)
  simulateCallCompletion(callId) {
    const call = this.calls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    // Simulate call duration (1-5 minutes)
    const duration = Math.floor(Math.random() * 240) + 60; // 60-300 seconds
    
    const completedCall = this.updateCallStatus(callId, 'completed', {
      duration,
      completedAt: new Date().toISOString(),
      metadata: {
        ...call.metadata,
        simulated: true,
        simulatedDuration: duration,
        completedAt: new Date().toISOString()
      }
    });

    console.log(`📞 Call ${callId} simulated completion (${duration}s)`);
    
    return completedCall;
  }

  // Get call statistics
  getCallStats() {
    const totalCalls = this.calls.size;
    const callsByStatus = {};
    const callsByType = {};
    const callsByClient = {};

    for (const [id, call] of this.calls) {
      // Count by status
      callsByStatus[call.status] = (callsByStatus[call.status] || 0) + 1;
      
      // Count by type
      callsByType[call.callType] = (callsByType[call.callType] || 0) + 1;
      
      // Count by client
      callsByClient[call.clientName] = (callsByClient[call.clientName] || 0) + 1;
    }

    return {
      totalCalls,
      callsByStatus,
      callsByType,
      callsByClient,
      storageType: 'in-memory',
      uptime: process.uptime()
    };
  }

  // Search calls with filters
  searchCalls(filters = {}) {
    const results = [];
    
    for (const [id, call] of this.calls) {
      let matches = true;
      
      // Filter by status
      if (filters.status && call.status !== filters.status) {
        matches = false;
      }
      
      // Filter by call type
      if (filters.callType && call.callType !== filters.callType) {
        matches = false;
      }
      
      // Filter by client
      if (filters.clientName && call.clientName !== filters.clientName) {
        matches = false;
      }
      
      // Filter by date range
      if (filters.startDate) {
        const callDate = new Date(call.createdAt);
        const startDate = new Date(filters.startDate);
        if (callDate < startDate) matches = false;
      }
      
      if (filters.endDate) {
        const callDate = new Date(call.createdAt);
        const endDate = new Date(filters.endDate);
        if (callDate > endDate) matches = false;
      }
      
      if (matches) {
        results.push(call);
      }
    }
    
    // Sort by creation date (newest first)
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Delete a call (for cleanup)
  deleteCall(callId) {
    const deleted = this.calls.delete(callId);
    if (deleted) {
      console.log(`🗑️ Call ${callId} deleted`);
    }
    return deleted;
  }

  // Get recent calls (last N calls)
  getRecentCalls(limit = 10) {
    const calls = Array.from(this.calls.values());
    return calls
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
}

module.exports = SimpleCallService;
