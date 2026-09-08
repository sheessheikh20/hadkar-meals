# 🍱 HADKAR MEALS
### Hostel Tiffin Management, Ordering & Billing Platform
> **Fresh Meals. Every Day. • Ghar Ka Khana, Hostel Tak.**

Hadkar Meals is a full-stack hostel tiffin management, daily ordering, cutoff enforcement, and automated monthly billing platform built to replace manual WhatsApp-based ordering and error-prone spreadsheet calculations.

---

## 🚀 Key Features

1. **Passwordless Phone + OTP Authentication**:
   - 6-digit OTP verification with 5-minute expiry, attempt limiter, and resend cooldown.
   - Configurable development mock OTP provider (`123456`) with 1-click test fill buttons.
   - Role-Based Access Control (`ROLE_ADMIN`, `ROLE_STUDENT`) with stateless JWT tokens.

2. **Daily Meal & Menu Engine**:
   - Lunch and Dinner menus with independent opening times, closing cutoff times, and pricing.
   - Configurable Half Tiffin (e.g. ₹50) and Full Tiffin (e.g. ₹80) options.
   - Price snapshot saved on every order (`priceAtOrder`) ensuring historical financial immutability.
   - Duplicate order prevention per student/meal/date.
   - Student self-cancellation strictly allowed before cutoff time with automatic ledger reversal.

3. **Service Status, Holidays & Emergency Closure**:
   - Live banner state: `🟢 OPEN`, `🟡 CLOSING SOON`, `🔴 CLOSED`, `🏖️ HOLIDAY`.
   - Scheduled advance holidays (e.g. Sundays or festival closures).
   - **🚨 Close Service Now**: Displays how many existing confirmed orders will be affected, marks them `CANCELLED_BY_ADMIN`, reverses financial charges, notifies students, and logs audit events.

4. **Immutable Financial Ledger System**:
   - Balance is derived dynamically from transactions using Java `BigDecimal` (never floating-point).
   - Transaction types: `ORDER_CHARGE`, `ORDER_REVERSAL`, `EXTRA_CHARGE`, `PAYMENT`, `REFUND`, `ADJUSTMENT`, `PREVIOUS_BALANCE`, `CREDIT`.

5. **Monthly Billing Spreadsheet & 1-Click WhatsApp**:
   - Automatic bill calculation formula: `Food Charges + Extra Charges + Previous Balance - Paid = Remaining Balance`.
   - Admin monthly billing table with search, hostel filters, and status filters.
   - **Action Buttons in Every Student Row**:
     - 📞 **Direct Call (`tel:`)**
     - 💬 **WhatsApp (`wa.me`)** with pre-filled billing message template
     - 📄 **View & Print Invoice / PDF**
     - 💰 **Record Payment** (Cash, UPI, Bank Transfer)
     - ➕ **Add Extra Charges** (Extra Roti, Curd, Rice, Sweets, etc.)

6. **Daily Kitchen Order Sheet**:
   - Real-time preparation list grouped by Hostel -> Room Number -> Student -> Half vs Full.
   - One-click print-friendly view (`window.print()`) with high contrast.

7. **Notification & Reminders**:
   - Smart order closing reminders sent *only* to eligible active students who have *not* yet ordered.
   - In-app notification feed with read/unread indicators.

---

## 🛠️ Tech Stack

### Backend
- **Java 17** & **Spring Boot 3.3.4**
- **Spring Security** & **JWT (jjwt 0.12.6)**
- **Spring Data JPA** & **Hibernate**
- **H2 Database** (File-backed in PostgreSQL compatibility mode for instant local execution)
- **PostgreSQL Driver** (Configured for production with Docker Compose)
- **OpenPDF 1.3.39** (Server-side PDF invoice generation)
- **Springdoc OpenAPI 2.6.0** (Swagger UI documentation)
- **Maven 3.9.5**

### Frontend
- **React 18 / 19** with **TypeScript**
- **Vite 6**
- **Tailwind CSS 3.4**
- **React Router 6**
- **Lucide React** icons

---

## 📋 Default Port Mapping

| Service | Port | Notes |
| :--- | :--- | :--- |
| **Backend (Spring Boot)** | `8081` | (Port 8080 avoided due to machine Apache/EnterpriseDB) |
| **Frontend (Vite Dev)** | `5173` | Proxies `/api` requests to `http://localhost:8081` |
| **Swagger UI** | `http://localhost:8081/swagger-ui.html` | Interactive API documentation |
| **H2 Console** | `http://localhost:8081/h2-console` | JDBC URL: `jdbc:h2:file:./data/hadkarmeals` |

---

## 🔑 Pre-Seeded Test Credentials

| Role | Name | Phone Number | Development OTP | Context / Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Kitchen Owner / Admin | `9876543210` | `123456` | Full admin privileges |
| **Student** | Mohammad Shees | `9820000001` | `123456` | Mahadev Hostel (Room 204) • ₹695 Outstanding |
| **Student** | Smit Patel | `9820000002` | `123456` | Mahadev Hostel (Room 102) • Half lunch ordered |
| **Student** | Apeksha Sharma | `9820000003` | `123456` | Mahadev Hostel (Room 101) • Full lunch ordered |
| **Student** | Rahul Deshmukh | `9820000004` | `123456` | Mahadev Hostel (Room 103) |
| **Student** | Ananya Joshi | `9820000005` | `123456` | Shanti Niwas (Room A-1) |

*Note: In development mode, the 1-click demo login buttons on the login screen automatically populate and verify these accounts.*

---

## 🏃 Running Locally

### 1. Start the Backend
From the project root:
```bash
cmd.exe /c "mvn spring-boot:run -f backend/pom.xml"
```
Or build the jar and run:
```bash
cmd.exe /c "mvn clean package -DskipTests -f backend/pom.xml"
java -jar backend/target/hadkar-backend-1.0.0.jar
```

### 2. Start the Frontend
From the project root:
```bash
cd frontend
cmd.exe /c "npm run dev"
```
Open your browser at:
👉 **`http://localhost:5173`**

---

## 🧪 Testing

### Backend Unit & Integration Tests
Run all automated tests via Maven:
```bash
cmd.exe /c "mvn test -f backend/pom.xml"
```
**Results**:
- `AuthAndOtpTest`: 2 tests passed (OTP generation, rate-limiting, dev code verification).
- `OrderAndCutoffTest`: 1 test passed (Order placement, duplicate prevention, price snapshot, cancellation with ledger reversal).
- `LedgerAndBillingTest`: 2 tests passed (BigDecimal ledger calculation, extra charges, payments, bill formula).
- `HadkarMealsApplicationTests`: 1 test passed (Context loads).
- **Total: 6 tests, 0 failures, 0 errors.**

### Frontend Build & Type Check
Verify the TypeScript and Vite production bundle:
```bash
cd frontend
cmd.exe /c "npm run build"
```
**Results**:
- `✓ 1620 modules transformed.`
- `✓ built in 19s (0 errors).`

---

## 🐳 Production Deployment with Docker Compose

Run PostgreSQL and both services in containers:
```bash
docker compose up --build -d
```
