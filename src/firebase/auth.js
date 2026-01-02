import { auth, provider } from "./config";
import { signInWithPopup, signOut } from "firebase/auth";

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const logout = async () => {
  await signOut(auth);
};
