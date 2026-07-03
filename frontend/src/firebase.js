import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD3_GxQ5jfv3nAKGY_GSf9eYLflNW98SR8",
  authDomain: "functionalagro.firebaseapp.com",
  projectId: "functionalagro",
  storageBucket: "functionalagro.firebasestorage.app",
  messagingSenderId: "262061349940",
  appId: "1:262061349940:web:2ed2e9eca6def80cf67e61",
  measurementId: "G-02DPT62F18"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { app, analytics, auth, provider };
