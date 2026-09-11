# WhatsApp Expense Management System

## 🌍 Real-World Project

This system was built as a **real-world expense management solution for the Audit Department of Dawat-e-Islami**.

The audit teams regularly travel to different cities to perform audit activities. During these visits, team members incur different types of expenses, including **travel, food, and other operational expenses**.

Previously, these expenses were maintained manually in Excel, which made it difficult to manage entries efficiently and generate separate person-wise expense reports.

To solve this problem, I developed this **AI-powered WhatsApp Expense Management System**.

Instead of manually maintaining Excel records, audit team members can now simply send their expense information through **WhatsApp**. The n8n automation workflow processes the message using AI, identifies the expense details, splits shared expenses between team members, records payments, and stores the data in Google Sheets.

The system also provides a **person-wise web dashboard**, allowing the team to view expenses, payments, balances, recent transactions, and category-wise spending.

This project demonstrates how **AI and workflow automation can be applied to solve a real operational problem and replace a manual spreadsheet-based process with a structured, automated system**.

## 🎯 Problem Statement

Audit teams travelling to different cities needed to maintain their daily travel-related expenses manually in Excel.

The manual process created several challenges:

- Manual data entry
- Time-consuming expense recording
- Difficulty managing shared expenses
- Difficulty tracking who paid for an expense
- Manual calculation of individual balances
- Difficulty generating person-wise reports
- Risk of duplicate or incorrect entries
- Manual deletion or correction of transactions

## 💡 Solution

The WhatsApp Expense Management System provides a simple alternative to the manual Excel-based process.

```text
Manual Excel Entry
        ↓
WhatsApp Expense Message
        ↓
AI Processing
        ↓
n8n Automation
        ↓
Expense Splitting & Transaction ID
        ↓
Google Sheets
        ↓
Person-Wise Reporting
        ↓
Web Dashboard
```

## 🚀 Features

- Record expenses through WhatsApp
- Automatically identify expense category
- Support multiple people in a single expense
- Automatically split expenses into separate rows
- Generate a unique Transaction ID for each transaction
- Record payment information
- Support balance settlement
- Delete complete transactions using Transaction ID
- Delete multiple expense rows belonging to the same transaction
- Web-based expense dashboard
- View expenses by person
- View all expenses
- Calculate total expenses
- Calculate total payments
- Calculate net balance
- View category-wise expense breakdown
- View recent transactions
- Mobile-friendly dashboard
- Google Sheets used as the data storage layer

## 🔄 System Flow Diagram

![WhatsApp Expense Management System Flow Diagram](screenshots/Flowchart.png)

## 📊 Google Sheets Structure

The system uses two main sheets.

### Expenses

The Expenses sheet stores individual expense shares.

Typical fields include:

```text
ID
Date
Category
Person
Amount
Detail
Sender Number
```

A single WhatsApp expense can generate multiple expense rows when the expense is shared between multiple people.

All rows generated from the same message use the same Transaction ID.

### Payments

The Payments sheet stores payment information.

Typical fields include:

```text
Date
Category
Paid By
Total Amount
Description
Sender Number
ID
```

## 🆔 Transaction ID

Every transaction receives a unique Transaction ID.

Example:

```text
TXN-260911-A7K2
```

The same Transaction ID is stored with all rows belonging to that transaction.

For example, if one expense is split between three people:

```text
TXN-260911-A7K2 → Person 1
TXN-260911-A7K2 → Person 2
TXN-260911-A7K2 → Person 3
```

The related payment record can also use the same Transaction ID.

This makes it possible to identify and manage the complete transaction as one unit.

## 💰 Expense Splitting

When a shared expense is received through WhatsApp, the n8n workflow processes the message and creates separate expense records for each person.

Example:

```text
Total Expense: 3000

Faheem       → 1000
Amir         → 1000
Hussain      → 1000
```

All three rows are associated with the same Transaction ID.

This structure allows the dashboard to calculate individual balances correctly.

## 💳 Payments

When an expense is recorded, the workflow can also create the related payment record.

The payment identifies:

- Who paid
- Total amount paid
- Transaction ID
- Date
- Description

The same Transaction ID connects the payment with its related expense records.

## 🤝 Settlement

The system also supports balance settlement.

Settlement messages such as:

```text
Balance cleared
Balance settled
Paid balance
Settlement
```

are interpreted as settlement transactions.

A settlement records the payment information and marks the balance as cleared without creating normal expense split rows.

## 🗑️ Delete Transactions

Transactions can be deleted using their Transaction ID.

Example:

```text
delete TXN-260911-A7K2
```

The system:

1. Extracts the Transaction ID.
2. Searches the Expenses sheet.
3. Searches the Payments sheet.
4. Finds all matching records.
5. Deletes all matching expense rows.
6. Deletes the matching payment record.
7. Sends a deletion confirmation through WhatsApp.

### Multiple Expense Rows

A single Transaction ID may belong to more than one expense row.

The workflow therefore identifies **all matching expense rows** before deletion.

Expense rows are processed from the bottom upward to prevent row-number shifting during deletion.

## 📱 Web Dashboard

The project includes a responsive web dashboard built using HTML, CSS, JavaScript, and Google Apps Script.

The dashboard provides:

### Person Filter

Users can select a specific person or view all records.

```text
All
Faheem
Amir
Hussain
...
```

### Summary

The dashboard displays:

```text
Total Expense
Total Paid
Net Balance
Records
```

### Recent Expenses

Recent expense records display information such as:

- Category
- Detail
- Transaction ID
- Date
- Person
- Amount

### Category Breakdown

Expenses are grouped by category to provide a quick overview of spending.

## ⚖️ Balance Calculation

The dashboard calculates balance using:

```text
Net Balance = Total Paid - Total Expense
```

A positive balance indicates that payments are greater than recorded expenses.

A negative balance indicates that recorded expenses are greater than payments.

## 🔄 Transaction Flow

A normal expense follows this flow:

```text
WhatsApp Message
       ↓
WhatsApp Trigger
       ↓
AI Message Processing
       ↓
Expense Classification
       ↓
Expense Splitting
       ↓
Transaction ID Generation
       ↓
Google Sheets
       ↓
WhatsApp Confirmation
```

The dashboard then reads the stored data through Google Apps Script.

## 🔧 Google Apps Script

The Apps Script backend provides functions for the dashboard, including:

```text
getPersonDataPublic()
getPersonListPublic()
deleteTransactionPublic()
```

These functions allow the dashboard to:

- Retrieve expense data
- Retrieve payment data
- Generate the person list
- Calculate totals
- Calculate balances
- Delete transactions

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| WhatsApp | User interaction |
| n8n | Workflow automation |
| AI Model | Message understanding and expense classification |
| Google Sheets | Expense and payment database |
| Google Apps Script | Backend/API for dashboard |
| HTML / CSS / JavaScript | Web dashboard |
| GitHub | Source code and project version control |

## 🎯 Current System Capabilities

The system currently provides:

- WhatsApp expense entry
- AI-based expense processing
- Expense categorization
- Multi-person expense splitting
- Payment recording
- Settlement handling
- Transaction ID generation
- Transaction-based deletion
- Multi-row expense deletion
- Google Sheets storage
- Google Apps Script backend
- Responsive expense dashboard
- Person-based filtering
- Expense summaries
- Category breakdown

## 🔮 Future Improvements

Possible future enhancements include:

- Edit transactions by Transaction ID
- Advanced reporting
- Monthly expense reports
- Charts and visual analytics
- Export reports
- Authentication for the dashboard
- User-specific access control
- Automated monthly summaries
- Improved transaction search
- Audit logs
- Backup and recovery functionality

## 🧩 Portfolio Implementation

This project was developed as a **real-world automation solution for an audit team**, transforming a manual Excel-based expense recording process into an AI-powered WhatsApp workflow.

It demonstrates practical implementation of **AI message processing, workflow automation, expense splitting, transaction management, Google Sheets data storage, Google Apps Script backend services, and person-wise web reporting**.

The project reflects how modern automation can be applied to improve an existing operational process rather than being developed only as a theoretical or demo application.

### 🔐 Portfolio-Safe Source Files

For GitHub/portfolio use, the shared workflow and Apps Script have been sanitized. Private credentials, connection identifiers, webhook identifiers, and live spreadsheet configuration are replaced with placeholders.

### 📦 Project Files

| File | Description |
|---|---|
| `n8n/WhatsApp_Expense_Tracker_Portfolio_Sanitized.json` | Sanitized n8n automation workflow |
| `google-apps-script/Code_Sanitized.gs` | Sanitized Google Apps Script backend |
| `dashboard/index.html` | Responsive web dashboard |
| `screenshots/Flowchart.png` | System architecture and workflow diagram |
| `WhatsApp_Expense_Management_System_Documentation.docx` | Detailed system documentation |

### 📄 Project Documentation

[📥 Download System Documentation](./WhatsApp_Expense_Management_System_Documentation.docx)

### ⚙️ n8n Workflow

[View / Download Sanitized Workflow](./n8n/WhatsApp_Expense_Tracker_Portfolio_Sanitized.json)

### 🔧 Google Apps Script

[View / Download Sanitized Apps Script](./google-apps-script/Code_Sanitized.gs)

The Apps Script acts as the backend for the web dashboard and provides functions for retrieving person-wise data, generating the person list, calculating balances, and deleting transactions by Transaction ID.

### 🌐 Web Dashboard

The project includes a responsive web dashboard for person-wise expense reporting, summaries, category breakdowns, recent transactions, and transaction deletion.

> **Live Dashboard:** [🚀 Open Expense Management Dashboard](https://script.google.com/macros/s/AKfycbxKxFNgiNF-rIjOFMBUwp-FWcL_PQ0HeOBbkuBloWc8CXau0tBnspP7fSBoSJtd6FtY/exec)

### 🔒 Security Note

The GitHub version is intended for portfolio demonstration. Do not publish real WhatsApp credentials, AI/API keys, Google OAuth credentials, webhook secrets, spreadsheet IDs, or private business data. Configure your own credentials and environment-specific values when deploying the workflow.

## 👨‍💻 Author

**Faheem Abbas**

AI Automation Specialist | n8n Expert | AI Agents | AI-Powered Business Automation | Lead Generation | API Integrations | Calling Agents

## 📞 Contact

For custom implementation or commercial use, please <strong>Contact Me:</strong>
<a href="https://wa.me/923002120566"><img src="https://raw.githubusercontent.com/bluemoonways/bluemoonways/main/assets/whatsapp-logo.png" width="30" alt="WhatsApp" style="position: relative; top: 2px;"></a>   <a href="https://www.linkedin.com/in/faheem-abbas-ai-automation-specialist/"><img src="https://raw.githubusercontent.com/bluemoonways/bluemoonways/main/assets/linkedin-logo.png" width="30" alt="LinkedIn" style="position: relative; top: 2px;"></a>   <a href="mailto:info.bluemoonways@gmail.com"><img src="https://raw.githubusercontent.com/bluemoonways/bluemoonways/main/assets/gmail-logo.png" width="30" alt="Email" style="position: relative; top: 2px;"></a>

**#AI #AIAutomation #n8n #RAG #GoogleGemini #Pinecone #WhatsAppAutomation #LLM #AIEngineering #Automation #bluemoonways**
