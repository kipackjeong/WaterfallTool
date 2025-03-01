# General
### Datas
LAPTOP-Q87BCMTU
### When the database connection fails
- Check if tcp/ip is enabled in sql server configuration > network configuration.
- Check if SQL authentication is enabled in sql server properties.
- Try restarting the sql server and sql server browser.

### Kill Process running in Port
- Use admin terminal 
  ```
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8888).OwningProcess | Stop-Process
  ```

## Daily Tasks/Logs
### 2025-02-26

- [ ] TODO: create mappingsState store to be per instanceview scoped.
- [ ] TODO: implement populate menu button
- [ ] TODO: implement list waterfall cohorts button
- [ ] TODO: local db connection keeps failing. Need to figure out why.


- [ ] TODO: enable deleting the project view.
- [ ] TODO: need to make the project view to be cached so it lasts forever.
- [ ] TODO: MappingView > WaterfallCell: implement the logic to update the waterfall value
- [ ] TODO: implement loading

- [x] TODO: implement populating counts in the Waterfall Cohorts table list in the Main page of InstanceView.


``` js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZhx_R7zOJm1g3w7asJUNMppn9h4aZf3U",
  authDomain: "water-800cd.firebaseapp.com",
  projectId: "water-800cd",
  storageBucket: "water-800cd.firebasestorage.app",
  messagingSenderId: "177602872359",
  appId: "1:177602872359:web:941a330b5999640eed7a02",
  measurementId: "G-EMZ3FQNH3W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

```

### 2025-02-25
#### Local Sql Server Connection Failure
  - The local db connection is keep failing. Things I've tried:
    - Enabled TCP/IP
    - Restarted sql server and sql server browser
    - Tried with `encrypt: false`, but this seems to be always on.

  - Was able to login with SQL authentication in MSSM UI, but still failing in code.


