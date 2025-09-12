import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const EXCEL_FILE = path.join(DATA_DIR, 'shop_data.xlsx');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Sample data for seeding
const sampleProducts = [
  {
    id: 'prod-001',
    name: 'iPhone 14 Pro',
    description: 'Latest Apple iPhone with advanced camera system',
    price: 89999,
    cost_price: 75000,
    category: 'Electronics',
    stock: 15,
    min_stock: 5,
    supplier: 'Apple India',
    sku: 'APPLE-IP14PRO-128',
    created_date: new Date('2024-01-01'),
    last_updated: new Date('2024-01-15')
  },
  {
    id: 'prod-002',
    name: 'Samsung Galaxy Watch 5',
    description: 'Advanced smartwatch with health monitoring',
    price: 25999,
    cost_price: 20000,
    category: 'Electronics',
    stock: 8,
    min_stock: 3,
    supplier: 'Samsung Electronics',
    sku: 'SAMSUNG-GW5-44MM',
    created_date: new Date('2024-01-02'),
    last_updated: new Date('2024-01-10')
  },
  {
    id: 'prod-003',
    name: 'MacBook Air M2',
    description: 'Lightweight laptop with M2 chip',
    price: 119999,
    cost_price: 95000,
    category: 'Computers',
    stock: 5,
    min_stock: 2,
    supplier: 'Apple India',
    sku: 'APPLE-MBA-M2-256',
    created_date: new Date('2024-01-03'),
    last_updated: new Date('2024-01-12')
  },
  {
    id: 'prod-004',
    name: 'AirPods Pro',
    description: 'Wireless earbuds with active noise cancellation',
    price: 24900,
    cost_price: 18000,
    category: 'Audio',
    stock: 20,
    min_stock: 5,
    supplier: 'Apple India',
    sku: 'APPLE-APP-2ND-GEN',
    created_date: new Date('2024-01-04'),
    last_updated: new Date('2024-01-08')
  },
  {
    id: 'prod-005',
    name: 'Dell XPS 13',
    description: 'Premium ultrabook for professionals',
    price: 95999,
    cost_price: 80000,
    category: 'Computers',
    stock: 3,
    min_stock: 2,
    supplier: 'Dell Technologies',
    sku: 'DELL-XPS13-I7-512',
    created_date: new Date('2024-01-05'),
    last_updated: new Date('2024-01-14')
  }
];

const sampleSales = [
  {
    id: 'sale-001',
    product_id: 'prod-001',
    product_name: 'iPhone 14 Pro',
    quantity: 2,
    unit_price: 89999,
    total_amount: 179998,
    profit: 29998,
    customer_name: 'John Doe',
    payment_method: 'Card',
    sale_date: new Date('2024-01-15'),
    cashier: 'Admin',
    notes: 'Customer satisfied with purchase'
  },
  {
    id: 'sale-002',
    product_id: 'prod-002',
    product_name: 'Samsung Galaxy Watch 5',
    quantity: 1,
    unit_price: 25999,
    total_amount: 25999,
    profit: 5999,
    customer_name: 'Sarah Smith',
    payment_method: 'UPI',
    sale_date: new Date('2024-01-16'),
    cashier: 'Admin',
    notes: 'Gift purchase'
  },
  {
    id: 'sale-003',
    product_id: 'prod-003',
    product_name: 'MacBook Air M2',
    quantity: 1,
    unit_price: 119999,
    total_amount: 119999,
    profit: 24999,
    customer_name: 'Mike Johnson',
    payment_method: 'Card',
    sale_date: new Date('2024-01-17'),
    cashier: 'Admin',
    notes: 'Business purchase'
  },
  {
    id: 'sale-004',
    product_id: 'prod-004',
    product_name: 'AirPods Pro',
    quantity: 3,
    unit_price: 24900,
    total_amount: 74700,
    profit: 20700,
    customer_name: 'Emily Chen',
    payment_method: 'Cash',
    sale_date: new Date('2024-01-18'),
    cashier: 'Admin',
    notes: 'Bulk purchase for team'
  }
];

const sampleExpenses = [
  {
    id: 'exp-001',
    category: 'Rent',
    description: 'Monthly store rent',
    amount: 25000,
    payment_method: 'Bank Transfer',
    vendor: 'Property Management Co.',
    expense_date: new Date('2024-01-01'),
    receipt_number: 'RENT-2024-01',
    notes: 'January rent payment'
  },
  {
    id: 'exp-002',
    category: 'Utilities',
    description: 'Electricity bill',
    amount: 3500,
    payment_method: 'Bank Transfer',
    vendor: 'State Electricity Board',
    expense_date: new Date('2024-01-05'),
    receipt_number: 'ELEC-2024-01',
    notes: 'Monthly electricity charges'
  },
  {
    id: 'exp-003',
    category: 'Marketing',
    description: 'Social media advertising',
    amount: 5000,
    payment_method: 'Card',
    vendor: 'Facebook Ads',
    expense_date: new Date('2024-01-10'),
    receipt_number: 'FB-ADS-2024-01',
    notes: 'January marketing campaign'
  },
  {
    id: 'exp-004',
    category: 'Inventory',
    description: 'Product restocking',
    amount: 150000,
    payment_method: 'Bank Transfer',
    vendor: 'Tech Distributors Ltd.',
    expense_date: new Date('2024-01-12'),
    receipt_number: 'INV-2024-001',
    notes: 'Monthly inventory purchase'
  }
];

const sampleGoals = [
  {
    id: 'goal-001',
    period_type: 'Monthly',
    target_period: '2024-01',
    revenue_goal: 500000,
    profit_goal: 100000,
    sales_goal: 50,
    created_date: new Date('2024-01-01'),
    status: 'Active'
  },
  {
    id: 'goal-002',
    period_type: 'Quarterly',
    target_period: '2024-Q1',
    revenue_goal: 1500000,
    profit_goal: 300000,
    sales_goal: 150,
    created_date: new Date('2024-01-01'),
    status: 'Active'
  },
  {
    id: 'goal-003',
    period_type: 'Yearly',
    target_period: '2024',
    revenue_goal: 6000000,
    profit_goal: 1200000,
    sales_goal: 600,
    created_date: new Date('2024-01-01'),
    status: 'Active'
  }
];

function createExcelFile() {
  const workbook = XLSX.utils.book_new();
  
  // Create Products sheet
  const productsSheet = XLSX.utils.json_to_sheet(sampleProducts);
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
  
  // Create Sales sheet
  const salesSheet = XLSX.utils.json_to_sheet(sampleSales);
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales');
  
  // Create Expenses sheet
  const expensesSheet = XLSX.utils.json_to_sheet(sampleExpenses);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
  
  // Create Goals sheet
  const goalsSheet = XLSX.utils.json_to_sheet(sampleGoals);
  XLSX.utils.book_append_sheet(workbook, goalsSheet, 'Goals');
  
  // Write the file
  XLSX.writeFile(workbook, EXCEL_FILE);
  
  console.log('Excel file created successfully with sample data!');
  console.log(`File location: ${EXCEL_FILE}`);
  console.log('\nSample data includes:');
  console.log(`- ${sampleProducts.length} products`);
  console.log(`- ${sampleSales.length} sales transactions`);
  console.log(`- ${sampleExpenses.length} expense records`);
  console.log(`- ${sampleGoals.length} business goals`);
  console.log('\nDefault login credentials:');
  console.log('Username: admin');
  console.log('Password: ShopOwner@2024');
}

// Run the seeder
try {
  createExcelFile();
} catch (error) {
  console.error('Error creating Excel file:', error);
  process.exit(1);
}
