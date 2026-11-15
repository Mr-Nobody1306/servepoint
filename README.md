# ServePoint

### Your home, taken care of.

ServePoint is a multi-service booking platform designed to make finding and booking reliable home maintenance professionals easier. It connects customers with service providers through a simple, accessible platform where users can explore services, compare providers, make bookings and manage their service requests.

Built with the Ghanaian market in mind, ServePoint aims to simplify access to essential home maintenance services while giving service providers a platform to showcase their skills and manage their work.

---

## 1. Project Overview

Finding trustworthy professionals for home maintenance can be difficult. Customers often rely on personal recommendations, informal arrangements or time-consuming searches to find someone suitable.

ServePoint addresses this challenge by providing a central platform where customers can discover service providers, view their services and prices, and make bookings.

The platform also provides service providers with tools to manage their profiles, services and bookings, while administrators oversee platform activities and maintain service quality.

## 2. Key Features

### Customer Features
- Create an account and manage personal profiles.
- Browse available home maintenance categories.
- Search and filter service providers.
- View provider profiles, services, ratings and prices.
- Receive service recommendations through an AI-powered assistant.
- Request a booking or instantly book eligible services.
- Track booking progress and view booking history.
- Cancel eligible bookings and review completed services.

### Service Provider Features
- Register and create a professional profile.
- Manage profile information and service areas.
- Add, update and remove service listings.
- Set service prices.
- Manage availability and booking preferences.
- Receive, accept or reject booking requests.
- Update the progress of active jobs.

### Administrator Features
- View platform activity and basic statistics.
- Manage customer accounts.
- Review and approve or reject provider applications.
- Suspend and reactivate accounts where necessary.
- Manage service categories.
- Monitor bookings and platform activity.

### AI-Powered Service Discovery
ServePoint includes an AI assistant that helps customers describe their home maintenance problems in natural language.

The assistant can:
- Interpret customer descriptions.
- Ask follow-up questions when more information is needed.
- Recommend relevant service categories.
- Identify matching approved service providers.
- Direct customers to the normal booking process.

The AI assistant supports service discovery; it does not independently diagnose technical problems or create bookings.

## 3. Available Service Categories

ServePoint currently supports nine home maintenance categories:

1. Plumbing
2. Electrical
3. Carpentry
4. Painting
5. Masonry
6. Cleaning
7. Appliance Repairs
8. HVAC and Ventilation
9. Home Installation and Assembly

The platform also includes a Home Essentials product catalogue.

## 4. User Roles

| Role | Description |
|---|---|
| Customer | Discovers services, books professionals and manages bookings. |
| Service Provider | Manages professional profiles, services, availability and customer requests. |
| Administrator | Oversees users, providers, categories and platform bookings. |

Service providers must be approved by an administrator before they can publish services and receive bookings.

## 5. Technology Stack

| Technology | Purpose |
|---|---|
| React 19 | Frontend application |
| TypeScript 5.7 | Frontend development and type safety |
| Tailwind CSS v4 | User interface styling |
| Node.js | Backend runtime |
| REST API | Communication between frontend and backend |
| Groq API | AI-powered service discovery |
| JSON-based storage | Application data persistence |

## 6. System Architecture

ServePoint uses a client-server architecture.

- **Frontend:** Provides the user interface and dashboard experiences.
- **Backend:** Handles authentication, authorization, business logic, bookings and data operations.
- **AI Integration:** Processes customer problem descriptions and generates service recommendations through a backend-controlled API connection.
- **Data Storage:** Stores application information, including users, providers, services and bookings.

The frontend communicates with the backend through REST API endpoints. Sensitive API credentials are kept on the server and are not exposed to the browser.

## 7. Project Structure

```text
servepoint/
│
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       └── index.css
│
├── fixhub-secure/
│   ├── src/
│   │   ├── apiRoutes.js
│   │   ├── dataStore.js
│   │   ├── config.js
│   │   ├── persona.js
│   │   ├── chat.js
│   │   └── ai.js
│   │
│   ├── public/
│   ├── test/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## 8. Getting Started

### Prerequisites

Before running ServePoint locally, ensure you have:

- Node.js installed.
- npm installed.
- Git installed.

### Clone the Repository

```bash
git clone https://github.com/Mr-Nobody1306/servepoint.git
cd servepoint
```

### Configure the Backend

Navigate to the backend directory:

```bash
cd fixhub-secure
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
copy .env.example .env
```

Configure the required environment variables in `.env`, including your Groq API key.

Never commit your `.env` file or expose private API credentials.

### Start the Application

Follow the frontend and backend startup instructions in their respective package configurations.

The backend runs locally at:

```text
http://localhost:8000
```

Open the application in your browser at the configured local address.

## 9. Security and Access Control

ServePoint incorporates several security measures:

- Role-based access control for customers, service providers and administrators.
- Protected administrative operations.
- Provider approval requirements.
- Restrictions on suspended and unapproved accounts.
- Server-side validation of user inputs.
- Protection against unauthorized access to user and provider information.
- Backend-controlled AI API credentials.
- Automated tests covering application functionality and security.

## 10. Payments and Booking

The current MVP focuses on service discovery, booking and booking management.

Customers and service providers arrange payment offline. Online payment processing is not part of the current MVP scope.

The platform supports both booking requests and instant bookings, depending on provider preferences and availability.

## 11. Testing

The project includes automated backend tests covering areas such as:

- Authentication and authorization.
- Customer and provider profile management.
- Service directory filtering.
- Booking operations.
- Provider approval and suspension restrictions.
- Administrative operations.
- AI service discovery.
- Security and data validation.

To run the backend test suite:

```bash
cd fixhub-secure
npm test
```

## 12. Project Purpose

ServePoint was developed as a Software Engineering project to demonstrate the design and implementation of a practical service-booking platform.

The project brings together frontend development, backend API development, authentication, database operations, AI integration and role-based system management in one application.

Our goal is to make accessing home maintenance services simpler for customers while providing service professionals with a more organised way to manage their work.
