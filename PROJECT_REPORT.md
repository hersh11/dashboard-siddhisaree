# Siddhi Sarees Internal Order Management & Business Analytics Dashboard

## Project Overview

This project is a web-based analytics dashboard created for Siddhi Sarees as part of the internship project. The dashboard represents an internal order management and business analytics system for tracking bespoke ethnic wear orders from customer enquiry to final delivery.

The main purpose of the project is to convert order, customer, employee, and production workflow data into useful business insights. It helps management understand sales trends, order status, customer preferences, production progress, and team performance in one place.

## Problem Statement

During the internship, the internal workflow was observed to involve multiple manual sources for order notes, customer requirements, production updates, and team assignments. This can make it difficult to track order progress and generate quick business insights.

This dashboard solves that problem by presenting the complete order lifecycle digitally and visually.

## Technologies Used

- HTML: Used to create the page structure and dashboard sections.
- CSS: Used for responsive layout, modern styling, cards, animations, and visual design.
- JavaScript: Used for dashboard logic, filtering, calculations, data processing, and interactivity.
- Chart.js: Used to create interactive charts such as bar charts, line charts, doughnut charts, and polar area charts.
- Excel Dataset: Used as the main data source for orders, customers, employees, workflow stages, and summary metrics.
- Python: Used only for converting the Excel workbook into a browser-readable JavaScript data file.
- Node.js: Used to run a small local server for opening the dashboard in the browser.

## Libraries Used

### Chart.js

Chart.js is used for all visual charts in the dashboard. It helps create clean, animated, and interactive charts directly in the browser.

Charts included:

- Monthly revenue and order trend
- Order status distribution
- Revenue by product category
- Order channel contribution
- Stage completion funnel
- Average time spent by workflow stage
- Domestic and NRI demand distribution

## Dataset Used

The dashboard uses the Excel workbook `siddhi_sarees_dataset.xlsx`.

The workbook contains these sheets:

- Orders: Main order details such as product, price, customer, status, stage, channel, and priority.
- OrderStages: Workflow tracking from order creation to delivery.
- Customers: Customer location, type, acquisition source, and total spend.
- Employees: Staff details including role, department, and location.
- Summary: High-level business metrics.
- README: Dataset explanation and schema notes.

All these sheets are used in the dashboard.

## Website Structure

The dashboard is built as a simple static website.

Main files:

- `index.html`: Contains the dashboard layout and page sections.
- `styles.css`: Contains all styling, responsive design, animations, and visual appearance.
- `app.js`: Contains dashboard logic, filtering, calculations, chart creation, and table rendering.
- `dashboard-data.js`: Contains exported Excel data in JavaScript format.
- `chart.umd.min.js`: Local Chart.js library file.
- `hero-textile.jpg`: Local image used in the dashboard hero section.
- `server.js`: Small Node.js server used to run the dashboard locally.

## Dashboard Features

### KPI Cards

The dashboard shows important business metrics:

- Total orders
- Delivered revenue
- Average order value
- Repeat customer percentage
- Workflow completion visibility

### Filters

The dashboard includes interactive filters:

- Date range
- Order status
- Product category
- Order channel
- Priority

When a filter is changed, all KPIs, charts, and tables update automatically.

### Order Analytics

The order analytics section shows:

- Monthly order and revenue trend
- Current order status
- Revenue by product category
- Order source/channel performance

### Workflow Analytics

The workflow section uses the `OrderStages` sheet to show:

- Stage-wise completion funnel
- Average time spent in each stage
- Production and delivery lifecycle visibility

### Customer Analytics

The customer section shows:

- Domestic and international customer demand
- Top colors
- Top fabrics
- Top work types

This helps understand customer preferences and product demand.

### Team Performance

The team section connects employees with assigned order stages and shows:

- Employee name
- Role
- Department
- Number of assignments
- Completed tasks
- Sales/order value handled where applicable

### Recent Order Register

The dashboard includes a searchable order table showing recent orders with:

- Order ID
- Customer name
- Product details
- Channel
- Status
- Current stage
- Order value

## How The Dashboard Works

1. The Excel file is converted into `dashboard-data.js`.
2. The browser loads `index.html`.
3. `dashboard-data.js` provides all workbook data to JavaScript.
4. `app.js` reads the data and calculates KPIs.
5. Chart.js renders all visual charts.
6. Filters update the selected dataset.
7. Charts, KPI cards, and tables re-render based on the selected filters.

## How To Run

Open PowerShell in the dashboard folder and run:

```powershell
node server.js
```

Then open:

```text
http://127.0.0.1:8766/index.html
```

## Internship Relevance

This project connects with the internship work at Siddhi Sarees by extending frontend development learning into a practical business system. It demonstrates how web technologies can be used to improve internal operations, reduce manual tracking, and support data-driven decision-making.

The dashboard supports the internship story by showing a practical solution for internal order tracking and analytics in an ethnic wear business.
