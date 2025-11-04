# WebRTC Signaling Flow (Improved)

```mermaid
sequenceDiagram
    participant Caller
    participant Firestore
    participant Callee

    Caller->>Firestore: Create call document
    Caller->>Firestore: Create offer + set local description
    Firestore-->>Callee: Offer received via listener
    Callee->>Callee: Validate offer (check duplicates)
    Callee->>Firestore: Create answer + set local description
    Firestore-->>Caller: Answer received via listener
    Caller->>Caller: Validate answer (check duplicates)
    Caller->>Caller: Set remote description
    
    loop ICE Candidate Exchange
        Caller->>Firestore: Send ICE candidates
        Firestore-->>Callee: ICE candidates received
        Callee->>Callee: Validate and queue ICE candidates
        Callee->>Callee: Process ICE candidate queue
        
        Callee->>Firestore: Send ICE candidates
        Firestore-->>Caller: ICE candidates received
        Caller->>Caller: Validate and queue ICE candidates
        Caller->>Caller: Process ICE candidate queue
    end
    
    Caller->>Caller: Connection established
    Callee->>Callee: Connection established
    
    Note over Caller,Callee: Call in progress
    
    Caller->>Firestore: Update call status to ended
    Firestore-->>Callee: Call ended detected via listener
    Caller->>Caller: Cleanup resources
    Callee->>Callee: Cleanup resources
```

This diagram shows the improved signaling flow with:

1. **Duplicate Prevention**: Both caller and callee validate offers/answers to prevent duplicate processing
2. **ICE Candidate Queueing**: Candidates are queued and processed in order to prevent race conditions
3. **Enhanced Validation**: All signaling messages are validated before processing
4. **Proper Cleanup**: Resources are cleaned up when the call ends