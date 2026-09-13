import { initializeApp } from "firebase/app";
import { isSupported, getAnalytics } from "firebase/analytics";
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

// Analytics is optional — safely initialize only when supported
// (avoids crashes in unsupported environments like SSR or restricted browsers)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {});

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Force Google to always show the account picker
provider.setCustomParameters({ prompt: "select_account" });

export { app, analytics, auth, provider };

