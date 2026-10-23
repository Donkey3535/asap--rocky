# Concert Fund Tracker

A shared loan-repayment tracker. Static page (`public/index.html`) + one API route (`api/data.js`) storing data in Upstash Redis. Access is protected by two PINs.

## Deploy (about 10 minutes)
1. Create a new GitHub repo and upload everything in this folder (keep the `api` and `public` folders).
2. On vercel.com: Add New > Project > import that repo > Deploy.
3. In the Vercel project: Storage (or Marketplace) > add **Upstash Redis** and connect it to the project. This adds the database env vars automatically.
4. Project Settings > Environment Variables, add:
   - `ADMIN_PIN` – parent's PIN (can edit commitments)
   - `APP_PIN` – teen/family PIN (can log jobs and tick commitments)
   Use 6+ characters and make them different.
5. Redeploy (Deployments > ... > Redeploy). Open the site and enter a PIN.
