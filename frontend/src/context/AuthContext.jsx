import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(false);
  const [userStatus, setUserStatus] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous Firestore snapshot listener if any
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (currentUser) {
        setAppLoading(true);
        const userRef = doc(db, 'users', currentUser.uid);

        try {
          // Check if user doc exists, otherwise create it
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const isOwner = currentUser.email === 'supervaldens@gmail.com';
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              status: isOwner ? 'approved' : 'pending',
              role: isOwner ? 'admin' : 'user',
              createdAt: serverTimestamp()
            });
          }
        } catch (err) {
          console.error("Error checking or creating user doc:", err);
        }

        // Establish real-time listener to user status
        unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserStatus(data.status || 'pending');
            setUserRole(data.role || 'user');
          } else {
            setUserStatus(null);
            setUserRole(null);
          }
          setAppLoading(false);
        }, (err) => {
          console.error("User doc subscription failed:", err);
          setAppLoading(false);
        });

        setUser(currentUser);
      } else {
        setUser(null);
        setUserStatus(null);
        setUserRole(null);
        setAppLoading(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    // Prompt Google account chooser to ensure ease of switching accounts if desired
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  };

  const logout = () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, appLoading, userStatus, userRole, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
