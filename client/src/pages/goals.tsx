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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertGoalSchema, type InsertGoal, type Goal, type KPIData } from '@shared/schema';
import { Plus, Target, TrendingUp, Calendar, Award } from 'lucide-react';

const periodTypes = ['Monthly', 'Quarterly', 'Yearly'];

export default function GoalsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    queryFn: () => api.get('/api/goals'),
  });

  const { data: kpis } = useQuery<KPIData>({
    queryKey: ['/api/dashboard/kpis'],
    queryFn: () => api.get('/api/dashboard/kpis'),
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: InsertGoal) => api.post('/api/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/kpis'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Goal created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertGoal>({
    resolver: zodResolver(insertGoalSchema),
    defaultValues: {
      period_type: 'Monthly',
      target_period: '',
      revenue_goal: 0,
      profit_goal: 0,
      sales_goal: 0,
      status: 'Active',
    },
  });

  const onSubmit = (data: InsertGoal) => {
    createGoalMutation.mutate(data);
  };

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${value.toLocaleString()}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const calculateProgress = (goal: Goal) => {
    if (!kpis) return 0;
    
    const revenueProgress = goal.revenue_goal ? (kpis.revenue / parseFloat(goal.revenue_goal.toString())) * 100 : 0;
    const profitProgress = goal.profit_goal ? (kpis.profit / parseFloat(goal.profit_goal.toString())) * 100 : 0;
    const salesProgress = goal.sales_goal ? (kpis.salesCount / goal.sales_goal) * 100 : 0;
    
    return Math.min((revenueProgress + profitProgress + salesProgress) / 3, 100);
  };

  const getCurrentPeriod = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  if (goalsLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Goals" description="Set and track your business objectives" />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(g => g.status === 'Active');
  const currentMonthGoal = activeGoals.find(g => 
    g.period_type === 'Monthly' && g.target_period === getCurrentPeriod()
  );

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Goals" description="Set and track your business objectives" />
      
      <div className="p-6 space-y-6">
        {/* Current Goal Progress */}
        {currentMonthGoal && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Current Month Goal Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Goal</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-semibold">{formatCurrency(currentMonthGoal.revenue_goal)}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(kpis?.revenue || 0)} achieved
                    </span>
                  </div>
                  <Progress 
                    value={kpis ? (kpis.revenue / parseFloat(currentMonthGoal.revenue_goal.toString())) * 100 : 0}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Profit Goal</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-semibold">{formatCurrency(currentMonthGoal.profit_goal)}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(kpis?.profit || 0)} achieved
                    </span>
                  </div>
                  <Progress 
                    value={kpis ? (kpis.profit / parseFloat(currentMonthGoal.profit_goal.toString())) * 100 : 0}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Sales Goal</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-semibold">{currentMonthGoal.sales_goal}</span>
                    <span className="text-sm text-muted-foreground">
                      {kpis?.salesCount || 0} achieved
                    </span>
                  </div>
                  <Progress 
                    value={kpis ? (kpis.salesCount / currentMonthGoal.sales_goal) * 100 : 0}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Overall Progress</span>
                  <span className="text-2xl font-bold text-primary">
                    {calculateProgress(currentMonthGoal).toFixed(1)}%
                  </span>
                </div>
                <Progress value={calculateProgress(currentMonthGoal)} className="mt-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Goal Button */}
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                form.reset({
                  period_type: 'Monthly',
                  target_period: getCurrentPeriod(),
                  revenue_goal: 0,
                  profit_goal: 0,
                  sales_goal: 0,
                  status: 'Active',
                });
              }} data-testid="button-add-goal">
                <Plus className="mr-2 h-4 w-4" />
                Set New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="period_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-period-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {periodTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
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
                    name="target_period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Period *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 2024-01 for January 2024" 
                            {...field} 
                            data-testid="input-target-period"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="revenue_goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Revenue Goal (₹) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="100000.00" 
                            {...field} 
                            data-testid="input-revenue-goal"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profit_goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profit Goal (₹) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="20000.00" 
                            {...field} 
                            data-testid="input-profit-goal"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sales_goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Count Goal *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            {...field} 
                            data-testid="input-sales-goal"
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
                      disabled={createGoalMutation.isPending}
                      data-testid="button-create-goal"
                    >
                      Create Goal
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Goals List */}
        <div className="grid gap-6">
          {goals.map((goal) => {
            const progress = calculateProgress(goal);
            const isOnTrack = progress >= 70;
            
            return (
              <Card key={goal.id} data-testid={`goal-card-${goal.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {goal.period_type} Goal - {formatDate(goal.target_period + '-01')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(goal.status)}>
                        {goal.status}
                      </Badge>
                      {goal.status === 'Active' && (
                        <Badge className={isOnTrack ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}>
                          {isOnTrack ? 'On Track' : 'Behind'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Revenue Target</p>
                      <p className="text-xl font-bold">{formatCurrency(goal.revenue_goal)}</p>
                    </div>
                    
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Profit Target</p>
                      <p className="text-xl font-bold">{formatCurrency(goal.profit_goal)}</p>
                    </div>
                    
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Calendar className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sales Target</p>
                      <p className="text-xl font-bold">{goal.sales_goal}</p>
                    </div>
                  </div>
                  
                  {goal.status === 'Active' && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm text-muted-foreground">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {goals.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Goals Set</h3>
                <p className="text-muted-foreground mb-4">
                  Set your first business goal to start tracking your progress and achievements.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Goal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
