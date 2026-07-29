# eFootball Nepal

Build a Complete eFootball Nepal Website (Phase 1 – Foundation)



I want you to build a completely new, production-ready website called eFootball Nepal. This platform is dedicated only to organizing and managing eFootball tournaments in Nepal. The website should feel modern, premium, fast, and professional while maintaining a dark gaming theme using navy blue, black, white, and subtle blue gradients. It should be fully responsive across desktop, tablet, and mobile devices with smooth animations, glassmorphism cards, clean typography, and excellent user experience. Do not leave any placeholder pages or unfinished buttons—everything should be fully functional from the start.



The project must be built using React, TypeScript, Tailwind CSS, Supabase, GitHub, and Vercel. The code should follow good project structure, be easy to maintain, and be ready for production deployment. Configure the project so that every feature works identically both in the development preview and after deployment on Vercel. Remove every trace of Lovable branding from the project, including the favicon, metadata, browser title, manifest, Open Graph images, and any remaining Lovable assets. Replace them with the official eFootball Nepal branding.



Create a complete authentication system using Supabase Authentication, but do not use email verification links or magic links. Instead, implement a secure six-digit Email OTP authentication system for both signup and login. When a user enters their email address, send a six-digit OTP and automatically redirect them to a dedicated OTP verification page inside the website. This page should contain six OTP input boxes with automatic focus, paste support, countdown timer, resend OTP button after sixty seconds, loading animations, success and error messages, retry limits, and proper validation. After successful OTP verification, automatically create the user's profile if it is their first login, sign them in, and redirect them to the production Vercel website instead of any Lovable preview URL. Never use or display lovable.app redirect links anywhere in the authentication flow.



The authentication emails should look professional and use the sender name eFootball Nepal. The email should contain only the six-digit OTP inside a clean HTML template without confusing links. Configure the project so it can later support custom SMTP providers such as Resend, SendGrid, or Postmark for better email delivery. The system should also include Forgot Password, Reset Password, Remember Me, Logout, Protected Routes, session management, and secure authentication throughout the application.



Connect the entire application to Supabase. Create proper database tables for users, profiles, roles, tournaments, website settings, announcements, hall of fame, tournament history, gallery, sponsors, owner information, moderator information, community links, and every other section required by the website. Everything displayed on the website should come from Supabase instead of hardcoded values so administrators can edit content without changing code.



Build a complete Admin Dashboard with proper role management. The account aashish46ak@gmail.com must automatically receive the Owner role and always have unrestricted access to every administrative feature. No other role should have higher permissions than the Owner. The Owner should be able to edit the homepage, website logo, owner information, moderator information, announcements, community links, sponsors, gallery, hall of fame, tournament history, website settings, and every other editable section directly from the dashboard. Every save button must perform real database updates using Supabase instead of acting as placeholders.



Do not ask administrators to paste image URLs manually. Every image field should instead provide a professional Upload Image button that opens a file picker. Administrators should be able to upload PNG, JPG, JPEG, or WEBP images directly to a public Supabase Storage bucket. After upload, the public URL should be saved automatically and the uploaded image should immediately appear as a preview without refreshing the page. Administrators should also be able to replace or remove uploaded images. This functionality must work for the website logo, owner photo, moderator photo, tournament banners, gallery images, sponsor logos, and every other image used throughout the website. Public images must always be visible even before a visitor logs in, and broken image icons should never appear.Do not require administrators to paste image URLs. Every image field, including the website logo, owner photo, moderator photo, tournament banners, sponsor logos, gallery images, and other website assets, must provide an "Upload Image" button that opens the device gallery or file picker. After selecting an image, upload it directly to a public Supabase Storage bucket, automatically save the generated public URL to the database, and instantly display the uploaded image throughout the website without requiring a page refresh. Administrators should also be able to replace or remove uploaded images at any time



The homepage should immediately look alive after deployment instead of appearing empty. Include one sample tournament that administrators can later edit or delete. Display the tournament banner, tournament name, tournament status, registration status, prize pool, short description, and participant count in an attractive tournament card. Add sections for the latest announcement, ownership, hall of fame preview, tournament history preview, community links, sponsors, and gallery preview. All of these sections should load their data dynamically from Supabase so they can be updated from the Admin Dashboard.



Create a Members section that displays the real number of registered users instead of a fixed value such as "200+ Members." The counter should automatically increase whenever someone registers and decrease if an account is deleted. Under the counter, display the five most recently registered members, including their profile picture, username, favourite club, and join date. Add a View More button that loads additional members dynamically without leaving the page.



When a visitor opens the website without logging in, display a modern popup in the center of the screen encouraging them to Sign Up or Log In. Blur or darken the background while the popup is visible, but still allow users to continue browsing by selecting Continue as Guest or closing the popup. Once a user successfully signs in, this popup should not appear again during that session.



Finally, ensure the project is fully production-ready before considering it complete. Every page, button, route, API call, upload feature, authentication flow, database operation, and dashboard function should work correctly without placeholder functionality. The completed website should be cleanly connected to Supabase, stored in GitHub, and deployed on Vercel with proper environment variables so it is ready for future expansion in Phase 2, where advanced tournament management, player registration, fixtures, standings, knockout brackets, score reporting, and complete Easy Tournament–style functionality will be added.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/33ad3986-5db5-49fd-839c-c5c2b1f572d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
