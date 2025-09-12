import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertSaleSchema, type InsertSale, type Sale, type Product } from '@shared/schema';
import { Plus, Search, ShoppingCart, Calendar, Printer, Edit } from 'lucide-react';

const paymentMethods = ['Cash', 'Card', 'UPI', 'Bank Transfer'];

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const { toast } = useToast();

  const { data: sales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['/api/sales'],
    queryFn: () => api.get('/api/sales'),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: () => api.get('/api/products'),
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: InsertSale) => api.post('/api/sales', data),
    onSuccess: (newSale) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Sale recorded successfully",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => printReceipt(newSale)}
            className="ml-2"
          >
            <Printer className="h-3 w-3 mr-1" />
            Print Receipt
          </Button>
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record sale",
        variant: "destructive",
      });
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertSale> }) => 
      api.put(`/api/sales/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
      setIsEditDialogOpen(false);
      editForm.reset();
      setEditingSale(null);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Sale updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sale",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertSale>({
    resolver: zodResolver(insertSaleSchema),
    defaultValues: {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      customer_name: '',
      payment_method: 'Cash',
      cashier: 'Admin',
      notes: '',
    },
  });

  const editForm = useForm<InsertSale>({
    resolver: zodResolver(insertSaleSchema),
    defaultValues: {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      customer_name: '',
      payment_method: 'Cash',
      cashier: 'Admin',
      notes: '',
    },
  });

  const onSubmit = (data: InsertSale) => {
    createSaleMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertSale) => {
    if (editingSale) {
      updateSaleMutation.mutate({ id: editingSale.id, data });
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    const product = products.find(p => p.id === sale.product_id);
    if (product) {
      setSelectedProduct(product);
    }
    
    editForm.reset({
      product_id: sale.product_id,
      quantity: sale.quantity,
      unit_price: parseFloat(sale.unit_price.toString()),
      customer_name: sale.customer_name || '',
      payment_method: sale.payment_method,
      cashier: sale.cashier || 'Admin',
      notes: sale.notes || '',
    });
    
    setIsEditDialogOpen(true);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      form.setValue('unit_price', parseFloat(product.price.toString()));
    }
  };

  const calculateTotal = () => {
    const quantity = form.watch('quantity');
    const unitPrice = form.watch('unit_price');
    return quantity * unitPrice;
  };

  const filteredSales = sales.filter(sale =>
    sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    sale.payment_method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${value.toLocaleString()}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const printReceipt = async (sale: Sale) => {
    try {
      // Check if running in Electron
      if ((window as any).electronAPI?.print) {
        // For Electron, create a print-friendly version in the current window
        const originalContent = document.body.innerHTML;
        const receiptHTML = generateReceiptHTML(sale);
        
        // Replace body content with receipt
        document.body.innerHTML = receiptHTML;
        
        const result = await (window as any).electronAPI.print();
        
        // Restore original content
        document.body.innerHTML = originalContent;
        
        if (result.success) {
          toast({
            title: "Print Initiated",
            description: "Receipt print dialog opened",
          });
          return;
        } else {
          throw new Error(result.error || 'Electron print failed');
        }
      }
    } catch (error) {
      console.error('Electron print failed, falling back to window print:', error);
    }
    
    // Fallback to original window.open method for browsers
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (!receiptWindow) {
      toast({
        title: "Print Failed",
        description: "Unable to open print window. Please check popup blockers.",
        variant: "destructive",
      });
      return;
    }

    const receiptHTML = generateReceiptHTML(sale);
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const generateReceiptHTML = (sale: Sale) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin: 0;
            padding: 20px;
            width: 350px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .shop-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .receipt-title {
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
          }
          .receipt-info {
            margin: 15px 0;
          }
          .receipt-info div {
            margin: 3px 0;
          }
          .item-line {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 5px;
          }
          .total-section {
            border-top: 2px solid #000;
            margin-top: 15px;
            padding-top: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 1px solid #000;
            padding-top: 10px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">SHOP ANALYTICS</div>
          <div>Your Trusted Store</div>
          <div class="receipt-title">SALES RECEIPT</div>
        </div>
        
        <div class="receipt-info">
          <div><strong>Receipt #:</strong> ${sale.id.substring(0, 8).toUpperCase()}</div>
          <div><strong>Date:</strong> ${formatDate(sale.sale_date)}</div>
          <div><strong>Cashier:</strong> ${sale.cashier || 'Admin'}</div>
          <div><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</div>
        </div>

        <div class="item-line">
          <div>
            <div><strong>${sale.product_name}</strong></div>
            <div>${sale.quantity} x ${formatCurrency(sale.unit_price)}</div>
          </div>
          <div><strong>${formatCurrency(sale.total_amount)}</strong></div>
        </div>

        <div class="total-section">
          <div class="total-line">
            <div>TOTAL AMOUNT:</div>
            <div>${formatCurrency(sale.total_amount)}</div>
          </div>
          <div class="total-line">
            <div>PAYMENT METHOD:</div>
            <div>${sale.payment_method}</div>
          </div>
        </div>

        ${sale.notes ? `
        <div style="margin-top: 15px;">
          <div><strong>Notes:</strong></div>
          <div>${sale.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
          <div>Thank you for your business!</div>
          <div>Visit us again soon</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 1000);
          }
        </script>
      </body>
      </html>
    `;
  };

  if (salesLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Sales" description="Record and manage your sales transactions" />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Sales" description="Record and manage your sales transactions" />
      
      <div className="p-6 space-y-6">
        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-sales"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => form.reset()} data-testid="button-add-sale">
                <Plus className="mr-2 h-4 w-4" />
                Record Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record New Sale</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product *</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          handleProductChange(value);
                        }}>
                          <FormControl>
                            <SelectTrigger data-testid="select-product">
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.filter(p => p.stock > 0).map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} (Stock: {product.stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedProduct && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Available Stock: <span className="font-medium">{selectedProduct.stock}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cost Price: <span className="font-medium">{formatCurrency(selectedProduct.cost_price)}</span>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              max={selectedProduct?.stock || 999}
                              placeholder="1" 
                              {...field} 
                              data-testid="input-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (₹) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                              data-testid="input-unit-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">
                      Total Amount: <span className="text-lg">{formatCurrency(calculateTotal())}</span>
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional customer name" {...field} data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Optional notes" 
                            className="resize-none" 
                            {...field} 
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createSaleMutation.isPending}
                      data-testid="button-record-sale"
                    >
                      Record Sale
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* Edit Sale Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Sale</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product *</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          const product = products.find(p => p.id === value);
                          if (product) {
                            setSelectedProduct(product);
                          }
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-product">
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} (Stock: {product.stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedProduct && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Available Stock: <span className="font-medium">{selectedProduct.stock}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cost Price: <span className="font-medium">{formatCurrency(selectedProduct.cost_price)}</span>
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              max={selectedProduct ? selectedProduct.stock + (editingSale?.quantity || 0) : undefined}
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-edit-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              step="0.01"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-edit-unit-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={editForm.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Optional customer name" 
                            {...field} 
                            data-testid="input-edit-customer-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-payment-method">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Optional notes" 
                            className="resize-none" 
                            {...field} 
                            data-testid="input-edit-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditDialogOpen(false)}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateSaleMutation.isPending}
                      data-testid="button-update-sale"
                    >
                      Update Sale
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Sales History ({filteredSales.length} transactions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-sale-${sale.id}`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">{sale.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(sale.unit_price)} per unit
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                        {sale.customer_name || 'Walk-in Customer'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                        {sale.quantity}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(sale.profit)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                        {sale.payment_method}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-3 w-3" />
                          {formatDate(sale.sale_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSale(sale)}
                            className="flex items-center gap-1"
                            data-testid={`button-edit-sale-${sale.id}`}
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printReceipt(sale)}
                            className="flex items-center gap-1"
                            data-testid={`button-print-receipt-${sale.id}`}
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        {searchTerm ? 'No sales found matching your search.' : 'No sales recorded yet. Record your first sale to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
