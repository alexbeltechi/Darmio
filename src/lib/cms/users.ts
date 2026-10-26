/**
 * User Management - MongoDB Only
 * 
 * Stores users in MongoDB. No filesystem fallback.
 * Uses bcryptjs for password hashing.
 */

import bcrypt from "bcryptjs";
import * as MongoUsers from "../db/users";

export type UserRole = "owner" | "admin" | "editor";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// User without password (for client-side)
export type SafeUser = Omit<User, "passwordHash">;

/**
 * Check if MongoDB is configured
 */
function ensureMongoDBConfigured(): void {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is required. Please add it to your .env.local file.\n" +
      "Get your connection string from MongoDB Atlas: https://cloud.mongodb.com"
    );
  }
}

/**
 * Check if any users exist (for first-time setup)
 */
export async function hasUsers(): Promise<boolean> {
  ensureMongoDBConfigured();
  return await MongoUsers.hasUsers();
}

/**
 * Get all users (without passwords)
 */
export async function listUsers(): Promise<SafeUser[]> {
  ensureMongoDBConfigured();
  return await MongoUsers.listUsers();
}

/**
 * Get user by ID (without password)
 */
export async function getUserById(id: string): Promise<SafeUser | null> {
  ensureMongoDBConfigured();
  return await MongoUsers.getUserById(id);
}

/**
 * Get user by email (with password hash for auth)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  ensureMongoDBConfigured();
  return await MongoUsers.getUserByEmail(email);
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}): Promise<{ user?: SafeUser; error?: string }> {
  ensureMongoDBConfigured();
  
  const existing = await MongoUsers.getUserByEmail(input.email);
  if (existing) {
    return { error: "Email already in use" };
  }
  
  const passwordHash = await bcrypt.hash(input.password, 10);
  
  const user: User = {
    id: `user_${crypto.randomUUID()}`,
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  
  await MongoUsers.createUser(user);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser };
}

export async function updateUser(
  id: string,
  updates: {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  }
): Promise<{ user?: SafeUser; error?: string }> {
  ensureMongoDBConfigured();
  
  const updateDoc: Partial<User> = {
    updatedAt: new Date().toISOString(),
  };
  
  if (updates.name) updateDoc.name = updates.name;
  if (updates.email) updateDoc.email = updates.email.toLowerCase();
  if (updates.role) updateDoc.role = updates.role;
  if (updates.password) {
    updateDoc.passwordHash = await bcrypt.hash(updates.password, 10);
  }
  
  if (updates.email) {
    const existing = await MongoUsers.getUserByEmail(updates.email);
    if (existing && existing.id !== id) {
      return { error: "Email already in use" };
    }
  }
  
  const updatedUser = await MongoUsers.updateUser(id, updateDoc);
  const { passwordHash, ...safeUser } = updatedUser;
  return { user: safeUser };
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  ensureMongoDBConfigured();
  
  const users = await MongoUsers.listUsers();
  const user = users.find((u) => u.id === id);
  
  if (user && user.role === "owner") {
    const ownerCount = users.filter((u) => u.role === "owner").length;
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot delete the last owner" };
    }
  }
  
  await MongoUsers.deleteUser(id);
  return { success: true };
}

export async function updateLastLogin(id: string): Promise<void> {
  ensureMongoDBConfigured();
  await MongoUsers.updateLastLogin(id);
}
