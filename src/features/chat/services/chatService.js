import { db } from '@/config/firebase';
import { collection, doc, setDoc, query, orderBy, where, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';
import { getCurrentUser } from '@/features/user/services/userService';
import { handleFirestoreError } from '@/config/firebase';

/**
 * Function to send a message to Firestore
 * @param {Object} messageData - The message data to send
 * @param {string} recipientUserId - The Firebase UID of the message recipient
 * @returns {Promise<string|null>} - The document ID of the sent message, or null if failed
 */
export const sendMessage = async (messageData, recipientUserId) => {
  // Only interact with Firestore if it's available
  if (db) {
    try {
      const user = getCurrentUser();
      
      // Validate required data
      if (!user || !recipientUserId) {
        console.error('Missing user or recipient data');
        return null;
      }
      
      const messagesRef = collection(db, 'messages');
      
      // Create message object
      const message = {
        text: messageData.text,
        name: messageData.name || (user.displayName) || 'Anonymous',
        userId: user.uid,
        recipientId: recipientUserId,
        timestamp: serverTimestamp(), // Use server timestamp for better consistency
        you: messageData.you || false,
        photoURL: messageData.photoURL || (user.photoURL) || null
      };
      
      // Use addDoc to let Firestore generate the ID
      const docRef = await addDoc(messagesRef, message);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error);
      console.error('Error sending message:', error);
      // Don't throw error, just return null to indicate failure
      return null;
    }
  } else {
    console.warn('Firestore not available, message not sent');
    return null;
  }
};

/**
 * Function to subscribe to messages from Firestore for a specific conversation
 * @param {string} selectedUserId - The Firebase UID of the conversation partner
 * @param {Function} callback - Called with an array of messages when updates occur
 * @returns {Function} - Unsubscribe function to clean up the listener
 */
export const subscribeToMessages = (selectedUserId, callback) => {
  // Only subscribe to Firestore if it's available
  if (db) {
    try {
      const currentUser = getCurrentUser();
      
      // If no selected user or no current user, return empty array
      if (!selectedUserId || !currentUser) {
        callback([]);
        return () => {};
      }
      
      // Create a single efficient query that gets messages between both users
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('userId', 'in', [currentUser.uid, selectedUserId]),
        where('recipientId', 'in', [currentUser.uid, selectedUserId]),
        orderBy('timestamp', 'asc')
      );
      
      // Subscribe to the query
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            ...data,
            you: data.userId === currentUser.uid,
            time: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          });
        });
        
        callback(messages);
      }, (error) => {
        handleFirestoreError(error);
        callback([]);
      });
      
      // Return the unsubscribe function
      return unsubscribe;
    } catch (error) {
      handleFirestoreError(error);
      callback([]);
      return () => {};
    }
  } else {
    console.warn('Firestore not available, returning empty message list');
    callback([]);
    return () => {};
  }
};

/**
 * Function to subscribe to latest messages for conversation list
 * @param {Function} callback - Called with an array of latest messages when updates occur
 * @returns {Function} - Unsubscribe function to clean up the listener
 */
export const subscribeToLatestMessages = (callback) => {
  if (db) {
    try {
      const currentUser = getCurrentUser();
      
      if (!currentUser) {
        callback([]);
        return () => {};
      }
      
      // Get all messages where current user is either sender or recipient
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const latestMessages = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const otherUserId = data.recipientId;
          
          // Only keep the most recent message for each conversation
          if (!latestMessages[otherUserId] || 
              data.timestamp.toDate() > latestMessages[otherUserId].timestamp.toDate()) {
            latestMessages[otherUserId] = {
              id: doc.id,
              ...data,
              otherUserId: otherUserId
            };
          }
        });
        
        // Also get messages where current user is recipient
        const q2 = query(
          messagesRef,
          where('recipientId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        
        const unsubscribe2 = onSnapshot(q2, (snapshot2) => {
          snapshot2.forEach((doc) => {
            const data = doc.data();
            const otherUserId = data.userId;
            
            // Only keep the most recent message for each conversation
            if (!latestMessages[otherUserId] || 
                data.timestamp.toDate() > latestMessages[otherUserId].timestamp.toDate()) {
              latestMessages[otherUserId] = {
                id: doc.id,
                ...data,
                otherUserId: otherUserId
              };
            }
          });
          
          callback(Object.values(latestMessages));
        }, (error) => {
          handleFirestoreError(error);
          callback(Object.values(latestMessages));
        });
        
        // Return unsubscribe function for both queries
        return () => {
          unsubscribe();
          unsubscribe2();
        };
      }, (error) => {
        handleFirestoreError(error);
        callback([]);
      });
      
      return unsubscribe;
    } catch (error) {
      handleFirestoreError(error);
      callback([]);
      return () => {};
    }
  } else {
    console.warn('Firestore not available, returning empty message list');
    callback([]);
    return () => {};
  }
};