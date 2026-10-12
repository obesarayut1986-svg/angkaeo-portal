import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, saveUser, logPdpaAction, subscribeStorage } from '../db/storage';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: {
    username?: string;
    password?: string;
    avatarUrl?: string;
    phone?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  canAccess: (permissionKey: keyof User['permissions']) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_SESSION_KEY = 'angkaeo_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const refreshUser = () => {
    const savedUserId = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (savedUserId) {
      const users = getUsers();
      const found = users.find((u) => u.id === savedUserId && u.isActive);
      if (found) {
        setCurrentUser(found);
      } else {
        localStorage.removeItem(CURRENT_USER_SESSION_KEY);
        setCurrentUser(null);
      }
    } else {
      // Default to logged out for genuine security, but user can click Login
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    refreshUser();
    const unsubscribe = subscribeStorage(() => {
      refreshUser();
    });
    return unsubscribe;
  }, []);

  const login = async (username: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    const users = getUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    if (!user) {
      return { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
    }

    if (!user.isActive) {
      return { success: false, message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบหลัก' };
    }

    localStorage.setItem(CURRENT_USER_SESSION_KEY, user.id);
    setCurrentUser(user);

    // PDPA audit log on login
    logPdpaAction(
      user.fullName,
      user.role,
      'view',
      'auth_session',
      user.id,
      `เข้าสู่ระบบ Intranet อบต.อ่างแก้ว สำเร็จ (ตำแหน่ง: ${user.position})`
    );

    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      logPdpaAction(
        currentUser.fullName,
        currentUser.role,
        'view',
        'auth_session',
        currentUser.id,
        'ออกจากระบบ Intranet อบต.อ่างแก้ว'
      );
    }
    localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    setCurrentUser(null);
  };

  const updateProfile = async (data: {
    username?: string;
    password?: string;
    avatarUrl?: string;
    phone?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };

    const users = getUsers();
    // check if username taken by another user
    if (data.username && data.username.toLowerCase() !== currentUser.username.toLowerCase()) {
      const exists = users.some(
        (u) => u.id !== currentUser.id && u.username.toLowerCase() === data.username!.toLowerCase().trim()
      );
      if (exists) {
        return { success: false, message: 'ชื่อผู้ใช้นี้มีผู้อื่นใช้งานแล้ว โปรดเลือกชื่อผู้ใช้อื่น' };
      }
    }

    const updatedUser: User = {
      ...currentUser,
      username: data.username ? data.username.trim() : currentUser.username,
      password: data.password ? data.password.trim() : currentUser.password,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : currentUser.avatarUrl,
      phone: data.phone !== undefined ? data.phone.trim() : currentUser.phone,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    saveUser(updatedUser);
    setCurrentUser(updatedUser);

    logPdpaAction(
      currentUser.fullName,
      currentUser.role,
      'update',
      'user_profile',
      currentUser.id,
      'แก้ไขข้อมูลส่วนตัว (Username/Password/Avatar/Phone)'
    );

    return { success: true };
  };

  const canAccess = (permissionKey: keyof User['permissions']): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    return !!currentUser.permissions[permissionKey];
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        updateProfile,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
