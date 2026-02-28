// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
    apiKey: "AIzaSyBzS_qYokIBuJfq3xdJmRI9fVSM_ZlORZA",
    authDomain: "reliveapp-42004.firebaseapp.com",
    projectId: "reliveapp-42004",
    storageBucket: "reliveapp-42004.firebasestorage.app",
    messagingSenderId: "877039560413",
    appId: "1:877039560413:web:c53f8364fdea5414761d34",
    measurementId: "G-JLD3Y8NJF3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
// export const functions = getFunctions(app); // Cloud Functions disabled due to billing requirement
