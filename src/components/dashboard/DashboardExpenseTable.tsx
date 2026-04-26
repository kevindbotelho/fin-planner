import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Expense, Category } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DashboardExpenseTableProps {
  expenses: Expense[];
  categories: Category[];
  totalIncome: number;
}

export function DashboardExpenseTable({ expenses, categories, totalIncome }: DashboardExpenseTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(`${dateString}T12:00:00`), 'dd/MM/yyyy');
  };

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (searchTerm) {
      result = result.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    // Sort by date descending
    result.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    return result;
  }, [expenses, searchTerm]);

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Últimas Despesas</CardTitle>
          <div className="w-full sm:w-64">
            <Label htmlFor="search-expenses" className="sr-only">Buscar despesa</Label>
            <Input
              id="search-expenses"
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map(expense => {
                  const category = categories.find(c => c.id === expense.categoryId);
                  
                  return (
                    <TableRow key={expense.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(expense.purchaseDate)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        {expense.bankOrigin ? (
                            <Badge variant="outline" className={expense.bankOrigin === 'Nubank' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-orange-100 text-orange-700 border-orange-200'}>
                                {expense.bankOrigin}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category?.color || '#ccc' }}
                          />
                          <span className="truncate max-w-[120px] sm:max-w-[200px]" title={category?.name || 'Sem categoria'}>
                            {category?.name || 'Sem categoria'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-expense whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              )}

              {/* Summary Rows */}
              <TableRow className="border-t-2 border-border bg-muted/30 hover:bg-muted/30">
                <TableCell colSpan={4} className="font-semibold text-income">
                  Receita Total do Mês
                </TableCell>
                <TableCell className="text-right font-semibold text-income whitespace-nowrap">
                  {formatCurrency(totalIncome)}
                </TableCell>
              </TableRow>
              
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableCell colSpan={4} className="font-semibold text-expense">
                  Total de Despesas
                </TableCell>
                <TableCell className="text-right font-semibold text-expense whitespace-nowrap">
                  {formatCurrency(totalExpenses)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={4} className="font-bold">
                  Saldo Final
                </TableCell>
                <TableCell className={`text-right font-bold whitespace-nowrap ${totalIncome - totalExpenses >= 0 ? 'text-income' : 'text-expense'}`}>
                  {formatCurrency(totalIncome - totalExpenses)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
