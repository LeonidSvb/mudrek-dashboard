# 📊 Sales Dashboard Pro - Multilingual

A professional sales analytics dashboard with multilingual support and advanced metrics visualization.

## ✨ Features

### 🌐 Multilingual Support
- **English** (default)
- **Arabic** with RTL support
- **Hebrew** with RTL support

### 💱 Currency Support
- **ILS** (Israeli Shekel) ₪
- **USD** (US Dollar) $ with automatic conversion

### 📈 Analytics & Metrics
- **Sales Performance**: Total deals, revenue, average deal size
- **Conversion Metrics**: Conversion rates, closed deals analysis
- **Activity Tracking**: Sales activities per deal, contact rates
- **Time Analysis**: Days to close, sales trends over time
- **Installment Metrics**: Payment plans and installment analysis
- **Traffic Sources**: Lead source analysis with conversion rates
- **Payment Methods**: Payment method distribution

### 📊 Interactive Visualizations
- **Sales Trend Chart**: 30-day sales performance
- **Enhanced Sales Funnel**: Conversion rates between stages
- **Top Performers**: Manager performance analysis
- **Deal Distribution**: Deal size categorization
- **Traffic Sources Analysis**: Revenue and conversion by source
- **Payment Methods Chart**: Payment preference analysis

### 🔍 Advanced Filtering
- Date range filtering
- Manager/owner filtering
- Deal stage filtering
- Traffic source filtering

### 📋 Data Tables
- Recent deals with complete details
- Sticky headers for better navigation
- Compact design with responsive layout

## 🚀 Getting Started

1. **Open the Dashboard**
   ```
   Open dashboard-multilang.html in your web browser
   ```

2. **Load Data**
   - The dashboard will auto-load HubSpot CSV data if available
   - Or manually upload your CSV file using the file input

3. **Switch Languages**
   - Click EN/AR/HE buttons in the header
   - Interface adapts to RTL for Arabic and Hebrew

4. **Toggle Currency**
   - Switch between ILS and USD
   - Automatic conversion at 1 USD = 3.7 ILS

## 📁 File Structure

```
├── dashboard-multilang.html    # Main dashboard file
├── dashboard.html             # Basic dashboard (legacy)
├── README.md                  # This file
└── export/                    # CSV data files (gitignored)
```

## 🎯 Data Format

The dashboard supports HubSpot CSV exports with the following key fields:
- `Deal Name`
- `Deal owner`
- `Amount`
- `Deal Stage`
- `Create Date`
- `Number of Sales Activities`
- `Days to close`
- `Original Traffic Source`
- `Number of installments' months`
- `1st payment`
- `Number of times contacted`

## 🛠 Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript
- **Charts**: Chart.js library
- **CSV Parsing**: PapaParse library
- **Responsive Design**: CSS Grid and Flexbox
- **RTL Support**: CSS direction and text alignment
- **Real-time Filtering**: Client-side data processing

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🔧 Customization

The dashboard can be customized by modifying:
- **Colors**: Update CSS gradient variables
- **Exchange Rate**: Modify `exchangeRate` constant
- **Languages**: Add translations to the `translations` object
- **Metrics**: Add new calculations in the update functions

## 📊 Metrics Explained

- **Conversion Rate**: Closed Won deals / Total deals
- **Average Activities**: Total activities / Total deals
- **Contact Rate**: Contacted deals / Total deals
- **First Payment Rate**: Deals with first payment / Total deals
- **Average Days to Close**: For successfully closed deals only

## 🎨 Design Principles

- **Clean & Professional**: Minimalist design with focus on data
- **Multilingual First**: Built with RTL and LTR support from the start
- **Mobile Responsive**: Works on all screen sizes
- **Performance Optimized**: Efficient data processing and rendering

---

🚀 **Generated with [Claude Code](https://claude.ai/code)**

Co-Authored-By: Claude <noreply@anthropic.com>