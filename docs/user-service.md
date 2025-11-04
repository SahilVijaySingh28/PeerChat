# User Service Documentation

## Overview
The User Service handles all user-related functionality in FlashChat, including authentication, friend management, online status tracking, and user search capabilities.

## Authentication Functions

### initAuth()
Initializes Firebase authentication and creates user documents in Firestore if they don't exist.

**Returns:**
- Promise resolving to the authenticated user object

### signInWithGoogle()
Authenticates the user using Google Sign-In.

**Returns:**
- Promise resolving to the authenticated user object

### signOutUser()
Signs out the current user and updates their online status.

**Returns:**
- Promise that resolves when sign out is complete

## User Management Functions

### getCurrentUser()
Retrieves the current authenticated user's data.

**Returns:**
- User object containing both Firebase Auth and Firestore data

### updateUserProfile(displayName)
Updates the current user's profile information.

**Parameters:**
- `displayName` (String): The new display name for the user

### subscribeToFriends(callback)
Subscribes to real-time updates of the current user's friends list.

**Parameters:**
- `callback` (Function): Called with an array of friend objects when updates occur

**Returns:**
- Unsubscribe function to clean up the listener

### searchFriends(searchQuery)
Searches within the current user's friends list.

**Parameters:**
- `searchQuery` (String): The name or email to search for

**Returns:**
- Promise resolving to an array of matching friend objects

### searchAllUsers(searchQuery)
Searches all users in the system (not just friends).

**Parameters:**
- `searchQuery` (String): The name or email to search for

**Returns:**
- Promise resolving to an array of matching user objects

## Friend Management Functions

### sendFriendRequest(friendEmail)
Sends a friend request to a user by their email address.

**Parameters:**
- `friendEmail` (String): The email address of the user to send a request to

**Returns:**
- Promise resolving to the recipient's user data

### subscribeToFriendRequests(callback)
Subscribes to real-time updates of incoming friend requests.

**Parameters:**
- `callback` (Function): Called with an array of friend request objects when updates occur

**Returns:**
- Unsubscribe function to clean up the listener

### acceptFriendRequest(request)
Accepts a friend request.

**Parameters:**
- `request` (Object): The friend request object to accept

**Returns:**
- Promise resolving to true if successful

### declineFriendRequest(request)
Declines a friend request.

**Parameters:**
- `request` (Object): The friend request object to decline

**Returns:**
- Promise resolving to true if successful

### unfriendUser(friendUid)
Removes a user from the current user's friends list.

**Parameters:**
- `friendUid` (String): The Firebase UID of the friend to remove

**Returns:**
- Promise resolving to true if successful

## Online Status Functions

### updateUserOnlineStatus(isOnline)
Updates the current user's online status.

**Parameters:**
- `isOnline` (Boolean): Whether the user is currently online

### trackUserActivity()
Tracks user activity to automatically update online status.

### setAppearOffline(appearOffline)
Sets whether the user should appear offline to others.

**Parameters:**
- `appearOffline` (Boolean): Whether the user should appear offline

### canSeeOnlineStatus(targetUser)
Checks if the current user can see another user's online status based on privacy settings.

**Parameters:**
- `targetUser` (Object): The user whose online status visibility is being checked

**Returns:**
- Boolean indicating whether the online status is visible

## Notification Functions

### subscribeToNotifications(callback)
Subscribes to real-time updates of user notifications.

**Parameters:**
- `callback` (Function): Called with an array of notification objects when updates occur

**Returns:**
- Unsubscribe function to clean up the listener

### markNotificationAsRead(notification)
Marks a notification as read.

**Parameters:**
- `notification` (Object): The notification to mark as read

**Returns:**
- Promise resolving to true if successful

### clearAllNotifications()
Clears all notifications for the current user.

**Returns:**
- Promise resolving to true if successful