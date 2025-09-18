# Mobile_Sim_Management_System

# 📱 Mobile SIM Management System  

> A full-stack web application for managing employee SIM card requests, approvals, and lifecycle operations (Activation, Suspension, Porting) with **Employee, HR, and Admin dashboards**.  

---
## 📂 Project Structure  

<details>
  <summary>Click to expand</summary>

Mobile_Sim_Management_System/
│── backend/ # Node.js + Express + MongoDB
│ ├── server.js # Main backend entry file
│ ├── models/ # Database models (MongoDB schemas)
│ ├── routes/ # API routes
│ ├── controllers/ # Business logic for routes
│ ├── middlewares/ # Auth & validation middleware
│ ├── utils/ # Helper functions
│ └── .env # Environment variables (not in repo)
│
│── frontend/ # React UI
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ ├── pages/ # Employee, HR, Admin dashboards
│ │ ├── assets/ # Images, logos, icons
│ │ ├── services/ # API calls (Axios/Fetch)
│ │ └── App.js # React app root
│ ├── public/ # Static files
│ └── package.json
│
│── screenshots/ # UI screenshots for README
│ ├── login.png
│ ├── employee-dashboard.png
│ ├── hr-dashboard.png
│ ├── admin-dashboard.png
│ ├── sim-inventory.png
│ └── request-flow.png
│
├── README.md
├── package.json
└── package-lock.json


## 🚀 Features  

- 👨‍💼 **Employee Dashboard** – Request new SIMs, track request status, view activated SIMs.  
- 👩‍💼 **HR Dashboard** – Review & approve/reject requests, manage SIM inventory.  
- 🛡️ **Admin Dashboard** – Categorized request view: Pending, Approved, Rejected.  
- 🔑 **Role-Based Login/Signup** – Employee, HR, and Admin have separate panels.  
- 📊 **SIM Inventory Management** – Track all available, allocated, and suspended SIMs.  
- 📡 **Request Lifecycle** – Start with HOD approval, then HR/Admin final action.  

---

## 🏗️ Tech Stack  

| Layer       | Technologies Used |
|-------------|-------------------|
| Frontend    | React.js, Tailwind CSS, shadcn/ui |
| Backend     | Node.js, Express.js |
| Database    | MongoDB (Compass) |
| Cloud       | Cloudinary (for file uploads) |
| Other Tools | JWT Auth, Twilio/Nexmo (dummy logs), REST APIs |

---

## ⚙️ Installation  

```bash
# Clone the repo
git clone https://github.com/23it101PopatHemangi/Mobile_Sim_Management_System.git

# Go to backend
cd backend
npm install

# Start backend
node server.js

# Go to frontend
cd ../frontend
npm install
npm start
