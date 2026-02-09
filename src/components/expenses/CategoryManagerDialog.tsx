import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from '@/components/ui/color-picker';

interface CategoryManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMode?: 'category' | 'subcategory';
    defaultCategoryId?: string;
    onSuccess?: (type: 'category' | 'subcategory', id: string) => void;
}

export function CategoryManagerDialog({
    open,
    onOpenChange,
    initialMode = 'category',
    defaultCategoryId,
    onSuccess,
}: CategoryManagerDialogProps) {
    const { data, addCategory, addSubcategory } = useFinance();
    const [activeTab, setActiveTab] = useState<'category' | 'subcategory'>(initialMode);

    // Category Form State
    const [categoryName, setCategoryName] = useState('');
    const [categoryColor, setCategoryColor] = useState('#10b981');

    // Subcategory Form State
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [subcategoryName, setSubcategoryName] = useState('');

    // Reset forms when dialog opens
    useEffect(() => {
        if (open) {
            setActiveTab(initialMode);
            setCategoryName('');
            setCategoryColor('#10b981');
            setSelectedCategoryId(defaultCategoryId || '');
            setSubcategoryName('');
        }
    }, [open, initialMode, defaultCategoryId]);

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryName) return;

        const newCategory = await addCategory({
            name: categoryName,
            color: categoryColor,
        });

        if (newCategory) {
            onSuccess?.('category', newCategory.id);
            onOpenChange(false);
        }
    };

    const handleCreateSubcategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategoryId || !subcategoryName) return;

        const newSubcategory = await addSubcategory(selectedCategoryId, subcategoryName);

        if (newSubcategory) {
            onSuccess?.('subcategory', newSubcategory.id);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gerenciar Categorias</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'category' | 'subcategory')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="category">Nova Categoria</TabsTrigger>
                        <TabsTrigger value="subcategory">Nova Subcategoria</TabsTrigger>
                    </TabsList>

                    {/* Category Creation Form */}
                    <TabsContent value="category" className="space-y-4 pt-4">
                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-cat-name">Nome da Categoria</Label>
                                <Input
                                    id="new-cat-name"
                                    placeholder="Ex: Investimentos"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Cor</Label>
                                <div className="pt-1">
                                    <ColorPicker
                                        value={categoryColor}
                                        onChange={setCategoryColor}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full">
                                <Plus className="mr-2 h-4 w-4" />
                                Criar Categoria
                            </Button>
                        </form>
                    </TabsContent>

                    {/* Subcategory Creation Form */}
                    <TabsContent value="subcategory" className="space-y-4 pt-4">
                        <form onSubmit={handleCreateSubcategory} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="parent-category">Categoria Pai</Label>
                                <Select
                                    value={selectedCategoryId}
                                    onValueChange={setSelectedCategoryId}
                                >
                                    <SelectTrigger id="parent-category">
                                        <SelectValue placeholder="Selecione a categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-3 w-3 rounded-full"
                                                        style={{ backgroundColor: category.color }}
                                                    />
                                                    {category.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-sub-name">Nome da Subcategoria</Label>
                                <Input
                                    id="new-sub-name"
                                    placeholder="Ex: Ações, FIIs"
                                    value={subcategoryName}
                                    onChange={(e) => setSubcategoryName(e.target.value)}
                                    disabled={!selectedCategoryId}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={!selectedCategoryId || !subcategoryName}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Criar Subcategoria
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
