import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ActionType = 'edit' | 'delete';

interface FixedExpenseActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: ActionType;
  onCurrentOnly: () => void;
  onCurrentAndFuture: () => void;
}

export function FixedExpenseActionDialog({
  open,
  onOpenChange,
  actionType,
  onCurrentOnly,
  onCurrentAndFuture,
}: FixedExpenseActionDialogProps) {
  const isEdit = actionType === 'edit';
  
  const title = isEdit ? "Alterar despesa fixa" : "Excluir despesa fixa";
  const description = "Esta é uma despesa fixa recorrente. O que deseja fazer?";
  const currentOnlyLabel = isEdit ? "Alterar só este mês" : "Excluir só este mês";
  const futureLabel = "Este mês e todos os seguintes";

  const handleCurrentOnly = () => {
    onCurrentOnly();
    onOpenChange(false);
  };

  const handleCurrentAndFuture = () => {
    onCurrentAndFuture();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="outline"
            onClick={handleCurrentOnly}
            className="w-full"
          >
            {currentOnlyLabel}
          </Button>
          <Button
            variant={isEdit ? "default" : "destructive"}
            onClick={handleCurrentAndFuture}
            className="w-full"
          >
            {futureLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
