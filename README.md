# TossIt - Inventory & Expiry Management PWA

TossIt is a business-grade Inventory & Expiry Management Progressive Web App (PWA) designed for bar/kitchen environments. It helps track items opened during shifts, calculates expiry dates, and sends notifications for expired items.

## Features

- **Shift Management**: Users can start/end shifts
- **Inventory Tracking**: Open items with product name, amount, area (bar/kitchen)
- **Expiry Calculation**: Automatic expiry date calculation based on product configurations
- **Notifications**: Alerts for expired items
- **Role-Based Access**: Admin and user roles with appropriate permissions
- **PWA Support**: Installable on mobile & desktop devices

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Firebase (Firestore + Auth)
- **PWA**: manifest.json, service-worker.ts, Notifications API
- **Hosting**: Firebase Hosting (optional)
- **Structure**: Multi-tenant (each business has its own businessId)

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/tossit.git
   cd tossit
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the project root with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Start the development server:
   ```
   npm run dev
   ```

### Firebase Setup

1. Create a new Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password and Google providers
3. Create a Firestore database and set up the security rules
4. Add your web app to the Firebase project to get the configuration values

## Project Structure

```
src/
├── api/           # Firebase API functions
├── components/    # UI components
├── context/       # Context providers (Auth, Shift)
├── pages/         # Main app screens
└── utils/         # Helper functions
```

## Deployment

### Production Build

```
npm run build
```

### Deploy to Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase: `firebase init`
4. Deploy: `firebase deploy`

## PWA Features

- Installable on desktop and mobile devices
- Works offline
- Push notifications for expired items

## License

[MIT License](LICENSE)

## Acknowledgements

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Firebase](https://firebase.google.com/)
- [TypeScript](https://www.typescriptlang.org/)
