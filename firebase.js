import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {  
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,  
  createUserWithEmailAndPassword, signOut, updatePassword  
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {  
  getFirestore, collection, addDoc, setDoc, getDoc, doc, query, where, getDocs, serverTimestamp, deleteDoc  
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCr2nwoy1oucmXdHPh-YQuogeobych-XfI",
  authDomain: "lavarapido-da25d.firebaseapp.com",
  projectId: "lavarapido-da25d",
  storageBucket: "lavarapido-da25d.firebasestorage.app",
  messagingSenderId: "861587335846",
  appId: "1:861587335846:web:d53f3855cef88d19c1e267",
  measurementId: "G-43CWTDQNQS"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const colUsuarios = collection(db, "usuarios");
export const colRelatorios = collection(db, "relatorios");
export const colRelatoriosMensais = collection(db, "relatorios_mensais");

export {  
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword,  
  collection, addDoc, setDoc, getDoc, doc, query, where, getDocs, serverTimestamp, deleteDoc  
};
